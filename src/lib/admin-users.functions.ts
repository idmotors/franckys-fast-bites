import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; redirectTo: string }) =>
    z.object({ userId: z.string().uuid(), redirectTo: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !u?.user?.email) throw new Error("Utilisateur introuvable");
    if (u.user.email.endsWith("@franckys.app")) {
      throw new Error("Ce compte client n'a pas d'email réel");
    }

    const { error: rErr } = await supabaseAdmin.auth.resetPasswordForEmail(u.user.email, {
      redirectTo: data.redirectTo,
    });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, email: u.user.email };
  });
