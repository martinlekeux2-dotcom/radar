import { withAdmin } from "../../../../src/lib/admin-api";

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const [
      articles,
      publishedArticles,
      draftArticles,
      archivedArticles,
      comments,
      pendingComments,
      accounts,
      recentArticles,
      categoryRows,
    ] = await Promise.all([
      db.from("articles").select("*", { count: "exact", head: true }),
      db.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
      db.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
      db.from("articles").select("*", { count: "exact", head: true }).eq("status", "archived"),
      db.from("comments").select("*", { count: "exact", head: true }),
      db.from("comments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("admin_users").select("*", { count: "exact", head: true }),
      db.from("articles")
        .select("id, title, slug, category, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
      db.from("articles").select("category"),
    ]);

    const results = [
      articles,
      publishedArticles,
      draftArticles,
      archivedArticles,
      comments,
      pendingComments,
      accounts,
      recentArticles,
      categoryRows,
    ];
    const failedResult = results.find(({ error }) => error);
    if (failedResult?.error) {
      return Response.json(
        { error: `Impossible de charger le tableau de bord : ${failedResult.error.message}` },
        { status: 500 },
      );
    }

    const categories = categoryRows.data.reduce((counts, { category }) => {
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});

    return Response.json({
      metrics: {
        articles: articles.count ?? 0,
        publishedArticles: publishedArticles.count ?? 0,
        draftArticles: draftArticles.count ?? 0,
        archivedArticles: archivedArticles.count ?? 0,
        comments: comments.count ?? 0,
        pendingComments: pendingComments.count ?? 0,
        accounts: accounts.count ?? 0,
      },
      recentArticles: recentArticles.data,
      categories,
    });
  });
}
