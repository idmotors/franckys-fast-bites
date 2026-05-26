import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useGeo } from "@/hooks/useGeo";
import { Button } from "@/components/ui/button";
import { formatAr } from "@/lib/format";
import { Plus, MapPin, Minus } from "lucide-react";
import heroImg from "@/assets/hero-hotdog.jpg";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Product {
  id: string; name: string; description: string | null; price_ar: number;
  category: string | null; image_url: string | null; available: boolean;
}

function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, add, setQty } = useCart();
  const { pos, request, busy, error } = useGeo();

  useEffect(() => {
    supabase.from("products").select("*").eq("available", true).order("category").then(({ data }) => {
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    });
  }, []);

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const k = p.category ?? "Autres";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  const qtyOf = (id: string) => items.find((i) => i.id === id)?.quantity ?? 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-pop)]">
        <img src={heroImg} alt="Hot-dog Francky's" className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Le vrai goût du hot-dog 🌭</h1>
          <p className="mt-1 text-sm text-white/90">Frais, juteux, livré ou à retirer au charriot.</p>
          <div className="mt-4">
            <Link to="/locate"><Button variant="secondary" size="sm" className="gap-2"><MapPin className="h-4 w-4" />Charriot le plus proche</Button></Link>
          </div>
        </div>
      </section>

      {!pos && (
        <div className="card-pop flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">Activez votre localisation pour commander, être livré ou trouver le charriot le plus proche.</p>
          </div>
          <Button onClick={request} disabled={busy} size="sm" className="btn-hero shrink-0">
            {busy ? "Localisation…" : "Activer ma localisation"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-center text-muted-foreground">Chargement…</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <section key={cat} className="space-y-3">
            <h2 className="font-display text-2xl font-bold">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((p) => {
                const q = qtyOf(p.id);
                return (
                  <article key={p.id} className="card-pop flex gap-4 rounded-2xl p-4">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">🌭</div>
                    )}
                    <div className="flex flex-1 flex-col">
                      <h3 className="font-semibold leading-tight">{p.name}</h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-display text-lg font-bold text-primary">{formatAr(p.price_ar)}</span>
                        {q === 0 ? (
                          <Button size="sm" className="btn-hero gap-1 rounded-full" onClick={() => { add({ id: p.id, name: p.name, price_ar: p.price_ar, image_url: p.image_url }); toast.success(`${p.name} ajouté`); }}>
                            <Plus className="h-4 w-4" /> Ajouter
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(p.id, q - 1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center font-bold">{q}</span>
                            <Button size="icon" className="btn-hero h-8 w-8 rounded-full" onClick={() => setQty(p.id, q + 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
