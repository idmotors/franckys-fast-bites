import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/carts")({
  component: AdminCarts,
});

interface C { id: string; name: string; address: string; latitude: number; longitude: number; active: boolean; }

function AdminCarts() {
  const [list, setList] = useState<C[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const load = () => supabase.from("carts").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as C[]) ?? []));
  useEffect(() => { load(); }, []);

  const useMyPos = () => {
    if (!("geolocation" in navigator)) return toast.error("Géolocalisation indisponible");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); toast.success("Position récupérée"); },
      () => toast.error("Position refusée")
    );
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (!name.trim() || !address.trim() || isNaN(la) || isNaN(lo)) return toast.error("Champs invalides");
    const { error } = await supabase.from("carts").insert({ name: name.trim(), address: address.trim(), latitude: la, longitude: lo, active: true });
    if (error) toast.error(error.message);
    else { toast.success("Charriot ajouté"); setName(""); setAddress(""); setLat(""); setLng(""); load(); }
  };

  const toggle = async (c: C) => { await supabase.from("carts").update({ active: !c.active }).eq("id", c.id); load(); };
  const del = async (id: string) => {
    if (!confirm("Supprimer ce charriot ?")) return;
    const { error } = await supabase.from("carts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); load(); }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card-pop space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-xl font-bold">Ajouter un charriot</h2>
        <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required /></div>
        <div><Label>Adresse *</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Latitude *</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-18.91" required /></div>
          <div><Label>Longitude *</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="47.52" required /></div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={useMyPos} className="gap-2"><MapPin className="h-4 w-4" />Utiliser ma position</Button>
          <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />Ajouter</Button>
        </div>
      </form>

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            <div className="flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.address}</p>
              <p className="text-[10px] text-muted-foreground">{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</p>
            </div>
            <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
            <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
