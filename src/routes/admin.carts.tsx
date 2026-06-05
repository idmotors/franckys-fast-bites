import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, X, MapPin } from "lucide-react";
import { geocodeSearch, reverseGeocode, type NominatimResult } from "@/lib/geo";
import { MapPicker } from "@/components/MapPicker";

export const Route = createFileRoute("/admin/carts")({ component: AdminCarts });

interface C { id: string; name: string; address: string; latitude: number; longitude: number; active: boolean; manager_user_id: string | null; }

function AdminCarts() {
  const [list, setList] = useState<C[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [editing, setEditing] = useState<C | null>(null);
  const blank = { name: "", address: "", lat: null as number | null, lng: null as number | null, manager: "none" };
  const [f, setF] = useState(blank);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = () => supabase.from("carts").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as C[]) ?? []));

  const loadManagers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "cart_manager");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setManagers([]); return; }
    const { data: profs } = await supabase.from("profiles").select("user_id,full_name").in("user_id", ids);
    setManagers((profs as any) ?? []);
  };

  useEffect(() => { load(); loadManagers(); }, []);

  const startEdit = (c: C) => {
    setEditing(c);
    setF({ name: c.name, address: c.address, lat: c.latitude, lng: c.longitude, manager: c.manager_user_id ?? "none" });
    setQ(c.address);
  };
  const cancel = () => { setEditing(null); setF(blank); setResults([]); setQ(""); };

  // Autocomplete: debounce search-as-you-type
  useEffect(() => {
    if (!q.trim() || q === f.address) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await geocodeSearch(q, 6)); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [q, f.address]);

  const pick = (r: NominatimResult) => {
    setF({ ...f, address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setQ(r.display_name);
    setResults([]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Nom requis");
    if (f.lat == null || f.lng == null || !f.address) return toast.error("Choisissez une localisation");
    const payload = { name: f.name.trim(), address: f.address, latitude: f.lat, longitude: f.lng, manager_user_id: f.manager === "none" ? null : f.manager };
    const { error } = editing
      ? await supabase.from("carts").update(payload).eq("id", editing.id)
      : await supabase.from("carts").insert({ ...payload, active: true });
    if (error) toast.error(error.message); else { toast.success(editing ? "Charriot modifié" : "Charriot ajouté"); cancel(); load(); }
  };

  const toggle = async (c: C) => { await supabase.from("carts").update({ active: !c.active }).eq("id", c.id); load(); };
  const del = async (id: string) => {
    if (!confirm("Supprimer ce charriot ?")) return;
    const { error } = await supabase.from("carts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); load(); }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="card-pop space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{editing ? "Modifier le charriot" : "Ajouter un charriot"}</h2>
          {editing && <Button type="button" variant="ghost" size="sm" onClick={cancel}><X className="h-4 w-4" /></Button>}
        </div>
        <div><Label>Nom *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>

        <div className="space-y-2 relative">
          <Label>Localisation *</Label>
          <div className="relative">
            <Input value={q} onChange={(e) => { setQ(e.target.value); if (f.address) setF({ ...f, address: "", lat: null, lng: null }); }} placeholder="Tapez un quartier, une rue, une ville..." />
            <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {searching && <p className="text-xs text-muted-foreground">Recherche…</p>}
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-background shadow-lg">
              {results.map((r, i) => (
                <button type="button" key={i} onClick={() => pick(r)} className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-secondary last:border-b-0">
                  📍 {r.display_name}
                </button>
              ))}
            </div>
          )}
          {f.lat != null && f.lng != null && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{f.address}</p>
              <MapPreview lat={f.lat} lng={f.lng} height={180} />
            </div>
          )}
        </div>

        <div>
          <Label>Gestionnaire charriot</Label>
          <Select value={f.manager} onValueChange={(v) => setF({ ...f, manager: v })}>
            <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {managers.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />{editing ? "Enregistrer" : "Ajouter"}</Button>
      </form>

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            <div className="flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.address}</p>
              <p className="text-[10px] text-muted-foreground">{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)} {c.manager_user_id && "· 👤"}</p>
            </div>
            <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
            <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
