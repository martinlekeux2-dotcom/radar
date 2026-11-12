import "./globals.css";
import SiteShell from "./components/site-shell";

export const metadata = {
  title: {
    default: "RADAR — L'actualité en mouvement",
    template: "%s — RADAR",
  },
  description:
    "L'actualité de votre région et du monde, en direct, en vidéo et en contexte.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
