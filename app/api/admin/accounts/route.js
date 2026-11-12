import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const accountRoles = ["admin", "editor"];

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const [{ data: memberships, error: membershipError }, { data: usersData, error: usersError }] =
      await Promise.all([
        db.from("admin_users").select("user_id, role, created_at").order("created_at"),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

    if (membershipError || usersError) {
      const error = membershipError ?? usersError;
      return Response.json({ error: `Impossible de charger les comptes : ${error.message}` }, { status: 500 });
    }

    const usersById = new Map(usersData.users.map((user) => [user.id, user]));
    const accounts = memberships.map(({ user_id, role, created_at }) => {
      const user = usersById.get(user_id);
      return {
        id: user_id,
        email: user?.email ?? "Adresse inconnue",
        role,
        createdAt: created_at,
        lastSignInAt: user?.last_sign_in_at ?? null,
        confirmed: Boolean(user?.email_confirmed_at),
      };
    });

    return Response.json({ accounts });
  }, { adminOnly: true });
}

export async function POST(request) {
  return withAdmin(request, async ({ db }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const email = typeof body.data.email === "string" ? body.data.email.trim().toLowerCase() : "";
    const role = body.data.role;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Saisissez une adresse e-mail valide." }, { status: 400 });
    }
    if (!accountRoles.includes(role)) {
      return Response.json({ error: "Le rôle sélectionné n’est pas valide." }, { status: 400 });
    }

    const { data: invitation, error: invitationError } = await db.auth.admin.inviteUserByEmail(email);
    if (invitationError || !invitation.user) {
      return Response.json({
        error: `Impossible d’inviter ce compte : ${invitationError?.message ?? "Supabase n’a pas renvoyé le compte créé."}`,
      }, { status: 400 });
    }

    const { error: membershipError } = await db
      .from("admin_users")
      .insert({ user_id: invitation.user.id, role });
    if (membershipError) {
      const { error: cleanupError } = await db.auth.admin.deleteUser(invitation.user.id);
      const cleanupMessage = cleanupError
        ? ` Le compte invité n’a pas pu être supprimé automatiquement : ${cleanupError.message}`
        : " L’invitation a été annulée.";
      return Response.json({
        error: `L’invitation a été envoyée, mais l’accès admin n’a pas pu être configuré : ${membershipError.message}.${cleanupMessage}`,
      }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 201 });
  }, { adminOnly: true });
}

export async function PATCH(request) {
  return withAdmin(request, async ({ db, user }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const { id, role } = body.data;
    if (typeof id !== "string" || !accountRoles.includes(role)) {
      return Response.json({ error: "Compte ou rôle invalide." }, { status: 400 });
    }
    if (id === user.id) {
      return Response.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 400 });
    }

    const { data: target, error: targetError } = await db
      .from("admin_users")
      .select("user_id, role")
      .eq("user_id", id)
      .maybeSingle();
    if (targetError) {
      return Response.json({ error: `Impossible de vérifier le compte : ${targetError.message}` }, { status: 500 });
    }
    if (!target) return Response.json({ error: "Ce compte n’existe plus." }, { status: 404 });

    if (target.role === "admin" && role !== "admin") {
      const { count, error: countError } = await db
        .from("admin_users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) {
        return Response.json({ error: `Impossible de vérifier les administrateurs : ${countError.message}` }, { status: 500 });
      }
      if ((count ?? 0) <= 1) {
        return Response.json({ error: "Le dernier compte administrateur ne peut pas être rétrogradé." }, { status: 409 });
      }
    }

    const { error } = await db.from("admin_users").update({ role }).eq("user_id", id);
    if (error) {
      return Response.json({ error: `Impossible de modifier le rôle : ${error.message}` }, { status: 400 });
    }
    return Response.json({ success: true });
  }, { adminOnly: true });
}

export async function DELETE(request) {
  return withAdmin(request, async ({ db, user }) => {
    const body = await readJson(request);
    if (body.error) return body.error;
    const id = body.data.id;
    if (typeof id !== "string") {
      return Response.json({ error: "L’identifiant du compte est obligatoire." }, { status: 400 });
    }
    if (id === user.id) {
      return Response.json({ error: "Vous ne pouvez pas supprimer votre propre compte depuis cet espace." }, { status: 400 });
    }

    const { data: target, error: targetError } = await db
      .from("admin_users")
      .select("user_id, role")
      .eq("user_id", id)
      .maybeSingle();
    if (targetError) {
      return Response.json({ error: `Impossible de vérifier le compte : ${targetError.message}` }, { status: 500 });
    }
    if (!target) return Response.json({ error: "Ce compte n’existe plus." }, { status: 404 });

    if (target.role === "admin") {
      const { count, error: countError } = await db
        .from("admin_users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) {
        return Response.json({ error: `Impossible de vérifier les administrateurs : ${countError.message}` }, { status: 500 });
      }
      if ((count ?? 0) <= 1) {
        return Response.json({ error: "Le dernier compte administrateur ne peut pas être supprimé." }, { status: 409 });
      }
    }

    const { error } = await db.auth.admin.deleteUser(id);
    if (error) {
      return Response.json({ error: `Impossible de supprimer le compte : ${error.message}` }, { status: 400 });
    }
    return Response.json({ success: true });
  }, { adminOnly: true });
}
