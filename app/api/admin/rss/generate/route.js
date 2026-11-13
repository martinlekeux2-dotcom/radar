import { readJson, withAdmin } from "../../../../../src/lib/admin-api";
import { generateOpenAISummary } from "../../../../../src/lib/openai";
import { actuCategories } from "../../../../../src/lib/actu-rss-config";
import {
  actuSourceHashForArticle,
  fetchActuArticles,
  formatActuAttribution,
  slugForActuArticle,
} from "../../../../../src/lib/actu-rss";

const allowedCategories = new Set([
  "Politique",
  "Économie",
  "Sport",
  "Société",
  "Culture",
  "Faits divers",
  "Insolite",
]);

const articleSystemPrompt = `Tu es journaliste rédacteur web de RADAR, spécialisé dans l'actualité régionale et locale.
Rédige un article original et factuel uniquement à partir des métadonnées RSS fournies : titre, résumé, auteur, date et catégories. Tu ne consultes pas l'URL de l'article et tu ne disposes pas de son texte intégral.
Ne copie aucune phrase ni formulation distinctive du résumé. N'utilise aucune connaissance externe, n'invente aucun fait et n'ajoute aucune citation absente des métadonnées. Utilise une formulation et une structure originales.
Si les informations fournies ne permettent pas un article cohérent d'au moins 150 mots sans invention ni répétition, renvoie uniquement {"status":"insufficient_data"}.
Sinon, renvoie uniquement un objet JSON valide avec exactement les champs "status", "title", "slug", "category", "location", "excerpt", "content_markdown", "tags" et "sources_cited".
"status" vaut "success". "title" est informatif et ne dépasse pas 70 caractères. "slug" est en minuscules, sans accents, séparé par des tirets. "category" vaut exactement l'une de ces valeurs : "Politique", "Économie", "Sport", "Société", "Culture", "Faits divers", "Insolite".
"location" reprend uniquement un lieu explicitement présent dans le titre, le résumé ou les catégories RSS ; sinon, chaîne vide. "excerpt" est un chapeau de 150 à 220 caractères.
"content_markdown" contient le corps seulement, sans répéter le titre ni le chapeau : au moins 150 mots, en 2 à 4 paragraphes courts. Si le corps dépasse 250 mots, ajoute des intertitres Markdown pertinents avec ##. Le texte doit rester strictement fidèle aux informations fournies.
"tags" est un tableau de 3 à 8 mots-clés réellement présents dans les métadonnées. "sources_cited" contient uniquement la source fournie, avec son nom et son URL exacts.`;

function parseGeneratedArticle(text, source) {
  let article;
  try {
    article = JSON.parse(text);
  } catch {
    return null;
  }

  if (!article || typeof article !== "object" || Array.isArray(article)) return null;
  if (article.status === "insufficient_data") return { status: "insufficient_data" };
  if (article.status !== "success") return null;

  const title = typeof article.title === "string" ? article.title.trim() : "";
  const slug = typeof article.slug === "string" ? article.slug.trim() : "";
  const category = typeof article.category === "string" ? article.category.trim() : "";
  const location = typeof article.location === "string" ? article.location.trim() : "";
  const excerpt = typeof article.excerpt === "string" ? article.excerpt.trim() : "";
  const contentMarkdown = typeof article.content_markdown === "string" ? article.content_markdown.trim() : "";
  const tags = Array.isArray(article.tags)
    ? [...new Set(article.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))]
    : [];
  const citations = Array.isArray(article.sources_cited)
    ? article.sources_cited.filter((citation) =>
      citation &&
      typeof citation.name === "string" &&
      citation.name.trim() &&
      citation.url === source.link)
    : [];
  const wordCount = contentMarkdown.split(/\s+/).filter(Boolean).length;
  const paragraphs = contentMarkdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^#{1,6}\s/.test(block));
  if (
    title.length < 10 || title.length > 70 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !allowedCategories.has(category) ||
    location.length > 100 ||
    excerpt.length < 150 || excerpt.length > 220 ||
    wordCount < 150 || wordCount > 800 ||
    paragraphs.length < 2 || paragraphs.length > 4 ||
    (wordCount > 250 && !/^##\s+/m.test(contentMarkdown)) ||
    tags.length < 3 || tags.length > 8 ||
    !citations.length
  ) {
    return null;
  }
  return {
    status: "success",
    title,
    slug,
    category,
    location,
    excerpt,
    contentMarkdown,
    tags,
    sourcesCited: [{ name: "Actu.fr", url: source.link }],
  };
}

export async function POST(request) {
  return withAdmin(request, async ({ db, user }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return Response.json({ error: "Le corps de la requête est invalide." }, { status: 400 });
    }

    const { category, region, link } = body.data;
    if (typeof category !== "string" || !actuCategories.some(({ id }) => id === category)) {
      return Response.json({ error: "La rubrique Actu.fr est invalide." }, { status: 400 });
    }
    if (typeof link !== "string") {
      return Response.json({ error: "Le lien de l’article source est obligatoire." }, { status: 400 });
    }
    if (category === "regions" && typeof region !== "string") {
      return Response.json({ error: "La région est obligatoire pour cette rubrique." }, { status: 400 });
    }

    let source;
    try {
      source = (await fetchActuArticles(category, region)).find((article) => article.link === link);
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : "Impossible de lire la source Actu.fr.",
      }, { status: 502 });
    }
    if (!source) {
      return Response.json({ error: "Cet article n’est plus présent dans cette rubrique." }, { status: 404 });
    }
    const description = typeof source.description === "string" ? source.description.trim() : "";
    if (!description) {
      return Response.json({
        status: "insufficient_data",
        error: "Le flux RSS ne fournit pas de résumé suffisant pour rédiger l’article.",
      }, { status: 422 });
    }

    const sourceHash = actuSourceHashForArticle(source);
    const { data: existing, error: existingError } = await db
      .from("articles")
      .select("id")
      .like("slug", `actu-%-${sourceHash}`)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      return Response.json({ error: `Impossible de vérifier les brouillons existants : ${existingError.message}` }, { status: 500 });
    }
    if (existing) {
      return Response.json({ error: "Un brouillon a déjà été généré à partir de cet article." }, { status: 409 });
    }

    const result = await generateOpenAISummary({
      systemPrompt: articleSystemPrompt,
      userContent: JSON.stringify({
        title: source.title,
        description,
        author: source.author,
        publishedAt: source.publishedAt,
        categories: source.sourceCategories,
        sources: [{ name: "Actu.fr", url: source.link }],
      }),
      maxTokens: 1600,
      responseFormat: { type: "json_object" },
    });
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const articleDraft = parseGeneratedArticle(result.summary, source);
    if (!articleDraft || articleDraft.status === "insufficient_data") {
      return Response.json({
        status: "insufficient_data",
        error: "Les informations du résumé RSS ne suffisent pas pour rédiger un article fiable d’au moins 150 mots.",
      }, { status: 422 });
    }

    const slug = slugForActuArticle(source, articleDraft.slug);
    const sourcesMarkdown = articleDraft.sourcesCited
      .map(({ name, url }) => `- [${name}](${url})`)
      .join("\n");
    const content = `${articleDraft.contentMarkdown}\n\n## Sources\n${sourcesMarkdown}\n\n${formatActuAttribution(source)}`;
    const tags = [...new Set([
      ...articleDraft.tags,
      articleDraft.location,
      "Actu.fr",
      ...source.sourceCategories,
    ].filter(Boolean))].slice(0, 12);
    const { data: article, error } = await db
      .from("articles")
      .insert({
        title: articleDraft.title,
        slug,
        excerpt: articleDraft.excerpt,
        content,
        category: articleDraft.category,
        location: articleDraft.location || null,
        author_name: user.user_metadata?.full_name || user.email || "RADAR",
        tags,
        status: "draft",
        show_on_home: false,
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .select("id, title, slug")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "Un brouillon a déjà été généré à partir de cet article." }, { status: 409 });
      }
      return Response.json({ error: `Impossible d’enregistrer le brouillon : ${error.message}` }, { status: 500 });
    }

    return Response.json({ status: "success", article }, { status: 201 });
  });
}
