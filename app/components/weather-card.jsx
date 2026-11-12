"use client";

import { useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  LocateFixed,
  Sun,
} from "lucide-react";

function describeWeather(code) {
  if (code === 0) return { label: "Ciel dégagé", Icon: Sun, tone: "sunny" };
  if ([1, 2].includes(code)) return { label: "Éclaircies", Icon: CloudSun, tone: "partly-cloudy" };
  if (code === 3) return { label: "Ciel couvert", Icon: Cloud, tone: "cloudy" };
  if ([45, 48].includes(code)) return { label: "Brouillard", Icon: CloudFog, tone: "cloudy" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Bruine", Icon: CloudDrizzle, tone: "rainy" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Pluie", Icon: CloudRain, tone: "rainy" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Neige", Icon: CloudSnow, tone: "snowy" };
  if ([95, 96, 99].includes(code)) return { label: "Orages", Icon: CloudLightning, tone: "stormy" };
  return { label: "Conditions variables", Icon: CloudSun, tone: "partly-cloudy" };
}

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function loadWeather() {
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
            current: "temperature_2m,weather_code",
            timezone: "auto",
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!response.ok) throw new Error(`Le service météo répond avec le statut ${response.status}.`);
          const data = await response.json();
          if (typeof data.current?.temperature_2m !== "number" || typeof data.current?.weather_code !== "number") {
            throw new Error("Le service météo a renvoyé des données incomplètes.");
          }
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            ...describeWeather(data.current.weather_code),
          });
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Impossible de récupérer la météo.");
        } finally {
          setLoading(false);
        }
      },
      (positionError) => {
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? "Autorisez la localisation dans votre navigateur pour afficher la météo."
          : "Votre position n’a pas pu être déterminée. Réessayez dans un instant.");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const WeatherIcon = weather?.Icon ?? CloudSun;

  return (
    <section className="weather-card" id="meteo" aria-labelledby="weather-title">
      <div className="weather-card-heading">
        <div>
          <p className="eyebrow">Près de chez vous</p>
          <h2 id="weather-title">Météo locale</h2>
        </div>
        <span className={`weather-icon weather-icon-${weather?.tone ?? "partly-cloudy"}`}>
          <WeatherIcon size={34} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      {weather ? (
        <div className="weather-reading" aria-live="polite">
          <p className="weather-temperature">{weather.temperature}°</p>
          <p className="weather-description">{weather.label}</p>
        </div>
      ) : (
        <p className="weather-prompt" aria-live="polite">Activez la localisation pour voir le temps qu’il fait ici.</p>
      )}
      {error && <p className="weather-error" role="alert">{error}</p>}
      <button
        className="weather-location-button"
        disabled={loading}
        onClick={loadWeather}
        type="button"
      >
        <LocateFixed size={14} aria-hidden="true" />
        {loading ? "Localisation…" : weather ? "Actualiser la météo" : "Localiser la météo"}
      </button>
      <p className="weather-disclosure">Votre position n’est utilisée qu’avec votre accord.</p>
    </section>
  );
}
