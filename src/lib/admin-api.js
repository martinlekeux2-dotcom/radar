import "server-only";

import { createClient } from "@supabase/supabase-js";

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function withAdmin(request, handler, { adminOnly = false } = {}) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonError("Connectez-vous pour accéder à cet espace.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return jsonError(
      "Supabase n’est pas complètement configuré. Vérifiez les variables d’environnement du serveur.",
      503,
    );
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonError("Votre session a expiré. Reconnectez-vous.", 401);
  }

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: membership, error: membershipError } = await db
    .from("admin_users")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (membershipError) {
    return jsonError(`Impossible de vérifier vos droits : ${membershipError.message}`, 500);
  }
  if (!membership || (adminOnly && membership.role !== "admin")) {
    return jsonError("Vous n’avez pas les droits nécessaires pour cette action.", 403);
  }

  return handler({ db, user: authData.user, role: membership.role });
}

export async function readJson(request) {
  try {
    return { data: await request.json() };
  } catch {
    return { error: jsonError("Le corps de la requête doit être un JSON valide.", 400) };
  }
}
