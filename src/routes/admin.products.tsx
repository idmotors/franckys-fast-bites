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
import { Trash2, Plus, Pencil, X, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

interface P { id: string; name: string; description: string | null; price_ar: number; category: string | null; image_url: string | null; available: boolean; }

function AdminProducts() {
  const [list, setList] = useState<P[]>([]);
  const [editing, setEditing] = useState<P | null>(null);
  const blank = { name: "", description: "", price: "", cat: "Hot-Dog", image_url: "" };
  const [f, setF] = useState(blank);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Image uniquement"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Max 3 Mo"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { cacheControl: "3600" });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setF((prev) => ({ ...prev, image_url: pub.publicUrl }));
    toast.success("Image téléversée");
  };

  const load = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as P[]) ?? []));
  useEffect(() => { load(); }, []);

  const startEdit = (p: P) => { setEditing(p); setF({ name: p.name, description: p.description ?? "", price: String(p.price_ar), cat: p.category ?? "", image_url: p.image_url ?? "" }); };
  const cancel = () => { setEditing(null); setF(blank); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceN = parseInt(f.price, 10);
    if (!f.name.trim() || isNaN(priceN) || priceN < 0) return toast.error("Champs invalides");
    const payload = { name: f.name.trim(), description: f.description.trim() || null, price_ar: priceN, category: f.cat || null, image_url: f.image_url.trim() || null };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert({ ...payload, available: true });
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Produit modifié" : "Produit ajouté"); cancel(); load(); }
  };

  const toggle = async (p: P) => { await supabase.from("products").update({ available: !p.available }).eq("id", p.id); load(); };
  const del = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); load(); }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="card-pop space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{editing ? "Modifier le produit" : "Ajouter un produit"}</h2>
          {editing && <Button type="button" variant="ghost" size="sm" onClick={cancel}><X className="h-4 w-4" /></Button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nom *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} required /></div>
          <div><Label>Catégorie</Label><Input value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} maxLength={50} /></div>
          <div><Label>Prix (Ar) *</Label><Input type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></div>
          <div>
            <Label>Photo du produit</Label>
            <div className="flex items-center gap-3">
              {f.image_url ? (
                <img src={f.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-2xl">🌭</div>
              )}
              <label className="btn-hero inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold">
                <Upload className="h-4 w-4" />
                {uploading ? "Envoi…" : "Téléverser"}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ""; }} />
              </label>
              {f.image_url && <Button type="button" variant="ghost" size="sm" onClick={() => setF({ ...f, image_url: "" })}>Retirer</Button>}
            </div>
            <Input className="mt-2" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="ou collez une URL https://..." />
          </div>
        </div>
        <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={300} /></div>
        <Button type="submit" className="btn-hero gap-2"><Plus className="h-4 w-4" />{editing ? "Enregistrer" : "Ajouter"}</Button>
      </form>

      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="card-pop flex items-center gap-3 rounded-xl p-3">
            {p.image_url ? <img src={p.image_url} className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-2xl">🌭</div>}
            <div className="flex-1">
              <p className="font-semibold">{p.name} <span className="text-xs text-muted-foreground">— {p.category}</span></p>
              <p className="text-sm font-bold text-primary">{formatAr(p.price_ar)}</p>
            </div>
            <Switch checked={p.available} onCheckedChange={() => toggle(p)} />
            <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
