import { randomUUID } from "node:crypto";
import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const bucket = "radar-media";
const maximumVideoSize = 1024 * 1024 * 1024;
const maximumImageSize = 20 * 1024 * 1024;
const allowedMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
];
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
      return Response.json({
        error: kind === "video"
          ? "Format vidéo non autorisé ou fichier supérieur à 1 Go."
          : "Format d’image non autorisé ou fichier supérieur à 20 Mo.",
      }, { status: 400 });
    }

    const path = `${kind}/${randomUUID()}.${extension}`;
    const storage = db.storage;
    const { error: bucketError } = await storage.getBucket(bucket);
    if (bucketError?.status === 404) {
      const { error: createError } = await storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: maximumVideoSize,
        allowedMimeTypes,
      });
      if (createError && createError.status !== 409) {
        return Response.json({
          error: `Impossible de préparer le stockage des fichiers : ${createError.message}`,
        }, { status: 500 });
      }
    } else if (bucketError) {
      return Response.json({
        error: `Impossible de vérifier le stockage des fichiers : ${bucketError.message}`,
      }, { status: 500 });
    }

    const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return Response.json({
        error: `Impossible de préparer l’envoi du fichier : ${error?.message ?? "Supabase n’a pas fourni de jeton d’envoi."}`,
      }, { status: 500 });
    }
    return Response.json({ bucket, path, token: data.token });
  });
}
