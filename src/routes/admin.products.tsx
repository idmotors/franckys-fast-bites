import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatAr } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

interface P {
  id: string; name: string; description: string | null; price_ar: number;
  category: string | null; available: boolean;
}

function AdminProducts() {
  const [list, setList] = useState<P[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState("Hot-Dog");

  const load = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as P[]) ?? []));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceN = parseInt(price, 10);
    if (!name.trim() || isNaN(priceN) || priceN < 0) return toast.error("Champs invalides");
    const { error } = await supabase.from("products").insert({
      name: name.trim(), description: desc.trim() || null, price_ar: priceN, category: cat, available: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Produit ajouté"); setName(""); setDesc(""); setPrice(""); load(); }
  };

  const toggle = async (p: P) => {
    await supabase.from("products").update({ available: !p.available }).eq("id", p.id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimé"); load(); }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card-pop space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-xl font-bold">Ajouter un produit</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required /></div>
          <div><Label>Catégorie</Label><Input value={cat} onChange={(e) => setCat(e.target.value)} maxLength={50} /></div>
          <div><Label>Prix (Ar) *</Label><Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
        </div>
        <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} /></div>
        <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />Ajouter</Button>
      </form>

      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            <div className="flex-1">
              <p className="font-semibold">{p.name} <span className="text-xs text-muted-foreground">— {p.category}</span></p>
              <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
              <p className="text-sm font-bold text-primary">{formatAr(p.price_ar)}</p>
            </div>
            <Switch checked={p.available} onCheckedChange={() => toggle(p)} />
            <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
