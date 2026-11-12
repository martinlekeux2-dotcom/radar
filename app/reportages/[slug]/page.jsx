import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { reportages } from "../../lib/reportages";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const reportage = reportages.find((item) => item.slug === slug);

  if (!reportage) return {};

  return {
    title: reportage.title,
    description: reportage.paragraphs[0],
  };
}

export default async function ReportagePage({ params }) {
  const { slug } = await params;
  const reportage = reportages.find((item) => item.slug === slug);

  if (!reportage) notFound();

  return (
    <main>
      <article className="reportage-article page-shell">
        <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/#reportages">
          <ArrowLeft size={16} aria-hidden="true" />
          Tous les reportages
        </Link>
        <p className="eyebrow mb-3 mt-10">{reportage.category}</p>
        <h1 className="headline">{reportage.title}</h1>
        <p className="reportage-byline">{reportage.date} · Par {reportage.author}</p>
        <div
          className="reportage-article-image"
          role="img"
          aria-label={reportage.imageDescription}
          style={{ backgroundImage: `url("${reportage.image}")` }}
        />
        <div className="reportage-article-copy">
          {reportage.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>
    </main>
  );
}
