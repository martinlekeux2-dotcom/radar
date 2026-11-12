import { withAdmin } from "../../../../src/lib/admin-api";
import {
  actuCategories,
  actuRegions,
} from "../../../../src/lib/actu-rss-config";
import {
  actuSourceHashForArticle,
  fetchActuArticles,
} from "../../../../src/lib/actu-rss";

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("category") ?? "all";
    const regionSlug = url.searchParams.get("region") ?? actuRegions[0].slug;
    if (!actuCategories.some(({ id }) => id === categoryId)) {
      return Response.json({ error: "Cette rubrique Actu.fr n’existe pas." }, { status: 400 });
    }

    try {
      const articles = await fetchActuArticles(categoryId, regionSlug);
      const { data: existing, error } = await db
        .from("articles")
        .select("slug")
        .like("slug", "actu-%");
      if (error) {
        return Response.json({ error: `Impossible de vérifier les brouillons générés : ${error.message}` }, { status: 500 });
      }

      const generatedSourceHashes = new Set(
        (existing ?? [])
          .map(({ slug }) => slug.match(/-([a-f0-9]{10})$/i)?.[1])
          .filter(Boolean),
      );
      return Response.json({
        items: articles.map((article) => ({
          ...article,
          generated: generatedSourceHashes.has(actuSourceHashForArticle(article)),
        })),
        sourceNotice: "Les cartes affichent uniquement les titres, résumés RSS et liens sources.",
      });
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : "Impossible de charger le flux Actu.fr.",
      }, { status: 502 });
    }
  });
}
