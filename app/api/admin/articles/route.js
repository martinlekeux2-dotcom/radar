import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl, mainMenuSections } from "../../../../src/lib/content-config";

const articleStatuses = ["draft", "published", "archived"];

function validateArticle(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const status = body.status;
  const menuSection = typeof body.menu_section === "string" ? body.menu_section.trim() : "";
  const showOnHome = body.show_on_home === undefined ? true : body.show_on_home;
  const featuredOnHome = body.featured_on_home === undefined ? false : body.featured_on_home;
  const coverImageUrl = typeof body.cover_image_url === "string" ? body.cover_image_url.trim() : "";

  if (!title || !category || !slug) {
    return { error: "Le titre, le slug et la rubrique sont obligatoires." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets." };
  }
  if (!articleStatuses.includes(status)) {
    return { error: "Le statut de l’article n’est pas valide." };
  }
  if (typeof showOnHome !== "boolean") {
    return { error: "Le choix d’affichage sur l’accueil n’est pas valide." };
  }
  if (typeof featuredOnHome !== "boolean") {
    return { error: "Le choix de l’article à la une n’est pas valide." };
  }
  if (menuSection && !mainMenuSections.some((section) => section.slug === menuSection)) {
    return { error: "La rubrique choisie dans le menu principal n’est pas valide." };
  }
  if (coverImageUrl && !isHttpUrl(coverImageUrl)) {
    return { error: "L’image de couverture doit utiliser une URL HTTP ou HTTPS valide." };
  }

  return {
    article: {
      title,
      slug,
      category,
      content,
      excerpt: excerpt || null,
      location: location || null,
      show_on_home: showOnHome || featuredOnHome,
      featured_on_home: featuredOnHome,
      menu_section: menuSection || null,
      status,
      author_name: typeof body.author_name === "string" ? body.author_name.trim() || null : null,
      cover_image_url: coverImageUrl || null,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
        : [],
      published_at: status === "published"
        ? (typeof body.published_at === "string" && body.published_at
          ? body.published_at
          : new Date().toISOString())
        : null,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db
      .from("articles")
      .select("id, title, slug, excerpt, content, category, location, author_name, cover_image_url, tags, status, published_at, created_at, updated_at, show_on_home, featured_on_home, menu_section")
      .order("updated_at", { ascending: false });

    if (error) {
      return Response.json({ error: `Impossible de charger les articles : ${error.message}` }, { status: 500 });
    }
    return Response.json({ articles: data });
  });
}

export async function POST(request) {
  return withAdmin(request, async ({ db, user }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateArticle(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const article = {
      ...validated.article,
      featured_on_home: validated.article.status === "published" ? false : validated.article.featured_on_home,
    };
    const { data, error } = await db
      .from("articles")
      .insert({ ...article, author_name: article.author_name ?? user.email })
      .select("id, title")
      .single();
    if (error) {
      return Response.json({ error: `Impossible de créer l’article : ${error.message}` }, { status: 400 });
    }
    if (validated.article.featured_on_home && validated.article.status === "published") {
      const { error: featuredError } = await db.rpc("set_home_featured_article", { target_article_id: data.id });
      if (featuredError) {
        return Response.json({ error: `L’article a été créé, mais sa mise à la une a échoué : ${featuredError.message}` }, { status: 500 });
      }
    }
    return Response.json({ article: data }, { status: 201 });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’article est obligatoire." }, { status: 400 });
    }

    const validated = validateArticle(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const article = {
      ...validated.article,
      featured_on_home: validated.article.status === "published" ? false : validated.article.featured_on_home,
    };
    const { data: existing, error: existingError } = await db
      .from("articles")
      .select("id")
      .eq("id", body.data.id)
      .maybeSingle();
    if (existingError) {
      return Response.json({ error: `Impossible de vérifier l’article : ${existingError.message}` }, { status: 500 });
    }
    if (!existing) return Response.json({ error: "Cet article n’existe plus." }, { status: 404 });

    const { data, error } = await db
      .from("articles")
      .update(article)
      .eq("id", body.data.id)
      .select("id, title")
      .maybeSingle();
    if (error) {
      return Response.json({ error: `Impossible de modifier l’article : ${error.message}` }, { status: 400 });
    }
    if (!data) return Response.json({ error: "Cet article n’existe plus." }, { status: 404 });
    if (validated.article.featured_on_home && validated.article.status === "published") {
      const { error: featuredError } = await db.rpc("set_home_featured_article", { target_article_id: data.id });
      if (featuredError) {
        return Response.json({ error: `L’article a été modifié, mais sa mise à la une a échoué : ${featuredError.message}` }, { status: 500 });
      }
    }
    return Response.json({ article: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’article est obligatoire." }, { status: 400 });
    }

    const { data, error } = await db
      .from("articles")
      .delete()
      .eq("id", body.data.id)
      .select("id")
      .maybeSingle();
    if (error) {
      return Response.json({ error: `Impossible de supprimer l’article : ${error.message}` }, { status: 400 });
    }
    if (!data) return Response.json({ error: "Cet article n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
