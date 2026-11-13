import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { reportages as fallbackReportages } from "../../lib/reportages";
import { getPublishedReportages } from "../../../src/lib/public-content";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const databaseReportages = await getPublishedReportages();
  const reportageSource = databaseReportages === null
    ? fallbackReportages.map((item) => ({
        ...item,
        author_name: item.author,
        image_url: item.image,
        content: item.paragraphs.join("\n\n"),
      }))
    : databaseReportages;
  const reportage = reportageSource.find((item) => item.slug === slug);

  if (!reportage) return {};

  return {
    title: reportage.title,
    description: reportage.content.split(/\n{2,}/)[0],
  };
}

export default async function ReportagePage({ params }) {
  const { slug } = await params;
  const databaseReportages = await getPublishedReportages();
  const reportageSource = databaseReportages === null
    ? fallbackReportages.map((item) => ({
        ...item,
        author_name: item.author,
        image_url: item.image,
        image_description: item.imageDescription,
        content: item.paragraphs.join("\n\n"),
      }))
    : databaseReportages;
  const reportage = reportageSource.find((item) => item.slug === slug);

  if (!reportage) notFound();

  return (
    <main>
      <article className="reportage-article page-shell">
        <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/reportages">
          <ArrowLeft size={16} aria-hidden="true" />
          Tous les reportages
        </Link>
        <p className="eyebrow mb-3 mt-10">{reportage.category}</p>
        <h1 className="headline">{reportage.title}</h1>
        <p className="reportage-byline">{reportage.published_at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(reportage.published_at)) : reportage.date} · Par {reportage.author_name}</p>
        {reportage.image_url && (
          <div
            className="reportage-article-image"
            role="img"
            aria-label={reportage.image_description || reportage.title}
            style={{ backgroundImage: `url("${reportage.image_url}")` }}
          />
        )}
        <div className="reportage-article-copy">
          {reportage.content.split(/\n{2,}/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>
    </main>
  );
}
