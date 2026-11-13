import Link from "next/link";
import { connection } from "next/server";
import AboutUsSection from "../components/about-us-section";
import { getPublishedAboutUs } from "../../src/lib/public-content";

export const metadata = {
  title: "Qui sommes-nous ?",
  description: "Découvrez les personnes qui font vivre RADAR.",
};

export default async function AboutUsPage() {
  await connection();
  const aboutUs = await getPublishedAboutUs();

  if (aboutUs) {
    return (
      <main>
        <AboutUsSection aboutUs={aboutUs} standalone />
      </main>
    );
  }

  return (
    <main className="page-shell py-16">
      <p className="eyebrow">Qui sommes-nous ?</p>
      <h1 className="headline mt-2">Notre équipe arrive bientôt</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
        La présentation de l’équipe n’est pas encore publiée. Revenez bientôt pour la découvrir.
      </p>
      <Link className="mt-6 inline-flex font-bold underline" href="/">Retour à l’accueil</Link>
    </main>
  );
}
