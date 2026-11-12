import { randomUUID } from "node:crypto";
import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const bucket = "radar-media";
const maximumVideoSize = 100 * 1024 * 1024;
const maximumImageSize = 8 * 1024 * 1024;
const mediaTypes = {
  video: {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  },
  image: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  },
};

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;

    const { kind, mimeType, size } = body.data;
    const extension = mediaTypes[kind]?.[mimeType];
    const maximumSize = kind === "video" ? maximumVideoSize : maximumImageSize;
    if (!extension || !Number.isInteger(size) || size <= 0 || size > maximumSize) {
      return Response.json({ error: "Format ou taille de fichier non autorisé." }, { status: 400 });
    }

    const path = `${kind}/${randomUUID()}.${extension}`;
    const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return Response.json({
        error: `Impossible de préparer l’envoi du fichier : ${error?.message ?? "Supabase n’a pas fourni de jeton d’envoi."}`,
      }, { status: 500 });
    }
    return Response.json({ bucket, path, token: data.token });
  });
}
