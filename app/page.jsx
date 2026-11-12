import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  MapPin,
  Play,
  Sparkles,
} from "lucide-react";
import QuickInfoStack from "./components/quick-info-stack";
import WeatherCard from "./components/weather-card";
import { articles } from "./lib/articles";
import { reportages } from "./lib/reportages";
import {
  getPublishedArticles,
  getPublishedEvents,
  getPublishedQuickInfos,
  getPublishedVideos,
} from "../src/lib/public-content";

const fallbackQuickInfos = [
  {
    category: "Environnement",
    icon: "leaf",
    title: "Les berges retrouvent leur place",
    copy: "Un nouvel itinéraire piéton relie les quartiers au fleuve dès ce week-end.",
  },
  {
    category: "Mobilité",
    icon: "location",
    title: "Une ligne de bus renforcée",
    copy: "Des départs supplémentaires sont prévus aux heures de pointe dès lundi.",
  },
  {
    category: "Vie pratique",
    icon: "lightbulb",
    title: "La médiathèque ouvre plus tard",
    copy: "Les horaires du jeudi soir sont prolongés jusqu’à 20 h à partir du 12 novembre.",
  },
  {
    category: "Énergie",
    icon: "energy",
    title: "Un coup de pouce pour les rénovations",
    copy: "La permanence locale d’information reprend ses rendez-vous gratuits cette semaine.",
  },
];

const fallbackVideos = [
  { title: "Une minute pour comprendre le budget", duration: "01:12", tone: "video-lilac", category: "Décryptage" },
  { title: "Le marché se réveille", duration: "00:48", tone: "video-peach", category: "Dans la région" },
  { title: "Trois gestes pour moins jeter", duration: "00:56", tone: "video-sage", category: "Le bon réflexe" },
  { title: "Les images du week-end sportif", duration: "01:04", tone: "video-sky", category: "Sport" },
];

const fallbackEvents = [
  { day: "12", month: "NOV", category: "Rencontre", title: "Les idées qui changent la ville", place: "La Fabrique, centre-ville", tone: "peach", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=85" },
  { day: "15", month: "NOV", category: "Culture", title: "Un soir au musée : portes ouvertes", place: "Musée des Beaux-Arts", tone: "lilac", image: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=85" },
  { day: "18", month: "NOV", category: "Débat", title: "Comment mieux habiter demain ?", place: "Médiathèque centrale", tone: "sage", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=85" },
];

const videoTones = ["video-lilac", "video-peach", "video-sage", "video-sky"];
const fallbackEventImages = [
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=85",
];

function formatVideoDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds <= 0) return "";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatEventDate(value) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "Europe/Paris" }).format(date),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "Europe/Paris" }).format(date).replace(".", "").toUpperCase(),
  };
}

function formatArticleTime(value) {
  if (!value) return "À l’instant";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(value));
}

function SectionHeading({ kicker, title, href = "#en-direct", linkLabel = "Tout voir" }) {
  return (
    <div className="section-heading mb-7 flex items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="eyebrow mb-2">{kicker}</p>
        <h2 className="section-title">{title}</h2>
      </div>
      <Link className="mb-1 inline-flex shrink-0 items-center gap-2 text-xs font-bold hover:underline" href={href}>
        {linkLabel} <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export default async function Home({ searchParams }) {
  const { q = "" } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const [databaseArticles, databaseVideos, databaseEvents, databaseQuickInfos] = await Promise.all([
    getPublishedArticles({ homeOnly: !query }),
    getPublishedVideos(),
    getPublishedEvents(),
    getPublishedQuickInfos(),
  ]);
  const articleSource = databaseArticles ?? articles;
  const matchingArticles = query
    ? (databaseArticles ?? articles).filter((article) =>
        `${article.category} ${article.title} ${article.excerpt ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(query.toLocaleLowerCase("fr")),
      )
    : articleSource;
  const filteredArticles = matchingArticles.slice(0, 4);
  const featuredArticle = filteredArticles[0] ?? (databaseArticles === null ? articles[0] : null);
  const videos = databaseVideos === null
    ? fallbackVideos.map((video, index) => ({ ...video, featured_position: index < 3 ? index + 1 : null }))
    : databaseVideos.map((video, index) => ({
        ...video,
        tone: videoTones[index % videoTones.length],
        duration: formatVideoDuration(video.duration_seconds),
      }));
  const featuredVideos = databaseVideos === null
    ? videos.slice(0, 3)
    : videos.filter((video) => video.featured_position).slice(0, 3);
  const events = databaseEvents === null
    ? fallbackEvents
    : databaseEvents.map((event, index) => ({
        ...formatEventDate(event.starts_at),
        ...event,
        category: event.category || "Événement",
        place: [event.venue, event.city].filter(Boolean).join(", "),
        image: event.image_url || fallbackEventImages[index % fallbackEventImages.length],
        tone: ["peach", "lilac", "sage"][index % 3],
      }));
  const quickInfos = databaseQuickInfos ?? fallbackQuickInfos;

  return (
    <main>
      <section className="home-intro page-shell">
        {query ? (
          <div className="mb-10">
            <p className="eyebrow mb-3">Recherche</p>
            <h1 className="headline">Les résultats pour « {query} »</h1>
          </div>
        ) : (
          <div className="briefing-strip">
            <div className="briefing-grid">
              <article className="briefing-card live-briefing-card">
                <p className="eyebrow"><span className="live-dot" /> En direct</p>
                {featuredArticle ? (
                  <>
                    <h1 className="briefing-card-title">{featuredArticle.title}</h1>
                    <p className="briefing-card-copy">{featuredArticle.excerpt || formatArticleTime(featuredArticle.published_at)}</p>
                    <Link className="briefing-card-link" href={featuredArticle.slug ? `/articles/${featuredArticle.slug}` : `/#${featuredArticle.id}`}>
                      Suivre l’actualité <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </>
                ) : <p className="briefing-card-copy">Aucun article publié pour le moment.</p>}
              </article>
              <WeatherCard />
            </div>
          </div>
        )}
      </section>

      {!query && featuredArticle && (
        <div className="home-featured page-shell scroll-reveal mt-10 grid gap-5 overflow-hidden rounded-2xl p-3 md:mt-14 md:grid-cols-[1.35fr_1fr] md:gap-9 md:p-5">
          <div
            className="story-visual min-h-[260px] rounded-xl md:min-h-[380px]"
            role="img"
            aria-label={featuredArticle.title}
            style={featuredArticle.cover_image_url ? { backgroundImage: `url("${featuredArticle.cover_image_url}")` } : undefined}
          >
            <span className="featured-doodle featured-doodle-sparkle"><Sparkles size={25} aria-hidden="true" /></span>
            <span className="featured-doodle featured-doodle-leaf"><Leaf size={29} aria-hidden="true" /></span>
          </div>
          <div className="flex flex-col justify-center px-3 py-5 md:px-4 md:py-8">
            <p className="eyebrow mb-5"><span className="rounded-full bg-ink px-2.5 py-1 text-[9px] text-white">À LA UNE</span> {featuredArticle.category}</p>
            <h2 className="font-display text-3xl font-black leading-[1.02] tracking-[-0.05em] md:text-5xl">{featuredArticle.title}</h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted">{featuredArticle.excerpt}</p>
            <Link className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-bold" href={featuredArticle.slug ? `/articles/${featuredArticle.slug}` : `/#${featuredArticle.id}`}>
              Lire l’article <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <section className="latest-news-section scroll-reveal py-14 md:py-20" id="en-direct">
        <div className="page-shell">
          <SectionHeading kicker="Mis à jour en continu" title={query ? `${matchingArticles.length} résultat${matchingArticles.length > 1 ? "s" : ""}` : "Les dernières actualités"} />
          {filteredArticles.length ? (
            <>
              <div className="latest-stories-grid">
                {filteredArticles.map((article, index) => (
                  <article className="latest-story scroll-reveal" id={article.id ?? article.slug} key={article.id ?? article.slug}>
                    <Link className="latest-story-inner" href={article.slug ? `/articles/${article.slug}` : `/#${article.id}`}>
                      <div
                        className="latest-story-image"
                        role="img"
                        aria-label={article.title}
                        style={{ backgroundImage: `url("${article.cover_image_url || article.image || fallbackEventImages[0]}")` }}
                      >
                        <span className="latest-story-category">{article.category}</span>
                        {index === 0 && !query && <span className="latest-story-new">Nouveau</span>}
                      </div>
                      <div className="latest-story-content">
                        <p className="latest-story-time">{article.time || formatArticleTime(article.published_at)}</p>
                        <h3>{article.title}</h3>
                        <p className="latest-story-excerpt">{article.excerpt || ""}</p>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
              {!query && (
                <div className="latest-more-wrap">
                  <Link className="latest-more-button" href="#reportages">
                    Plus de reportages <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl bg-paper p-6 text-sm text-muted">
              {query ? "Aucun article ne correspond à cette recherche. Essayez un autre mot-clé." : "Aucun article publié pour le moment."}
            </p>
          )}
        </div>
      </section>

      {!query && (
        <>
          <section className="daily-fact-section page-shell scroll-reveal" aria-label="Le chiffre du jour">
            <aside className="daily-fact-card">
              <span className="daily-fact-icon"><Sparkles size={18} aria-hidden="true" /></span>
              <div className="daily-fact-number">
                <p className="eyebrow">Le chiffre du jour</p>
                <p><strong>1 idée</strong><span> / jour</span></p>
              </div>
              <p className="daily-fact-copy">Pour comprendre l&apos;actualité sans perdre le fil.</p>
            </aside>
          </section>

          <section className="videos-section scroll-reveal page-shell py-14 md:py-20" id="videos">
            <SectionHeading kicker="À regarder, à partager" title="Vidéos & shorts" href="#videos" linkLabel="Toutes les vidéos" />
            {featuredVideos.length ? (
              <div className="video-ranking" aria-label="Vidéos mises en avant">
                {featuredVideos.map((video) => (
                  <article className={`ranking-video ${video.featured_position === 1 ? "ranking-video-first" : video.featured_position === 2 ? "ranking-video-second" : "ranking-video-third"}`} key={video.id ?? video.slug ?? video.title}>
                    <p className="ranking-video-label">{video.featured_position === 1 ? "La vidéo du moment" : video.featured_position === 2 ? "À partager" : "À découvrir"}</p>
                    {video.featured_position === 1 ? (
                      <div className="ranking-phone">
                        {video.video_url ? (
                          <video className="ranking-phone-video" controls playsInline poster={video.thumbnail_url || undefined} preload="metadata" src={video.video_url}>
                            Votre navigateur ne peut pas lire cette vidéo.
                          </video>
                        ) : (
                          <div className={`ranking-phone-screen ${video.tone}`}>
                            <span className="ranking-phone-footage" aria-hidden="true" />
                            <span className="ranking-phone-position">01 · TOP VIDÉO</span>
                            <span className="ranking-phone-play"><Play size={24} fill="currentColor" aria-hidden="true" /></span>
                            <span className="ranking-phone-caption">{video.title}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`ranking-video-art ${video.tone}`} style={video.thumbnail_url ? { backgroundImage: `url("${video.thumbnail_url}")` } : undefined}>
                        {video.video_url
                          ? <video className="ranking-side-video" controls playsInline poster={video.thumbnail_url || undefined} preload="metadata" src={video.video_url}>Votre navigateur ne peut pas lire cette vidéo.</video>
                          : <><span className="ranking-position">0{video.featured_position}</span><Play size={22} fill="currentColor" aria-hidden="true" /></>}
                      </div>
                    )}
                    <h3>{video.title}</h3>
                  </article>
                ))}
              </div>
            ) : <p className="rounded-xl bg-paper p-6 text-sm text-muted">Aucune vidéo n’est mise en avant pour le moment.</p>}
            {videos.length ? (
              <div className="marquee-viewport" aria-label="Vidéos et shorts, défilement automatique">
                <div className="marquee-track videos-marquee">
                  {[0, 1].map((copy) => (
                    <div className="marquee-group" key={copy} aria-hidden={copy === 1}>
                      {videos.map((video) => (
                        <article className="video-card" key={video.id ?? video.slug ?? video.title}>
                          <div className={`video-art ${video.tone}`}>
                            {video.video_url
                              ? <video className="video-card-media" aria-label={`Lire ${video.title}`} controls={copy === 0} playsInline poster={video.thumbnail_url || undefined} preload={copy === 0 ? "metadata" : "none"} src={video.video_url} tabIndex={copy === 1 ? -1 : 0}>Votre navigateur ne peut pas lire cette vidéo.</video>
                              : <span className="video-play"><Play size={17} fill="currentColor" /></span>}
                            {video.duration && <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white">{video.duration}</span>}
                          </div>
                          <p className="eyebrow mb-2 mt-4">{video.category || "Vidéo"}</p>
                          <h3>{video.title}</h3>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="admin-empty">Aucune vidéo publiée pour le moment.</p>}
          </section>

          <section className="community-section scroll-reveal" id="evenements">
            <div className="page-shell community-grid">
              <div className="events-panel">
                <SectionHeading kicker="À vivre près de chez vous" title="Événements à la une" href="#evenements" linkLabel="L'agenda complet" />
                <div className="events-stars">
                  {events.map((event, index) => (
                    <article
                      className="event-bubble-card"
                      key={event.id ?? event.slug ?? event.title}
                      style={{
                        "--event-image": `url("${event.image}")`,
                        "--event-delay": `${index * -1.2}s`,
                      }}
                    >
                      <div className="event-bubble-photo">
                        <span className="event-bubble-date">{event.day}<small>{event.month}</small></span>
                        <span className="event-bubble-category">{event.category}</span>
                      </div>
                      <h3>{event.ticket_url ? <a href={event.ticket_url} rel="noopener noreferrer" target="_blank">{event.title}</a> : event.title}</h3>
                      <p className="event-bubble-place"><MapPin size={14} aria-hidden="true" />{event.place}</p>
                    </article>
                  ))}
                  {!events.length && <p className="admin-empty">Aucun événement à venir.</p>}
                </div>
              </div>
              <QuickInfoStack items={quickInfos} />
            </div>
          </section>

          <section className="reportages-section scroll-reveal" id="reportages">
            <div className="page-shell">
              <SectionHeading kicker="À découvrir" title="Reportages" href="/#reportages" linkLabel="Tous les reportages" />
            </div>
            <div className="marquee-viewport" aria-label="Reportages à découvrir, défilement automatique">
              <div className="marquee-track reportage-marquee">
                {[0, 1].map((copy) => (
                  <div className="marquee-group" key={copy} aria-hidden={copy === 1}>
                    {reportages.map((reportage) => (
                      <Link
                        className="reportage-card"
                        href={`/reportages/${reportage.slug}`}
                        key={reportage.slug}
                        tabIndex={copy === 1 ? -1 : undefined}
                      >
                        <span
                          className="reportage-bubble"
                          role="img"
                          aria-label={reportage.imageDescription}
                          style={{ backgroundImage: `url("${reportage.image}")` }}
                        />
                        <h3>{reportage.title}</h3>
                        <p className="reportage-card-meta">{reportage.date}<br />Par {reportage.author}</p>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-reveal page-shell py-14 md:py-20" id="newsletter">
            <div className="newsletter-card">
              <div className="newsletter-copy">
                <p className="eyebrow mb-3">La newsletter RADAR</p>
                <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">Le bon angle, dans votre boîte mail.</h2>
                <p className="mt-3 text-sm text-muted">Un résumé clair de l&apos;actualité, chaque matin.</p>
              </div>
              <div className="newsletter-action">
                <div className="newsletter-envelope" aria-hidden="true">
                  <span className="newsletter-envelope-paper" />
                  <span className="newsletter-envelope-back" />
                  <span className="newsletter-envelope-flap" />
                  <span className="newsletter-envelope-front" />
                </div>
                <Link className="newsletter-button" href="mailto:bonjour@radar.media?subject=Newsletter%20RADAR">
                  S&apos;inscrire à la newsletter <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
