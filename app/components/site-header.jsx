"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
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
  const menuCloseTimer = useRef(null);

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
          <form action="/" className="search-form" role="search">
            <Search size={17} aria-hidden="true" />
            <input aria-label="Rechercher sur RADAR" name="q" placeholder="rechercher un sujet" />
            <button aria-label="Lancer la recherche" type="submit"><span className="sr-only">Rechercher</span><Search size={16} /></button>
          </form>
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
          <nav className="section-nav" aria-label="Rubriques">
            {sections.map(({ label, href, Icon }) => (
              <Link href={href} key={label}>
                <Icon className="section-nav-icon" strokeWidth={1.5} aria-hidden="true" />
                <span className="section-nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
