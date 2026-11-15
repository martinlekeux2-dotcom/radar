import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublishedVideos } from "../../src/lib/public-content";

function formatDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds <= 0) return "";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export const metadata = {
  title: "Toutes les vidéos",
  description: "Retrouvez toutes les vidéos et tous les shorts publiés par RADAR.",
};

export default async function VideosIndexPage() {
  const videos = (await getPublishedVideos()) ?? [];

  return (
    <main className="videos-index-page page-shell">
      <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/#videos">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
      </Link>
      <header className="videos-index-header">
        <p className="eyebrow">À regarder, à partager</p>
        <h1 className="headline">Toutes les vidéos</h1>
        <p>Les vidéos et shorts publiés par la rédaction de RADAR.</p>
      </header>
      {videos.length ? (
        <div className="videos-index-grid">
          {videos.map((video, index) => (
            <article className="video-card" key={video.id}>
              <div className={`video-art video-${["lilac", "peach", "sage", "sky"][index % 4]} has-video`}>
                <video
                  className="video-card-media"
                  aria-label={`Lire ${video.title}`}
                  controls
                  playsInline
                  poster={video.thumbnail_url || undefined}
                  preload="metadata"
                  src={video.video_url}
                >
                  Votre navigateur ne peut pas lire cette vidéo.
                </video>
                {formatDuration(video.duration_seconds) && (
                  <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
              </div>
              <p className="eyebrow mb-2 mt-4">{video.category || "Vidéo"}</p>
              <h2>{video.title}</h2>
              {video.description && <p className="videos-index-description">{video.description}</p>}
              {video.published_at && <p className="videos-index-date">{formatDate(video.published_at)}</p>}
            </article>
          ))}
        </div>
      ) : (
        <p className="videos-index-empty">Aucune vidéo publiée pour le moment.</p>
      )}
    </main>
  );
}
