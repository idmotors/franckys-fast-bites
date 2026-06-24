import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  phone: z.string().trim().regex(/^[0-9+\s-]{8,20}$/),
  fullName: z.string().trim().min(2).max(100),
  newPassword: z.string().min(6).max(72),
});

function normalizeName(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

export const resetClientPasswordByPhone = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; fullName: string; newPassword: string }) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cleanPhone = data.phone.replace(/[^0-9]/g, "");
    const email = `tel${cleanPhone}@franckys.app`;

    // Find user by synthetic email via profiles (phone is stored there)
    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, phone");
    if (pErr) throw new Error("Erreur serveur");

    const match = (profs ?? []).find((p: any) => {
      const phoneClean = (p.phone ?? "").replace(/[^0-9]/g, "");
      return phoneClean === cleanPhone && normalizeName(p.full_name ?? "") === normalizeName(data.fullName);
    });
    if (!match) throw new Error("Aucun compte ne correspond à ces informations");

    // Ensure this user is a client (not BO) — BO users reset via email link
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", match.user_id);
    const roleList = (roles ?? []).map((r: any) => r.role);
    const isBO = roleList.some((r) => r === "admin" || r === "bo_manager" || r === "cart_manager");
    if (isBO) throw new Error("Ce compte doit être réinitialisé par un administrateur");

    // Confirm the auth user exists with that email
    const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(match.user_id);
    if (uErr || !userRes?.user) throw new Error("Compte introuvable");
    if (userRes.user.email !== email) throw new Error("Incohérence du compte");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(match.user_id, {
      password: data.newPassword,
    });
    if (updErr) throw new Error("Échec de la mise à jour");

    return { ok: true };
  });
