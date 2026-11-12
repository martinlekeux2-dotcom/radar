export const mainMenuSections = [
  { label: "Région", slug: "region" },
  { label: "Monde", slug: "monde" },
  { label: "Politique", slug: "politique" },
  { label: "Sport", slug: "sport" },
  { label: "Société", slug: "societe" },
  { label: "Culture", slug: "culture" },
  { label: "Éco/Conso", slug: "eco-conso" },
];

export const quickInfoIcons = [
  { value: "lightbulb", label: "Idée" },
  { value: "leaf", label: "Environnement" },
  { value: "location", label: "Lieu" },
  { value: "energy", label: "Énergie" },
];

export function slugifyContent(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
