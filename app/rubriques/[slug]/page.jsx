import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { articles as exampleArticles } from "../../lib/articles";
import { mainMenuSections, slugifyContent } from "../../../src/lib/content-config";
import { getPublishedArticles } from "../../../src/lib/public-content";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const section = mainMenuSections.find((item) => item.slug === slug);
  return section ? { title: section.label, description: `Les articles de la rubrique ${section.label}.` } : {};
}

export default async function RubriquePage({ params }) {
  const { slug } = await params;
  const section = mainMenuSections.find((item) => item.slug === slug);
  if (!section) notFound();

  const databaseArticles = await getPublishedArticles({ menuSection: slug });
  const listedArticles = databaseArticles ?? exampleArticles.filter((article) =>
    article.id === slug || slugifyContent(article.category) === slug,
  );

  return (
    <main className="rubrique-page page-shell">
      <Link className="rubrique-back-link" href="/">
        <ArrowLeft size={15} aria-hidden="true" />
        Retour à l’accueil
      </Link>
      <header className="rubrique-heading">
        <p className="eyebrow">Menu principal</p>
        <h1 className="headline">{section.label}</h1>
        <p>Les articles publiés dans cette rubrique.</p>
      </header>
      {listedArticles.length ? (
        <div className="rubrique-article-grid">
          {listedArticles.map((article) => (
            <article className={`rubrique-feature${article.cover_image_url || article.image ? "" : " is-text-only"}`} key={article.id ?? article.slug}>
              {(article.cover_image_url || article.image) && (
                <div
                  className="rubrique-feature-image"
                  role="img"
                  aria-label={article.title}
                  style={{ backgroundImage: `url("${article.cover_image_url || article.image}")` }}
                />
              )}
              <div className="rubrique-feature-content">
                <p className="eyebrow">{article.category}{article.published_at ? ` · ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(article.published_at))}` : ""}</p>
                <h2>{article.title}</h2>
                <p>{article.excerpt}</p>
                <Link className="rubrique-feature-link" href={article.slug ? `/articles/${article.slug}` : `/#${article.id}`}>
                  Lire l’article <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-paper p-6 text-sm text-muted">Aucun article publié dans cette rubrique pour le moment.</p>
      )}
    </main>
  );
}
