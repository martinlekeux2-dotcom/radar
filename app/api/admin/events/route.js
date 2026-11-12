import { readJson, withAdmin } from "../../../../src/lib/admin-api";
import { isHttpUrl } from "../../../../src/lib/content-config";

const eventStatuses = ["draft", "published", "cancelled"];

function validateEvent(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const startsAt = typeof body.starts_at === "string" ? body.starts_at : "";
  const endsAt = typeof body.ends_at === "string" && body.ends_at ? body.ends_at : null;
  const ticketUrl = typeof body.ticket_url === "string" ? body.ticket_url.trim() : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const startTime = Date.parse(startsAt);
  const endTime = endsAt ? Date.parse(endsAt) : null;

  if (!title || !slug || !startsAt || !Number.isFinite(startTime)) {
    return { error: "Le titre, le slug et une date de début valide sont obligatoires." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets." };
  }
  if (endsAt && (!Number.isFinite(endTime) || endTime < startTime)) {
    return { error: "La date de fin doit être valide et postérieure au début." };
  }
  if ((ticketUrl && !isHttpUrl(ticketUrl)) || (imageUrl && !isHttpUrl(imageUrl))) {
    return { error: "Les liens de billetterie et d’image doivent utiliser HTTP ou HTTPS." };
  }
  if (!eventStatuses.includes(body.status)) {
    return { error: "Le statut de l’événement n’est pas valide." };
  }

  return {
    event: {
      title,
      slug,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
      venue: typeof body.venue === "string" ? body.venue.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      starts_at: new Date(startTime).toISOString(),
      ends_at: endTime === null ? null : new Date(endTime).toISOString(),
      ticket_url: ticketUrl || null,
      image_url: imageUrl || null,
      status: body.status,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const { data, error } = await db.from("events").select("*").order("starts_at", { ascending: true });
    if (error) return Response.json({ error: `Impossible de charger les événements : ${error.message}` }, { status: 500 });
    return Response.json({ events: data });
  });
}

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const validated = validateEvent(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db.from("events").insert(validated.event).select("*").single();
    if (error) return Response.json({ error: `Impossible de créer l’événement : ${error.message}` }, { status: 400 });
    return Response.json({ event: data }, { status: 201 });
  });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’événement est obligatoire." }, { status: 400 });
    }
    const validated = validateEvent(body.data);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const { data, error } = await db
      .from("events")
      .update(validated.event)
      .eq("id", body.data.id)
      .select("*")
      .maybeSingle();
    if (error) return Response.json({ error: `Impossible de modifier l’événement : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cet événement n’existe plus." }, { status: 404 });
    return Response.json({ event: data });
  });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    if (typeof body.data.id !== "string") {
      return Response.json({ error: "L’identifiant de l’événement est obligatoire." }, { status: 400 });
    }
    const { data, error } = await db.from("events").delete().eq("id", body.data.id).select("id").maybeSingle();
    if (error) return Response.json({ error: `Impossible de supprimer l’événement : ${error.message}` }, { status: 400 });
    if (!data) return Response.json({ error: "Cet événement n’existe plus." }, { status: 404 });
    return Response.json({ success: true });
  });
}
