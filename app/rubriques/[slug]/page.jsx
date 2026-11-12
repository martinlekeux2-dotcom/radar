import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { articles } from "../../lib/articles";

export function generateStaticParams() {
  return articles.map(({ id }) => ({ slug: id }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = articles.find((item) => item.id === slug);

  if (!article) return {};

  return {
    title: article.category,
    description: article.excerpt,
  };
}

export default async function RubriquePage({ params }) {
  const { slug } = await params;
  const article = articles.find((item) => item.id === slug);

  if (!article) notFound();

  return (
    <main className="rubrique-page page-shell">
      <Link className="rubrique-back-link" href="/">
        <ArrowLeft size={15} aria-hidden="true" />
        Retour à l’accueil
      </Link>
      <header className="rubrique-heading">
        <p className="eyebrow">Rubrique</p>
        <h1 className="headline">{article.category}</h1>
        <p>Les dernières actualités et les sujets à suivre dans la rubrique {article.category}.</p>
      </header>
      <article className="rubrique-feature">
        <div
          className="rubrique-feature-image"
          role="img"
          aria-label={article.imageDescription}
          style={{ backgroundImage: `url("${article.image}")` }}
        />
        <div className="rubrique-feature-content">
          <p className="eyebrow">{article.category} · {article.time}</p>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>
          <Link className="rubrique-feature-link" href={`/#${article.id}`}>
            Retrouver l’actualité <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  );
}
