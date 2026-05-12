import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/cart-managers")({ component: AdminCM });

function AdminCM() {
  const [list, setList] = useState<any[]>([]);
  const [carts, setCarts] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [cartId, setCartId] = useState("none");

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "cart_manager");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setList([]); return; }
    const { data: profs } = await supabase.from("profiles").select("user_id,full_name,phone").in("user_id", ids);
    const { data: cs } = await supabase.from("carts").select("id,name,manager_user_id").in("manager_user_id", ids);
    setList((profs ?? []).map((p: any) => ({ ...p, cart: cs?.find((c: any) => c.manager_user_id === p.user_id) })));
  };

  useEffect(() => { load(); supabase.from("carts").select("id,name").then(({ data }) => setCarts(data ?? [])); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || pwd.length < 6 || !name.trim()) return toast.error("Champs invalides");
    // Sign up via standard auth (auto-confirm enabled)
    const { data, error } = await supabase.auth.signUp({ email, password: pwd, options: { data: { full_name: name } } });
    if (error || !data.user) return toast.error(error?.message ?? "Erreur");
    await supabase.from("user_roles").insert({ user_id: data.user.id, role: "cart_manager" });
    if (cartId !== "none") await supabase.from("carts").update({ manager_user_id: data.user.id }).eq("id", cartId);
    toast.success("Gestionnaire créé");
    setEmail(""); setPwd(""); setName(""); setCartId("none"); load();
  };

  const remove = async (uid: string) => {
    if (!confirm("Retirer ce gestionnaire ?")) return;
    await supabase.from("carts").update({ manager_user_id: null }).eq("manager_user_id", uid);
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "cart_manager");
    toast.success("Retiré"); load();
  };

  const assign = async (uid: string, cid: string) => {
    await supabase.from("carts").update({ manager_user_id: null }).eq("manager_user_id", uid);
    if (cid !== "none") await supabase.from("carts").update({ manager_user_id: uid }).eq("id", cid);
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="card-pop space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-xl font-bold">Nouveau gestionnaire charriot</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Mot de passe *</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required /></div>
          <div>
            <Label>Charriot affecté</Label>
            <Select value={cartId} onValueChange={setCartId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {carts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />Créer</Button>
      </form>

      <div className="space-y-2">
        {list.map((m) => (
          <div key={m.user_id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            <div className="flex-1">
              <p className="font-semibold">{m.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{m.phone ?? ""}</p>
            </div>
            <Select value={m.cart?.id ?? "none"} onValueChange={(v) => assign(m.user_id, v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {carts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => remove(m.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
