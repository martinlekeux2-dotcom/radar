import Link from "next/link";
import Image from "next/image";

function SocialIcon({ network }) {
  const paths = {
    Facebook: <path d="M13.4 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.8-.1-1.7-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5V10H7v3h2.7v8h3.7Z" />,
    Instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" /></>,
    X: <path d="M18.9 3H22l-6.8 7.8L23.2 21h-6.3L12 14.8 6.6 21H3.5l7.3-8.4L3 3h6.4l4.4 5.8L18.9 3Zm-1.1 16h1.7L8.4 4.9H6.6L17.8 19Z" />,
    LinkedIn: <><path d="M5 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM3.5 10h3v10h-3zM9 10h2.9v1.4h.1a3.2 3.2 0 0 1 2.9-1.6c3.1 0 3.7 2 3.7 4.6V20h-3v-5c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z" /></>,
    TikTok: <path d="M16.6 3H13v12.2a2.5 2.5 0 1 1-2.5-2.5c.4 0 .7.1 1 .2V9.2a6.4 6.4 0 1 0 5.1 6.2V9.2a8.4 8.4 0 0 0 4.4 1.2V6.8a4.8 4.8 0 0 1-4.4-3.8Z" />,
  };

  if (network === "Instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">{paths[network]}</svg>;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">{paths[network]}</svg>;
}

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "X", href: "https://x.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "TikTok", href: "https://www.tiktok.com/" },
];

const legalLinks = [
  "Conditions générales d’utilisation",
  "Conditions générales de vente",
  "Mentions légales",
  "Politique de cookies",
  "Politique de protection vie privée",
  "Gérer Utiq",
];

export default function SiteFooter() {
  return (
    <footer className="site-footer text-white" id="qui-sommes-nous">
      <div className="page-shell flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between md:py-14">
        <div>
          <Link className="footer-brand" href="/" aria-label="RADAR, accueil">
            <Image className="footer-logo" src="/radar-logo-footer.png" alt="RADAR — Capte l’info" width={168} height={113} />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">L&apos;actualité en mouvement. Proche de vous, ouverte sur le monde.</p>
        </div>
        <div className="footer-social flex items-center gap-2.5" id="reseaux" aria-label="Réseaux sociaux">
          {socialLinks.map(({ label, href }) => (
            <a aria-label={label} href={href} key={label} rel="noreferrer" target="_blank">
              <SocialIcon network={label} />
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="page-shell flex flex-col gap-4 py-5 text-[11px] leading-5 text-white/55 md:flex-row md:items-center md:justify-between">
          <p className="footer-copyright shrink-0">© RADAR - 2026</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Liens légaux">
            {legalLinks.map((label) => <a className="hover:text-white" href="#mentions-legales" key={label}>{label}</a>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
