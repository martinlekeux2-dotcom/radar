import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl } from "../../../../src/lib/content-config";

const videoStatuses = ["draft", "published", "archived"];

function validateVideo(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : "";
  const featuredPosition = body.featured_position === "" || body.featured_position == null
    ? null
    : Number(body.featured_position);
  const duration = body.duration_seconds === "" || body.duration_seconds == null
    ? null
    : Number(body.duration_seconds);

  if (!title || !slug || !videoUrl) {
    return { error: "Le titre, le slug et le fichier vidéo sont obligatoires." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets." };
  }
  if (!isHttpUrl(videoUrl)) {
    return { error: "L’adresse de la vidéo doit être une URL HTTP ou HTTPS valide." };
  }
  const thumbnailUrl = typeof body.thumbnail_url === "string" ? body.thumbnail_url.trim() : "";
  if (thumbnailUrl && !isHttpUrl(thumbnailUrl)) {
    return { error: "L’image miniature doit utiliser une URL HTTP ou HTTPS valide." };
  }
  if (featuredPosition !== null && ![1, 2, 3].includes(featuredPosition)) {
    return { error: "La position mise en avant doit être 1, 2 ou 3." };
  }
  if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
    return { error: "La durée doit être un nombre de secondes positif." };
  }
  if (!videoStatuses.includes(body.status)) {
    return { error: "Le statut de la vidéo n’est pas valide." };
  }

  return {
    video: {
      title,
      slug,
      video_url: videoUrl,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      thumbnail_url: thumbnailUrl || null,
      duration_seconds: duration,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
      featured_position: featuredPosition,
      status: body.status,
      published_at: body.status === "published"
        ? (typeof body.published_at === "string" && body.published_at
          ? body.published_at
          : new Date().toISOString())
        : null,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db.from("videos").select("*").order("updated_at", { ascending: false });
    if (error) return Response.json({ error: `Impossible de charger les vidéos : ${error.message}` }, { status: 500 });
    return Response.json({ videos: data });
  });
}

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateVideo(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const featuredPosition = validated.video.featured_position;
    const video = {
      ...validated.video,
      featured_position: validated.video.status === "published" ? null : featuredPosition,
    };
    const { data, error } = await db.from("videos").insert(video).select("*").single();
    if (error) return Response.json({ error: `Impossible de créer la vidéo : ${error.message}` }, { status: 400 });
    if (featuredPosition !== null && validated.video.status === "published") {
      const { error: featuredError } = await db.rpc("set_home_featured_video", {
        target_video_id: data.id,
        target_position: featuredPosition,
      });
      if (featuredError) {
        return Response.json({ error: `La vidéo a été créée, mais sa mise en avant a échoué : ${featuredError.message}` }, { status: 500 });
      }
      data.featured_position = featuredPosition;
    }
    return Response.json({ video: data }, { status: 201 });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de la vidéo est obligatoire." }, { status: 400 });
    }
    const validated = validateVideo(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const featuredPosition = validated.video.featured_position;
    const video = {
      ...validated.video,
      featured_position: validated.video.status === "published" ? null : featuredPosition,
    };
    const { data, error } = await db
      .from("videos")
      .update(video)
      .eq("id", body.data.id)
      .select("*")
      .maybeSingle();
    if (error) return Response.json({ error: `Impossible de modifier la vidéo : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cette vidéo n’existe plus." }, { status: 404 });
    if (featuredPosition !== null && validated.video.status === "published") {
      const { error: featuredError } = await db.rpc("set_home_featured_video", {
        target_video_id: data.id,
        target_position: featuredPosition,
      });
      if (featuredError) {
        return Response.json({ error: `La vidéo a été modifiée, mais sa mise en avant a échoué : ${featuredError.message}` }, { status: 500 });
      }
      data.featured_position = featuredPosition;
    }
    return Response.json({ video: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de la vidéo est obligatoire." }, { status: 400 });
    }
    const { data, error } = await db.from("videos").delete().eq("id", body.data.id).select("id").maybeSingle();
    if (error) return Response.json({ error: `Impossible de supprimer la vidéo : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cette vidéo n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
