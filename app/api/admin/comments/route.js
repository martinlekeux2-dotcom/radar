import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const commentStatuses = ["pending", "approved", "rejected"];

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db
      .from("comments")
      .select("id, author_name, author_email, content, status, created_at, article_id, articles(title)")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: `Impossible de charger les commentaires : ${error.message}` }, { status: 500 });
    }
    return Response.json({ comments: data });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const { id, status } = body.data;
    if (typeof id !== "string" || !commentStatuses.includes(status)) {
      return Response.json({ error: "Commentaire ou statut invalide." }, { status: 400 });
    }

    const { data, error } = await db
      .from("comments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status")
      .maybeSingle();
    if (error) {
      return Response.json({ error: `Impossible de modérer le commentaire : ${error.message}` }, { status: 400 });
    }
    if (!data) return Response.json({ error: "Ce commentaire n’existe plus." }, { status: 404 });
    return Response.json({ comment: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant du commentaire est obligatoire." }, { status: 400 });
    }

    const { data, error } = await db
      .from("comments")
      .delete()
      .eq("id", body.data.id)
      .select("id")
      .maybeSingle();
    if (error) {
      return Response.json({ error: `Impossible de supprimer le commentaire : ${error.message}` }, { status: 400 });
    }
    if (!data) return Response.json({ error: "Ce commentaire n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
