import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { reportages as fallbackReportages } from "../lib/reportages";
import { getPublishedArticles, getPublishedReportages } from "../../src/lib/public-content";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export const metadata = {
  title: "Tous les reportages",
  description: "Retrouvez les reportages et articles mis en avant par la rédaction de RADAR.",
};

export default async function ReportagesIndexPage() {
  const [databaseReportages, databaseArticles] = await Promise.all([
    getPublishedReportages(),
    getPublishedArticles({ reportageOnly: true }),
  ]);
  const reportageItems = databaseReportages === null
    ? fallbackReportages.map((reportage) => ({
        ...reportage,
        author_name: reportage.author,
        image_url: reportage.image,
        image_description: reportage.imageDescription,
        published_at: null,
      }))
    : databaseReportages;
  const articleItems = (databaseArticles ?? []).map((article) => ({
    ...article,
    image_url: article.cover_image_url,
    image_description: article.cover_image_caption || article.title,
    isArticle: true,
  }));
  const items = [...articleItems, ...reportageItems];

  return (
    <main className="reportages-index-page page-shell">
      <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/#reportages">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
      </Link>
      <header className="reportages-index-header">
        <p className="eyebrow">À découvrir</p>
        <h1 className="headline">Tous les reportages</h1>
        <p>Les enquêtes, rencontres et articles choisis par la rédaction.</p>
      </header>
      {items.length ? (
        <div className="reportages-index-grid">
          {items.map((item) => (
            <Link
              className="reportage-card reportages-index-card"
              href={`${item.isArticle ? "/articles" : "/reportages"}/${item.slug}`}
              key={`${item.isArticle ? "article" : "reportage"}-${item.id ?? item.slug}`}
            >
              <span
                className="reportage-bubble"
                role="img"
                aria-label={item.image_description || item.title}
                style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}
              />
              <span className="reportages-index-type">{item.isArticle ? "Article" : "Reportage"}</span>
              <h2>{item.title}</h2>
              <p className="reportage-card-meta">
                {formatDate(item.published_at) || item.date || "Date non renseignée"}
                <br />Par {item.author_name || "RADAR"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="reportages-index-empty">Aucun reportage ni article mis en avant pour le moment.</p>
      )}
    </main>
  );
}
