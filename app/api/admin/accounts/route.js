import { readJson, withAdmin } from "../../../../src/lib/admin-api";

const accountRoles = ["admin", "editor"];

async function getAdminCount(db) {
  const { count, error } = await db
    .from("admin_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  return error ? { error } : { count: count ?? 0 };
}

async function getAllAuthUsers(db) {
  const perPage = 1000;
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) return { error };

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) return { users };
  }
}

export async function GET(request) {
  return withAdmin(request, async ({ db }) => {
    const [{ data: memberships, error: membershipError }, authUsersResult] =
      await Promise.all([
        db.from("admin_users").select("user_id, role, created_at").order("created_at"),
        getAllAuthUsers(db),
      ]);

    if (membershipError || authUsersResult.error) {
      const error = membershipError ?? authUsersResult.error;
      return Response.json({ error: `Impossible de charger les comptes : ${error.message}` }, { status: 500 });
    }

    const membershipsById = new Map(memberships.map((membership) => [membership.user_id, membership]));
    const accounts = authUsersResult.users.map((user) => {
      const membership = membershipsById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: membership?.role ?? null,
        createdAt: user.created_at ?? membership?.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        confirmed: user.email
          ? Boolean(user.email_confirmed_at)
          : Boolean(user.phone_confirmed_at),
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
      return Response.json({
        error: `L’invitation a été envoyée, mais l’accès admin n’a pas pu être configuré : ${membershipError.message}. Le compte reste dans Supabase Auth sans accès au site.`,
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
    if (typeof id !== "string" || ![...accountRoles, "none"].includes(role)) {
      return Response.json({ error: "Compte ou rôle invalide." }, { status: 400 });
    }
    if (id === user.id) {
      return Response.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 400 });
    }

    const { data: authUserData, error: authUserError } = await db.auth.admin.getUserById(id);
    if (authUserError) {
      const status = authUserError.status === 404 ? 404 : 500;
      const message = status === 404
        ? "Ce compte Supabase Auth n’existe plus."
        : `Impossible de vérifier le compte : ${authUserError.message}`;
      return Response.json({ error: message }, { status });
    }
    if (!authUserData.user) {
      return Response.json({ error: "Ce compte Supabase Auth n’existe plus." }, { status: 404 });
    }

    const { data: target, error: targetError } = await db
      .from("admin_users")
      .select("user_id, role")
      .eq("user_id", id)
      .maybeSingle();
    if (targetError) {
      return Response.json({ error: `Impossible de vérifier le compte : ${targetError.message}` }, { status: 500 });
    }

    if (target?.role === "admin" && role !== "admin") {
      const adminCount = await getAdminCount(db);
      if (adminCount.error) {
        return Response.json({ error: `Impossible de vérifier les administrateurs : ${adminCount.error.message}` }, { status: 500 });
      }
      if (adminCount.count <= 1) {
        return Response.json({ error: "Le dernier compte administrateur ne peut pas être rétrogradé." }, { status: 409 });
      }
    }

    if (role === "none") {
      if (!target) return Response.json({ success: true });

      const { error } = await db.from("admin_users").delete().eq("user_id", id);
      if (error) {
        return Response.json({ error: `Impossible de retirer l’accès admin : ${error.message}` }, { status: 400 });
      }
      return Response.json({ success: true });
    }

    const { error } = await db
      .from("admin_users")
      .upsert({ user_id: id, role }, { onConflict: "user_id" });
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

    const { data: authUserData, error: authUserError } = await db.auth.admin.getUserById(id);
    if (authUserError) {
      const status = authUserError.status === 404 ? 404 : 500;
      const message = status === 404
        ? "Ce compte Supabase Auth n’existe plus."
        : `Impossible de vérifier le compte : ${authUserError.message}`;
      return Response.json({ error: message }, { status });
    }
    if (!authUserData.user) {
      return Response.json({ error: "Ce compte Supabase Auth n’existe plus." }, { status: 404 });
    }

    const { data: target, error: targetError } = await db
      .from("admin_users")
      .select("user_id, role")
      .eq("user_id", id)
      .maybeSingle();
    if (targetError) {
      return Response.json({ error: `Impossible de vérifier le compte : ${targetError.message}` }, { status: 500 });
    }

    if (target?.role === "admin") {
      const adminCount = await getAdminCount(db);
      if (adminCount.error) {
        return Response.json({ error: `Impossible de vérifier les administrateurs : ${adminCount.error.message}` }, { status: 500 });
      }
      if (adminCount.count <= 1) {
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
