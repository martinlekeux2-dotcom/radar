import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const icons = ["lightbulb", "leaf", "location", "energy"];
const statuses = ["draft", "published", "archived"];

function validateQuickInfo(body) {
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const copy = typeof body.copy === "string" ? body.copy.trim() : "";
  const position = body.position === "" || body.position == null ? 0 : Number(body.position);

  if (!category || !title || !copy) {
    return { error: "La catégorie, le titre et le texte de l’info rapide sont obligatoires." };
  }
  if (!icons.includes(body.icon) || !Number.isInteger(position) || position < 0) {
    return { error: "L’icône ou la position sélectionnée n’est pas valide." };
  }
  if (!statuses.includes(body.status)) {
    return { error: "Le statut de l’info rapide n’est pas valide." };
  }

  return {
    quickInfo: {
      category,
      icon: body.icon,
      title,
      copy,
      position,
      status: body.status,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db.from("quick_infos").select("*").order("position").order("created_at", { ascending: false });
    if (error) return Response.json({ error: `Impossible de charger les infos rapides : ${error.message}` }, { status: 500 });
    return Response.json({ quickInfos: data });
  });
}

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateQuickInfo(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db.from("quick_infos").insert(validated.quickInfo).select("*").single();
    if (error) return Response.json({ error: `Impossible de créer l’info rapide : ${error.message}` }, { status: 400 });
    return Response.json({ quickInfo: data }, { status: 201 });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’info rapide est obligatoire." }, { status: 400 });
    }
    const validated = validateQuickInfo(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db
      .from("quick_infos")
      .update(validated.quickInfo)
      .eq("id", body.data.id)
      .select("*")
      .maybeSingle();
    if (error) return Response.json({ error: `Impossible de modifier l’info rapide : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cette info rapide n’existe plus." }, { status: 404 });
    return Response.json({ quickInfo: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’info rapide est obligatoire." }, { status: 400 });
    }
    const { data, error } = await db.from("quick_infos").delete().eq("id", body.data.id).select("id").maybeSingle();
    if (error) return Response.json({ error: `Impossible de supprimer l’info rapide : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cette info rapide n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
