import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

const ROLES = [
  { v: "admin", l: "Admin" },
  { v: "bo_manager", l: "Gestionnaire BO" },
  { v: "cart_manager", l: "Gestionnaire Charriot" },
];

function AdminUsers() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("bo_manager");

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("role", ["admin", "bo_manager", "cart_manager"]);
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (ids.length === 0) { setList([]); return; }
    const { data: profs } = await supabase.from("profiles").select("user_id,full_name,phone,email").in("user_id", ids);
    setList((profs ?? []).map((p: any) => ({ ...p, roles: (roles ?? []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role) })));
  };
  useEffect(() => { load(); }, []);

  if (!isAdmin) return <p className="text-muted-foreground">Réservé aux admins.</p>;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || pwd.length < 6 || !name.trim()) return toast.error("Champs invalides");
    const { data, error } = await supabase.auth.signUp({ email, password: pwd, options: { data: { full_name: name } } });
    if (error || !data.user) return toast.error(error?.message ?? "Erreur");
    await supabase.from("user_roles").insert({ user_id: data.user.id, role: role as any });
    toast.success("Utilisateur créé"); setEmail(""); setPwd(""); setName(""); load();
  };

  const setUserRole = async (uid: string, newRole: string) => {
    await supabase.from("user_roles").delete().eq("user_id", uid);
    await supabase.from("user_roles").insert({ user_id: uid, role: newRole as any });
    load();
  };

  const remove = async (uid: string) => {
    if (!confirm("Retirer tous les rôles de cet utilisateur ?")) return;
    await supabase.from("user_roles").delete().eq("user_id", uid);
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="card-pop space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-xl font-bold">Nouvel utilisateur BO</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Mot de passe *</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required /></div>
          <div>
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />Créer</Button>
      </form>

      <div className="space-y-2">
        {list.map((u) => (
          <div key={u.user_id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            <div className="flex-1">
              <p className="font-semibold">{u.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{u.phone ?? ""} · {u.roles.join(", ")}</p>
            </div>
            <Select value={u.roles[0]} onValueChange={(v) => setUserRole(u.user_id, v)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => remove(u.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
