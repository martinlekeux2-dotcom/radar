import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ArticleContent, { renderInlineMarkdown } from "../../components/article-content";
import { getPublishedArticle } from "../../../src/lib/public-content";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? "",
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  return (
    <main className="article-page page-shell">
      <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
      </Link>
      <article>
        <p className="eyebrow mb-3 mt-10">{article.category}{article.location ? ` · ${article.location}` : ""}</p>
        <h1 className="headline">{article.title}</h1>
        {article.excerpt && <p className="article-excerpt">{renderInlineMarkdown(article.excerpt)}</p>}
        <p className="article-byline">
          {article.author_name ? `Par ${article.author_name} · ` : ""}
          {article.published_at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(article.published_at)) : ""}
        </p>
        {article.cover_image_url && (
          <figure className="article-cover-figure">
            <img className="article-cover" src={article.cover_image_url} alt={article.cover_image_caption || ""} />
            {article.cover_image_caption && <figcaption>{article.cover_image_caption}</figcaption>}
          </figure>
        )}
        <ArticleContent content={article.content} />
      </article>
    </main>
  );
}
