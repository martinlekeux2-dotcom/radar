import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { getPublishedEvents } from "../../src/lib/public-content";

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export const metadata = {
  title: "Agenda complet",
  description: "Tous les événements à venir près de chez vous.",
};

export default async function EventsIndexPage() {
  const events = (await getPublishedEvents({ all: true })) ?? [];

  return (
    <main className="agenda-page page-shell">
      <Link className="inline-flex items-center gap-2 text-sm font-bold" href="/#evenements">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
      </Link>
      <header className="agenda-page-header">
        <p className="eyebrow">À vivre près de chez vous</p>
        <h1 className="headline">L’agenda complet</h1>
        <p>Les rendez-vous à venir sélectionnés pour vous.</p>
      </header>
      {events.length ? (
        <div className="agenda-event-grid">
          {events.map((event) => {
            const place = [event.venue, event.city].filter(Boolean).join(", ");
            return (
              <article className="agenda-event-card" key={event.id}>
                <div
                  className="agenda-event-image"
                  role="img"
                  aria-label={event.title}
                  style={event.image_url ? { backgroundImage: `url("${event.image_url}")` } : undefined}
                >
                  <span>{event.category || "Événement"}</span>
                </div>
                <div className="agenda-event-content">
                  <p className="agenda-event-date"><CalendarDays size={16} aria-hidden="true" />{formatDate(event.starts_at)}</p>
                  <h2>{event.title}</h2>
                  {event.description && <p className="agenda-event-description">{event.description}</p>}
                  {place && <p className="agenda-event-place"><MapPin size={16} aria-hidden="true" />{place}</p>}
                  {event.ticket_url && (
                    <a className="agenda-event-link" href={event.ticket_url} rel="noopener noreferrer" target="_blank">
                      En savoir plus <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="agenda-empty">Aucun événement à venir pour le moment.</p>
      )}
    </main>
  );
}
