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

const quickInfos = [
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

const videos = [
  { title: "Une minute pour comprendre le budget", duration: "01:12", tone: "video-lilac", category: "Décryptage" },
  { title: "Le marché se réveille", duration: "00:48", tone: "video-peach", category: "Dans la région" },
  { title: "Trois gestes pour moins jeter", duration: "00:56", tone: "video-sage", category: "Le bon réflexe" },
  { title: "Les images du week-end sportif", duration: "01:04", tone: "video-sky", category: "Sport" },
];

const events = [
  { day: "12", month: "NOV", category: "Rencontre", title: "Les idées qui changent la ville", place: "La Fabrique, centre-ville", tone: "peach", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=85" },
  { day: "15", month: "NOV", category: "Culture", title: "Un soir au musée : portes ouvertes", place: "Musée des Beaux-Arts", tone: "lilac", image: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=85" },
  { day: "18", month: "NOV", category: "Débat", title: "Comment mieux habiter demain ?", place: "Médiathèque centrale", tone: "sage", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=85" },
];

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
  const matchingArticles = query
    ? articles.filter((article) =>
        `${article.category} ${article.title} ${article.excerpt}`
          .toLocaleLowerCase("fr")
          .includes(query.toLocaleLowerCase("fr")),
      )
    : articles;
  const filteredArticles = matchingArticles.slice(0, 4);

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
                <h1 className="briefing-card-title">{articles[0].title}</h1>
                <p className="briefing-card-copy">{articles[0].time}</p>
                <Link className="briefing-card-link" href={`/#${articles[0].id}`}>
                  Suivre l’actualité <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </article>
              <WeatherCard />
            </div>
          </div>
        )}
      </section>

      {!query && (
        <div className="home-featured page-shell scroll-reveal mt-10 grid gap-5 overflow-hidden rounded-2xl p-3 md:mt-14 md:grid-cols-[1.35fr_1fr] md:gap-9 md:p-5">
          <div className="story-visual min-h-[260px] rounded-xl md:min-h-[380px]" role="img" aria-label="Paysage abstrait aux tons doux">
            <span className="featured-doodle featured-doodle-sparkle"><Sparkles size={25} aria-hidden="true" /></span>
            <span className="featured-doodle featured-doodle-leaf"><Leaf size={29} aria-hidden="true" /></span>
          </div>
          <div className="flex flex-col justify-center px-3 py-5 md:px-4 md:py-8">
            <p className="eyebrow mb-5"><span className="rounded-full bg-ink px-2.5 py-1 text-[9px] text-white">À LA UNE</span> Enquête · 8 min</p>
            <h2 className="font-display text-3xl font-black leading-[1.02] tracking-[-0.05em] md:text-5xl">Nos villes peuvent-elles mieux respirer ?</h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted">On a suivi celles et ceux qui réinventent les espaces urbains, une rue à la fois.</p>
            <Link className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-bold" href="#en-direct">
              Lire le décryptage <ArrowUpRight size={16} />
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
                  <article className="latest-story scroll-reveal" id={article.id} key={article.id}>
                    <div className="latest-story-inner">
                      <div
                        className="latest-story-image"
                        role="img"
                        aria-label={article.imageDescription}
                        style={{ backgroundImage: `url("${article.image}")` }}
                      >
                        <span className="latest-story-category">{article.category}</span>
                        {index === 0 && !query && <span className="latest-story-new">Nouveau</span>}
                      </div>
                      <div className="latest-story-content">
                        <p className="latest-story-time">{article.time}</p>
                        <h3>{article.title}</h3>
                        <p className="latest-story-excerpt">{article.excerpt}</p>
                      </div>
                    </div>
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
            <p className="rounded-xl bg-paper p-6 text-sm text-muted">Aucun article ne correspond à cette recherche. Essayez un autre mot-clé.</p>
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
            <div className="video-ranking" aria-label="Classement des vidéos les plus regardées">
              <article className="ranking-video ranking-video-second">
                <div className="ranking-video-art video-peach">
                  <span className="ranking-position">02</span>
                  <Play size={22} fill="currentColor" aria-hidden="true" />
                </div>
                <p className="ranking-video-label">La plus partagée</p>
                <h3>{videos[1].title}</h3>
              </article>
              <article className="ranking-video ranking-video-first">
                <p className="ranking-video-label">La vidéo du moment</p>
                <div className="ranking-phone" aria-label={`Aperçu vidéo : ${videos[0].title}`}>
                  <div className={`ranking-phone-screen ${videos[0].tone}`}>
                    <span className="ranking-phone-footage" aria-hidden="true" />
                    <span className="ranking-phone-position">01 · TOP VIDÉO</span>
                    <span className="ranking-phone-play"><Play size={24} fill="currentColor" aria-hidden="true" /></span>
                    <span className="ranking-phone-caption">{videos[0].title}</span>
                  </div>
                </div>
                <h3>{videos[0].title}</h3>
              </article>
              <article className="ranking-video ranking-video-third">
                <div className="ranking-video-art video-sage">
                  <span className="ranking-position">03</span>
                  <Play size={22} fill="currentColor" aria-hidden="true" />
                </div>
                <p className="ranking-video-label">À découvrir</p>
                <h3>{videos[2].title}</h3>
              </article>
            </div>
            <div className="marquee-viewport" aria-label="Vidéos et shorts, défilement automatique">
              <div className="marquee-track videos-marquee">
                {[0, 1].map((copy) => (
                  <div className="marquee-group" key={copy} aria-hidden={copy === 1}>
                    {videos.map((video) => (
                      <article className="video-card" key={video.title}>
                        <div className={`video-art ${video.tone}`}>
                          <span className="video-play"><Play size={17} fill="currentColor" /></span>
                          <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white">{video.duration}</span>
                        </div>
                        <p className="eyebrow mb-2 mt-4">{video.category}</p>
                        <h3>{video.title}</h3>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="community-section scroll-reveal" id="evenements">
            <div className="page-shell community-grid">
              <div className="events-panel">
                <SectionHeading kicker="À vivre près de chez vous" title="Événements à la une" href="#evenements" linkLabel="L'agenda complet" />
                <div className="events-stars">
                  {events.map((event, index) => (
                    <article
                      className="event-bubble-card"
                      key={event.title}
                      style={{
                        "--event-image": `url("${event.image}")`,
                        "--event-delay": `${index * -1.2}s`,
                      }}
                    >
                      <div className="event-bubble-photo">
                        <span className="event-bubble-date">{event.day}<small>{event.month}</small></span>
                        <span className="event-bubble-category">{event.category}</span>
                      </div>
                      <h3>{event.title}</h3>
                      <p className="event-bubble-place"><MapPin size={14} aria-hidden="true" />{event.place}</p>
                    </article>
                  ))}
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
