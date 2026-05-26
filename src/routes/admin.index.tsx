import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

const STATUSES = ["pending", "preparing", "delivering", "delivered", "ready", "cancelled"];
const labels: Record<string, string> = {
  pending: "Reçue", preparing: "Préparation", delivering: "Livraison", delivered: "Livrée",
  ready: "Prête", completed: "Terminée", cancelled: "Annulée",
};

function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [carts, setCarts] = useState<{ id: string; name: string }[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cartFilter, setCartFilter] = useState<string>("all");

  const load = () => {
    supabase.from("orders").select("*,carts:cart_id(name),assigned:assigned_cart_id(name),order_items(*)")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) ?? []));
  };

  useEffect(() => { load(); }, [from, to]);
  useEffect(() => { supabase.from("carts").select("id,name").then(({ data }) => setCarts((data as any) ?? [])); }, []);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "logo_url").maybeSingle()
      .then(({ data }) => setLogoUrl((data?.value as string) ?? null));
  }, []);

  const onUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Image uniquement");
    if (file.size > 2 * 1024 * 1024) return toast.error("Max 2 Mo");
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `logo/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) { setUploadingLogo(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const { error: upErr } = await supabase.from("app_settings").upsert({ key: "logo_url", value: pub.publicUrl, updated_at: new Date().toISOString() });
    setUploadingLogo(false);
    if (upErr) return toast.error(upErr.message);
    setLogoUrl(pub.publicUrl);
    window.dispatchEvent(new Event("francky:logo-changed"));
    toast.success("Logo mis à jour");
  };

  const resetLogo = async () => {
    if (!confirm("Réinitialiser le logo ?")) return;
    const { error } = await supabase.from("app_settings").upsert({ key: "logo_url", value: null, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    setLogoUrl(null);
    window.dispatchEvent(new Event("francky:logo-changed"));
    toast.success("Logo réinitialisé");
  };

  const filtered = useMemo(() => orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (cartFilter !== "all") {
      const cid = o.assigned_cart_id ?? o.cart_id;
      if (cid !== cartFilter) return false;
    }
    return true;
  }), [orders, statusFilter, cartFilter]);

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of filtered) m[o.status] = (m[o.status] ?? 0) + 1;
    return m;
  }, [filtered]);

  const byCart = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of filtered) {
      const name = o.assigned?.name ?? o.carts?.name ?? "—";
      m[name] = (m[name] ?? 0) + 1;
    }
    return m;
  }, [filtered]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Statut mis à jour"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="card-pop rounded-2xl p-4">
        <h3 className="mb-3 font-display text-lg font-bold">Logo de l'application</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-secondary">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-4xl">🌭</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-hero inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              {uploadingLogo ? "Envoi…" : "Téléverser un logo"}
              <input type="file" accept="image/*" className="hidden" onChange={onUploadLogo} disabled={uploadingLogo} />
            </label>
            {logoUrl && <Button variant="ghost" size="sm" onClick={resetLogo} className="text-destructive">Réinitialiser</Button>}
            <p className="w-full text-xs text-muted-foreground">PNG ou JPG, max 2 Mo.</p>
          </div>
        </div>
      </div>

      <div className="card-pop grid gap-3 rounded-2xl p-4 sm:grid-cols-4">
        <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>Statut</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Charriot</Label>
          <Select value={cartFilter} onValueChange={setCartFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {carts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card-pop rounded-2xl p-4">
          <h3 className="mb-2 font-display text-lg font-bold">Commandes par statut</h3>
          <div className="space-y-1">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span>{labels[s]}</span>
                <Badge variant="secondary">{byStatus[s] ?? 0}</Badge>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
              <span>Total</span><span>{filtered.length}</span>
            </div>
          </div>
        </div>
        <div className="card-pop rounded-2xl p-4">
          <h3 className="mb-2 font-display text-lg font-bold">Commandes par charriot</h3>
          <div className="space-y-1">
            {Object.entries(byCart).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span>{k}</span><Badge variant="secondary">{v}</Badge>
              </div>
            ))}
            {Object.keys(byCart).length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée.</p>}
          </div>
        </div>
      </div>

      <h2 className="font-display text-xl font-bold pt-2">Commandes ({filtered.length})</h2>
      {filtered.map((o) => (
        <article key={o.id} className="card-pop space-y-2 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
              <p className="font-semibold">
                {o.mode === "pickup" ? `🛒 Retrait — ${o.carts?.name ?? "—"}` : `🛵 Livraison — ${o.assigned?.name ?? "—"}`}
              </p>
              <p className="text-sm">📞 <a href={`tel:${o.phone}`} className="text-primary underline">{o.phone}</a></p>
              {o.mode === "delivery" && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
            </div>
            <Badge>{labels[o.status] ?? o.status}</Badge>
          </div>
          <ul className="text-sm">
            {o.order_items?.map((it: any, i: number) => <li key={i}>{it.quantity}× {it.product_name}</li>)}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="font-display text-lg font-bold text-primary">{formatAr(o.total_ar)}</span>
            <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </article>
      ))}
    </div>
  );
}
