import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const maximumNoteLength = 20000;

export async function GET(request) {
  return withAdmin(request, async ({ db, user }) => {
    const { data, error } = await db
      .from("admin_notes")
      .select("content, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: `Impossible de charger le bloc-notes : ${error.message}` }, { status: 500 });
    }
    return Response.json({
      note: {
        content: data?.content ?? "",
        updatedAt: data?.updated_at ?? null,
      },
    });
  });
}

export async function PUT(request) {
  return withAdmin(request, async ({ db, user }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return Response.json({ error: "Le corps de la requête est invalide." }, { status: 400 });
    }

    const content = typeof body.data.content === "string" ? body.data.content : null;
    if (content === null) {
      return Response.json({ error: "Le contenu de la note doit être du texte." }, { status: 400 });
    }
    if (content.length > maximumNoteLength) {
      return Response.json({ error: "La note dépasse la limite de 20 000 caractères." }, { status: 413 });
    }

    const { data, error } = await db
      .from("admin_notes")
      .upsert(
        { user_id: user.id, content, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      .select("content, updated_at")
      .single();

    if (error) {
      return Response.json({ error: `Impossible d’enregistrer le bloc-notes : ${error.message}` }, { status: 500 });
    }
    return Response.json({
      note: {
        content: data.content,
        updatedAt: data.updated_at,
      },
    });
  });
}
