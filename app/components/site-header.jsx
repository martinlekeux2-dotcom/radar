"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Clapperboard,
  Compass,
  Landmark,
  Menu,
  Search,
  ShoppingBasket,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { mainMenuSections } from "../../src/lib/content-config";

const sectionIcons = {
  region: Building2,
  monde: Compass,
  politique: Landmark,
  sport: Trophy,
  societe: Users,
  culture: Clapperboard,
  "eco-conso": ShoppingBasket,
};
const sections = mainMenuSections.map((section) => ({
  ...section,
  href: `/rubriques/${section.slug}`,
  Icon: sectionIcons[section.slug],
}));

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuCloseTimer = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function openMenu() {
    clearTimeout(menuCloseTimer.current);
    setMenuOpen(true);
  }

  function scheduleMenuClose() {
    menuCloseTimer.current = setTimeout(() => setMenuOpen(false), 180);
  }

  return (
    <header className="site-header">
      <div className="page-shell">
        <div className="header-top">
          <Link className="brand-link" href="/" aria-label="RADAR, accueil">
            <Image className="brand-logo" src="/radar-logo-hq.png" alt="RADAR — Capte l’info" width={504} height={339} preload unoptimized />
          </Link>
          <form action="/" className={`search-form ${searchOpen ? "is-open" : ""}`} id="site-search-form" role="search">
            <button aria-label="Lancer la recherche" type="submit"><span className="sr-only">Rechercher</span><Search size={16} /></button>
            <input aria-label="Rechercher sur RADAR" name="q" placeholder="Rechercher un sujet" ref={searchInputRef} />
          </form>
          <button
            aria-controls="site-search-form"
            aria-expanded={searchOpen}
            aria-label={searchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}
            className="mobile-search-toggle"
            onClick={() => setSearchOpen((open) => !open)}
            type="button"
          >
            {searchOpen ? <X size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
          </button>
          <div className="header-actions">
            <div
              className="menu-dropdown"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  clearTimeout(menuCloseTimer.current);
                  setMenuOpen(false);
                }
              }}
              onMouseEnter={openMenu}
              onMouseLeave={scheduleMenuClose}
            >
              <button
                aria-expanded={menuOpen}
                aria-controls="main-menu-panel"
                aria-label="Ouvrir le menu principal"
                aria-haspopup="true"
                className={menuOpen ? "menu-summary is-open" : "menu-summary"}
                onClick={openMenu}
                onFocus={openMenu}
                type="button"
              >
                <Menu size={19} /><span>Menu principal</span>
              </button>
              {menuOpen && (
                <nav className="menu-panel" id="main-menu-panel" aria-label="Menu principal" onMouseEnter={openMenu}>
                  <div className="menu-panel-links">
                    <Link href="/qui-sommes-nous">Qui sommes-nous ?</Link>
                    <Link href="mailto:radar@gmail.com">Contact</Link>
                    <Link href="#reseaux">Nous suivre</Link>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </div>
        <nav className="section-nav" aria-label="Rubriques">
          {sections.map(({ label, href, Icon }) => (
            <Link href={href} key={label}>
              <Icon className="section-nav-icon" strokeWidth={1.5} aria-hidden="true" />
              <span className="section-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
