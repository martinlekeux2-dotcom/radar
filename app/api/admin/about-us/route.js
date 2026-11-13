import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl } from "../../../../src/lib/content-config";

const aboutPhotoFields = [
  { firstName: "first_name_1", text: "text_1", url: "photo_1_url", alt: "photo_1_alt" },
  { firstName: "first_name_2", text: "text_2", url: "photo_2_url", alt: "photo_2_alt" },
  { firstName: "first_name_3", text: "text_3", url: "photo_3_url", alt: "photo_3_alt" },
  { firstName: "first_name_4", text: "text_4", url: "photo_4_url", alt: "photo_4_alt" },
];

const emptyAboutUs = {
  title: "",
  first_name_1: "",
  photo_1_url: "",
  photo_1_alt: "",
  text_1: "",
  first_name_2: "",
  photo_2_url: "",
  photo_2_alt: "",
  text_2: "",
  first_name_3: "",
  photo_3_url: "",
  photo_3_alt: "",
  text_3: "",
  first_name_4: "",
  photo_4_url: "",
  photo_4_alt: "",
  text_4: "",
  is_published: false,
};

function validateAboutUs(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const isPublished = body.is_published;

  if (typeof isPublished !== "boolean") {
    return { error: "Le choix de publication de la section « Qui sommes-nous ? » n’est pas valide." };
  }
  if (title.length > 120) {
    return { error: "Le titre de la section est trop long." };
  }

  const aboutUs = {
    id: 1,
    title,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };

  for (const field of aboutPhotoFields) {
    const firstName = typeof body[field.firstName] === "string" ? body[field.firstName].trim() : "";
    const text = typeof body[field.text] === "string" ? body[field.text].trim() : "";
    const url = typeof body[field.url] === "string" ? body[field.url].trim() : "";
    const alt = typeof body[field.alt] === "string" ? body[field.alt].trim() : "";
    if (firstName.length > 80 || text.length > 1200 || url.length > 2048 || alt.length > 160) {
      return { error: "Le prénom, le texte ou les informations d’une photo dépassent la longueur autorisée." };
    }
    if (url && !isHttpUrl(url)) {
      return { error: "Chaque photo doit utiliser une URL HTTP ou HTTPS valide." };
    }
    aboutUs[field.firstName] = firstName;
    aboutUs[field.text] = text;
    aboutUs[field.url] = url;
    aboutUs[field.alt] = alt;
  }

  if (isPublished && (
    !title
    || aboutPhotoFields.some(({ firstName, text, url }) => !aboutUs[firstName] || !aboutUs[text] || !aboutUs[url])
  )) {
    return { error: "Pour publier la section, renseignez le titre, les quatre prénoms, les quatre photos et leur texte." };
  }

  return { aboutUs };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db
      .from("about_us")
      .select("title, first_name_1, photo_1_url, photo_1_alt, text_1, first_name_2, photo_2_url, photo_2_alt, text_2, first_name_3, photo_3_url, photo_3_alt, text_3, first_name_4, photo_4_url, photo_4_alt, text_4, is_published")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return Response.json({ error: `Impossible de charger la section « Qui sommes-nous ? » : ${error.message}` }, { status: 500 });
    }
    return Response.json({ aboutUs: data ?? emptyAboutUs });
  });
}

export async function PUT(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateAboutUs(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db
      .from("about_us")
      .upsert(validated.aboutUs)
      .select("title, first_name_1, photo_1_url, photo_1_alt, text_1, first_name_2, photo_2_url, photo_2_alt, text_2, first_name_3, photo_3_url, photo_3_alt, text_3, first_name_4, photo_4_url, photo_4_alt, text_4, is_published")
      .single();

    if (error) {
      return Response.json({ error: `Impossible d’enregistrer la section « Qui sommes-nous ? » : ${error.message}` }, { status: 500 });
    }
    return Response.json({ aboutUs: data });
  });
}
