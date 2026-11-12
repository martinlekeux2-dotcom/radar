import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl } from "../../../../src/lib/content-config";

const reportageStatuses = ["draft", "published", "archived"];

function validateReportage(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const authorName = typeof body.author_name === "string" ? body.author_name.trim() : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const position = body.position === "" || body.position == null ? 0 : Number(body.position);
  const showOnHome = body.show_on_home === undefined ? true : body.show_on_home;

  if (!title || !slug || !category || !authorName || !content) {
    return { error: "Le titre, le slug, la catégorie, l’auteur et le texte du reportage sont obligatoires." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets." };
  }
  if (imageUrl && !isHttpUrl(imageUrl)) {
    return { error: "L’image doit utiliser une URL HTTP ou HTTPS valide." };
  }
  if (!Number.isInteger(position) || position < 0 || typeof showOnHome !== "boolean") {
    return { error: "La position ou l’affichage du reportage n’est pas valide." };
  }
  if (!reportageStatuses.includes(body.status)) {
    return { error: "Le statut du reportage n’est pas valide." };
  }

  return {
    reportage: {
      title,
      slug,
      category,
      author_name: authorName,
      image_url: imageUrl || null,
      image_description: typeof body.image_description === "string" ? body.image_description.trim() || null : null,
      content,
      position,
      show_on_home: showOnHome,
      status: body.status,
      published_at: body.status === "published"
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
      .from("reportages")
      .select("*")
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) return Response.json({ error: `Impossible de charger les reportages : ${error.message}` }, { status: 500 });
    return Response.json({ reportages: data });
  });
}

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateReportage(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db.from("reportages").insert(validated.reportage).select("*").single();
    if (error) return Response.json({ error: `Impossible de créer le reportage : ${error.message}` }, { status: 400 });
    return Response.json({ reportage: data }, { status: 201 });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant du reportage est obligatoire." }, { status: 400 });
    }

    const validated = validateReportage(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db
      .from("reportages")
      .update(validated.reportage)
      .eq("id", body.data.id)
      .select("*")
      .maybeSingle();
    if (error) return Response.json({ error: `Impossible de modifier le reportage : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Ce reportage n’existe plus." }, { status: 404 });
    return Response.json({ reportage: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant du reportage est obligatoire." }, { status: 400 });
    }

    const { data, error } = await db
      .from("reportages")
      .delete()
      .eq("id", body.data.id)
      .select("id")
      .maybeSingle();
    if (error) return Response.json({ error: `Impossible de supprimer le reportage : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Ce reportage n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
