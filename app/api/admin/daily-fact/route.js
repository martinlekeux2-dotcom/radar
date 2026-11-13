import { readJson, withAdmin } from "../../../../src/lib/admin-api";

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db
      .from("daily_fact")
      .select("value, suffix, description")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return Response.json({ error: `Impossible de charger le chiffre du jour : ${error.message}` }, { status: 500 });
    }
    return Response.json({ dailyFact: data ?? { value: "", suffix: "", description: "" } });
  });
}

export async function PUT(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;

    const value = typeof body.data.value === "string" ? body.data.value.trim() : "";
    const suffix = typeof body.data.suffix === "string" ? body.data.suffix.trim() : "";
    const description = typeof body.data.description === "string" ? body.data.description.trim() : "";
    if (!value || !description || value.length > 60 || suffix.length > 60 || description.length > 240) {
      return Response.json({ error: "Renseignez le chiffre et son texte (60 caractères maximum pour le chiffre et l’unité, 240 pour le texte)." }, { status: 400 });
    }

    const { data, error } = await db
      .from("daily_fact")
      .upsert({ id: 1, value, suffix, description, updated_at: new Date().toISOString() })
      .select("value, suffix, description")
      .single();

    if (error) {
      return Response.json({ error: `Impossible d’enregistrer le chiffre du jour : ${error.message}` }, { status: 500 });
    }
    return Response.json({ dailyFact: data });
  });
}
