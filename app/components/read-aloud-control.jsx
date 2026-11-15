"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Square, Volume2 } from "lucide-react";

function splitTextIntoChunks(text, maxLength = 1800) {
  const chunks = [];
  let chunk = "";

  for (const word of text.split(/\s+/)) {
    const nextChunk = chunk ? `${chunk} ${word}` : word;
    if (nextChunk.length > maxLength && chunk) {
      chunks.push(chunk);
      chunk = word;
    } else {
      chunk = nextChunk;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

export default function ReadAloudControl() {
  const pathname = usePathname();
  const [readingState, setReadingState] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const chunksRef = useRef([]);
  const chunkIndexRef = useRef(0);
  const readingIdRef = useRef(0);

  function speakNextChunk(readingId) {
    if (readingId !== readingIdRef.current) return;

    const text = chunksRef.current[chunkIndexRef.current];
    if (!text) {
      setReadingState("idle");
      setStatusMessage("Lecture terminée.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    const frenchVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("fr"));
    if (frenchVoice) utterance.voice = frenchVoice;
    utterance.onend = () => {
      if (readingId !== readingIdRef.current) return;
      chunkIndexRef.current += 1;
      speakNextChunk(readingId);
    };
    utterance.onerror = (event) => {
      if (readingId !== readingIdRef.current || event.error === "canceled" || event.error === "interrupted") return;
      readingIdRef.current += 1;
      setReadingState("idle");
      setStatusMessage("La lecture vocale a été interrompue.");
    };
    window.speechSynthesis.speak(utterance);
  }

  function startReading() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatusMessage("La lecture vocale n’est pas disponible dans ce navigateur.");
      return;
    }

    const text = document.querySelector("main")?.innerText.replace(/\s+/g, " ").trim();
    if (!text) {
      setStatusMessage("Aucun contenu à lire sur cette page.");
      return;
    }

    const readingId = readingIdRef.current + 1;
    readingIdRef.current = readingId;
    window.speechSynthesis.cancel();
    chunksRef.current = splitTextIntoChunks(text);
    chunkIndexRef.current = 0;
    setReadingState("reading");
    setStatusMessage("Lecture à voix haute en cours.");
    speakNextChunk(readingId);
  }

  function toggleReading() {
    if (readingState === "reading") {
      window.speechSynthesis.pause();
      setReadingState("paused");
      setStatusMessage("Lecture mise en pause.");
    } else if (readingState === "paused") {
      window.speechSynthesis.resume();
      setReadingState("reading");
      setStatusMessage("Lecture reprise.");
    } else {
      startReading();
    }
  }

  function stopReading() {
    readingIdRef.current += 1;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    window.speechSynthesis.cancel();
    setReadingState("idle");
    setStatusMessage("Lecture arrêtée.");
  }

  useEffect(() => {
    readingIdRef.current += 1;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setReadingState("idle");
    setStatusMessage("");
    return () => {
      readingIdRef.current += 1;
      chunksRef.current = [];
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [pathname]);

  return (
    <>
      <div className="read-aloud-controls">
        <button
          aria-label={readingState === "reading" ? "Mettre la lecture en pause" : readingState === "paused" ? "Reprendre la lecture" : "Écouter le contenu de la page"}
          className="read-aloud-button"
          onClick={toggleReading}
          title={readingState === "reading" ? "Mettre la lecture en pause" : readingState === "paused" ? "Reprendre la lecture" : "Écouter le contenu de la page"}
          type="button"
        >
          {readingState === "reading" ? <Pause aria-hidden="true" size={17} /> : readingState === "paused" ? <Play aria-hidden="true" size={17} /> : <Volume2 aria-hidden="true" size={17} />}
          <span>{readingState === "reading" ? "Pause" : readingState === "paused" ? "Reprendre" : "Écouter"}</span>
        </button>
        {readingState !== "idle" && (
          <button
            aria-label="Arrêter la lecture"
            className="read-aloud-stop"
            onClick={stopReading}
            title="Arrêter la lecture"
            type="button"
          >
            <Square aria-hidden="true" size={15} />
          </button>
        )}
      </div>
      <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">{statusMessage}</span>
    </>
  );
}
