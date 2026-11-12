"use client";

import { useState } from "react";
import { ArrowRight, Lightbulb, Leaf, MapPin, Zap } from "lucide-react";

const icons = {
  lightbulb: Lightbulb,
  leaf: Leaf,
  location: MapPin,
  energy: Zap,
};

export default function QuickInfoStack({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const remainingItems = items.slice(currentIndex);
  const ActiveIcon = icons[remainingItems[0]?.icon] ?? Lightbulb;

  function dismissCard() {
    if (!isDismissing) setIsDismissing(true);
  }

  function advanceStack(event) {
    if (event.propertyName !== "transform" || !isDismissing) return;
    setCurrentIndex((index) => index + 1);
    setIsDismissing(false);
  }

  return (
    <section className="quick-info-section" aria-labelledby="quick-info-title">
      <div className="quick-info-heading">
        <div>
          <p className="eyebrow">À lire en un clin d’œil</p>
          <h2 className="section-title" id="quick-info-title">Infos rapides</h2>
        </div>
        <span className="quick-info-counter">
          {remainingItems.length ? `${currentIndex + 1} / ${items.length}` : "Terminé"}
        </span>
      </div>
      <div className="quick-info-stack" aria-live="polite">
        {remainingItems.length ? (
          <>
            {remainingItems.slice(1, 3).reverse().map((item, index) => (
              <div
                className="quick-info-card quick-info-card-back"
                key={item.title}
                style={{ "--card-depth": index + 1 }}
                aria-hidden="true"
              />
            ))}
            <button
              className={`quick-info-card quick-info-card-front${isDismissing ? " is-dismissing" : ""}`}
              onClick={dismissCard}
              onTransitionEnd={advanceStack}
              type="button"
              aria-label={`Passer cette information : ${remainingItems[0].title}`}
            >
              <span className="quick-info-card-topline">
                <ActiveIcon size={20} aria-hidden="true" />
                <span>{remainingItems[0].category}</span>
              </span>
              <span className="quick-info-card-title">{remainingItems[0].title}</span>
              <span className="quick-info-card-copy">{remainingItems[0].copy}</span>
              <span className="quick-info-card-action">Suivant <ArrowRight size={15} aria-hidden="true" /></span>
              <span className="quick-info-card-dismiss">Touchez pour passer</span>
            </button>
          </>
        ) : (
          <div className="quick-info-empty">
            <p>Vous êtes à jour !</p>
            <button onClick={() => setCurrentIndex(0)} type="button">Revoir les infos</button>
          </div>
        )}
      </div>
    </section>
  );
}
