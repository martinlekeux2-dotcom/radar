import { withAdmin } from "../../../../src/lib/admin-api";

export async function GET(request) {
  return withAdmin(request, ({ user, role }) =>
    Response.json({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name ?? "",
      role,
    }),
  );
}
