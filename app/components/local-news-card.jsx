"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";

export default function LocalNewsCard({ article }) {
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function locateCity() {
    if (!navigator.geolocation) {
      setError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }

    setError("");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            localityLanguage: "fr",
          });
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
          );
          if (!response.ok) {
            throw new Error(`Le service de localisation répond avec le statut ${response.status}.`);
          }

          const data = await response.json();
          const detectedCity = data.city || data.locality || data.principalSubdivision;
          if (typeof detectedCity !== "string" || !detectedCity.trim()) {
            throw new Error("Impossible d’identifier une ville à cette position.");
          }
          setCity(detectedCity.trim());
        } catch (requestError) {
          setError(requestError instanceof Error
            ? requestError.message
            : "Impossible d’identifier votre ville.");
        } finally {
          setLoading(false);
        }
      },
      (positionError) => {
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? "Autorisez la localisation dans votre navigateur pour trouver les actualités près de vous."
          : "Votre position n’a pas pu être déterminée. Réessayez dans un instant.");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <article className="briefing-card local-news-card">
      <div className="briefing-card-heading">
        <span className="briefing-icon"><MapPin size={18} aria-hidden="true" /></span>
        <p className="eyebrow">Près de chez vous</p>
      </div>
      <h2 className="briefing-card-title">{city || "L’actu de votre région"}</h2>
      <p className="briefing-card-copy">{article.title}</p>
      <Link className="briefing-card-link" href={`/#${article.id}`}>
        Voir l’actualité régionale <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
      <button
        className="location-button"
        disabled={loading}
        onClick={locateCity}
        type="button"
      >
        {loading ? "Localisation…" : city ? "Actualiser ma ville" : "Trouver ma ville"}
      </button>
      {error && <p className="location-error" role="alert">{error}</p>}
      <p className="location-disclosure">
        Votre position est demandée avec votre accord et envoyée à BigDataCloud pour identifier votre ville.
      </p>
    </article>
  );
}
