export const actuCategories = [
  { id: "all", label: "Toutes", articleCategory: "Actualités" },
  { id: "regions", label: "Régions", articleCategory: "Régions" },
  { id: "france", label: "France", articleCategory: "France", matchTags: ["France"] },
  { id: "sport", label: "Sport", articleCategory: "Sport", matchTags: ["Sport", "Sports", "Football"] },
  { id: "economie", label: "Économie", articleCategory: "Économie", matchTags: ["Économie", "Entreprises", "Emploi"] },
  { id: "politique", label: "Politique", articleCategory: "Politique", matchTags: ["Politique"] },
  { id: "culture", label: "Culture", articleCategory: "Culture", matchTags: ["Culture", "Loisirs-Culture", "Évènements"] },
  { id: "societe", label: "Société", articleCategory: "Société", matchTags: ["Société"] },
  { id: "eco-conso", label: "Éco / conso", articleCategory: "Éco / conso", matchTags: ["Économie", "Consommation", "Conso", "Aides sociales"] },
];

export const actuRegions = [
  { slug: "auvergne-rhone-alpes", label: "Auvergne-Rhône-Alpes", tags: ["Auvergne-Rhône-Alpes"] },
  { slug: "bourgogne-franche-comte", label: "Bourgogne-Franche-Comté", tags: ["Bourgogne-Franche-Comté"] },
  { slug: "bretagne", label: "Bretagne", tags: ["Bretagne"] },
  { slug: "centre-val-de-loire", label: "Centre-Val de Loire", tags: ["Centre-Val de Loire"] },
  { slug: "corse", label: "Corse", tags: ["Corse"] },
  { slug: "grand-est", label: "Grand Est", tags: ["Grand Est"] },
  { slug: "hauts-de-france", label: "Hauts-de-France", tags: ["Hauts-de-France"] },
  { slug: "normandie", label: "Normandie", tags: ["Normandie"] },
  { slug: "nouvelle-aquitaine", label: "Nouvelle-Aquitaine", tags: ["Nouvelle-Aquitaine"] },
  { slug: "occitanie", label: "Occitanie", tags: ["Occitanie"] },
  { slug: "pays-de-la-loire", label: "Pays de la Loire", tags: ["Pays de la Loire"] },
  { slug: "paris-ile-de-france", label: "Paris / Île-de-France", tags: ["Île-de-France", "Paris"] },
  { slug: "provence-alpes-cote-d-azur", label: "Provence-Alpes-Côte d’Azur", tags: ["Provence-Alpes-Côte d'Azur"] },
];

export const actuRssUrl = "https://actu.fr/rss.xml";
