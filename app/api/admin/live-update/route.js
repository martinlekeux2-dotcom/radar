import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl } from "../../../../src/lib/content-config";

const emptyLiveUpdate = {
  title: "",
  copy: "",
  link_url: "",
  link_label: "Suivre l’actualité",
  is_published: false,
};

function validateLiveUpdate(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const copy = typeof body.copy === "string" ? body.copy.trim() : "";
  const linkUrl = typeof body.link_url === "string" ? body.link_url.trim() : "";
  const linkLabel = typeof body.link_label === "string" ? body.link_label.trim() : "";
  const isPublished = body.is_published;

  if (typeof isPublished !== "boolean") {
    return { error: "Le choix de publication de l’information « En direct » n’est pas valide." };
  }
  if (isPublished && (!title || !copy)) {
    return { error: "Un titre et un texte sont nécessaires pour publier l’information « En direct »." };
  }
  if (title.length > 120 || copy.length > 600 || linkUrl.length > 2048 || linkLabel.length > 50) {
    return { error: "L’information « En direct » dépasse la longueur autorisée." };
  }
  if (linkUrl && !isHttpUrl(linkUrl)) {
    return { error: "Le lien doit utiliser une URL HTTP ou HTTPS valide." };
  }

  return {
    liveUpdate: {
      id: 1,
      title,
      copy,
      link_url: linkUrl || null,
      link_label: linkLabel || "Suivre l’actualité",
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db
      .from("live_update")
      .select("title, copy, link_url, link_label, is_published")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return Response.json({ error: `Impossible de charger l’information « En direct » : ${error.message}` }, { status: 500 });
    }
    return Response.json({ liveUpdate: data ?? emptyLiveUpdate });
  });
}

export async function PUT(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateLiveUpdate(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db
      .from("live_update")
      .upsert(validated.liveUpdate)
      .select("title, copy, link_url, link_label, is_published")
      .single();

    if (error) {
      return Response.json({ error: `Impossible d’enregistrer l’information « En direct » : ${error.message}` }, { status: 500 });
    }
    return Response.json({ liveUpdate: data });
  });
}
