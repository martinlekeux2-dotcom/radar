import "server-only";

import { createHash } from "node:crypto";
import { actuCategories, actuRegions, actuRssUrl } from "./actu-rss-config";

const maximumResponseLength = 5000000;
const maximumDescriptionLength = 1200;

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
    if (code[0] === "#") {
      const codePoint = code[1].toLowerCase() === "x"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }

    return {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: "\"",
      apos: "'",
      nbsp: " ",
    }[code.toLowerCase()] ?? entity;
  });
}

function plainText(value) {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\s*br\s*\/?>|<\/p\s*>|<\/div\s*>|<\/li\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function readElement(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}\\s*>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function normalizeSourceUrl(value) {
  try {
    const url = new URL(decodeEntities(value));
    if (url.protocol !== "https:" || !["actu.fr", "www.actu.fr"].includes(url.hostname)) return "";
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchFeed() {
  let response;
  try {
    response = await fetch(actuRssUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, text/html",
        "User-Agent": "RADAR RSS reader",
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Le flux Actu.fr ne répond pas. Réessayez dans quelques instants.");
    }
    throw new Error("Impossible de joindre le flux Actu.fr.");
  }

  if (!response.ok) {
    throw new Error(`Le flux Actu.fr a répondu avec le statut ${response.status}.`);
  }

  const text = await response.text();
  if (text.length > maximumResponseLength) {
    throw new Error("La réponse du flux Actu.fr dépasse la taille autorisée.");
  }
  return text;
}

function normalizeTag(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFeedItem(itemXml) {
  const title = plainText(readElement(itemXml, "title"));
  const link = normalizeSourceUrl(readElement(itemXml, "link"));
  if (!title || !link) return null;

  const sourceCategories = [...itemXml.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
    .map(([, category]) => plainText(category))
    .filter(Boolean);

  return {
    title,
    link,
    description: plainText(readElement(itemXml, "description")).slice(0, maximumDescriptionLength),
    publishedAt: plainText(readElement(itemXml, "pubDate")),
    author: plainText(readElement(itemXml, "dc:creator") || readElement(itemXml, "author")),
    sourceCategories,
  };
}

function parseActuFeed(xml) {
  const seenLinks = new Set();
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
    .map(([, item]) => parseFeedItem(item))
    .filter((item) => {
      if (!item || seenLinks.has(item.link)) return false;
      seenLinks.add(item.link);
      return true;
    });

  if (!items.length) {
    throw new Error("Le flux Actu.fr ne contient aucun article exploitable.");
  }
  return items;
}

function matchesCategory(item, category, region) {
  const itemTags = new Set(item.sourceCategories.map(normalizeTag));
  if (category.id === "all") return true;

  const requestedTags = category.id === "regions"
    ? region.tags
    : category.matchTags ?? [];
  return requestedTags.some((tag) => itemTags.has(normalizeTag(tag)));
}

export async function fetchActuArticles(categoryId, regionSlug) {
  const category = actuCategories.find(({ id }) => id === categoryId);
  if (!category) throw new Error("Cette rubrique Actu.fr n’existe pas.");

  const region = categoryId === "regions"
    ? actuRegions.find(({ slug }) => slug === regionSlug)
    : null;
  if (categoryId === "regions" && !region) throw new Error("Cette région n’existe pas.");

  const allItems = parseActuFeed(await fetchFeed());
  const items = allItems
    .filter((item) => matchesCategory(item, category, region))
    .map((item) => ({
      ...item,
      categoryId,
      categoryLabel: region?.label ?? category.label,
      articleCategory: category.articleCategory,
      sourceName: "Actu.fr",
      regionSlug: region?.slug,
      regionLabel: region?.label,
    }))
    .slice(0, 30);

  if (!items.length) {
    throw new Error(`Le flux Actu.fr ne contient aucun article pour « ${region?.label ?? category.label} ».`);
  }
  return items;
}

export function actuSourceHashForArticle(article) {
  return createHash("sha256").update(article.link).digest("hex").slice(0, 10);
}

export function slugForActuArticle(article, slugSeed = article.title) {
  const titleSlug = slugSeed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "article";
  return `actu-${titleSlug}-${actuSourceHashForArticle(article)}`;
}

export function formatActuAttribution(article) {
  const publishedAt = new Date(article.publishedAt);
  const date = article.publishedAt && !Number.isNaN(publishedAt.getTime())
    ? `, publié le ${publishedAt.toLocaleDateString("fr-FR")}`
    : "";
  const category = article.regionLabel || article.categoryLabel;
  const author = article.author ? `, ${article.author}` : "";
  return `Source : Actu.fr${author}, rubrique ${category}, « ${article.title} »${date} (${article.link}). Article original rédigé uniquement à partir du titre et du résumé RSS ; le texte complet de la source n’a pas été repris.`;
}
