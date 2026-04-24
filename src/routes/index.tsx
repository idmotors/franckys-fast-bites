import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { formatAr } from "@/lib/format";
import { Plus, MapPin } from "lucide-react";
import heroImg from "@/assets/hero-hotdog.jpg";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_ar: number;
  category: string | null;
  image_url: string | null;
  available: boolean;
}

function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    supabase.from("products").select("*").eq("available", true).order("category").then(({ data, error }) => {
      if (error) toast.error("Erreur de chargement");
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    });
  }, []);

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const k = p.category ?? "Autres";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-pop)]">
        <img src={heroImg} alt="Hot-dog Francky's" className="h-56 w-full object-cover sm:h-72" width={1280} height={560} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h1 className="font-display text-3xl font-bold text-white drop-shadow sm:text-4xl">
            Le vrai goût du hot-dog 🌭
          </h1>
          <p className="mt-1 text-sm text-white/90 sm:text-base">
            Frais, juteux, livré ou à retirer au charriot.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/locate">
              <Button variant="secondary" size="sm" className="gap-2">
                <MapPin className="h-4 w-4" /> Localiser un charriot
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Catalog */}
      {loading ? (
        <p className="text-center text-muted-foreground">Chargement…</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <section key={cat} className="space-y-3">
            <h2 className="font-display text-2xl font-bold">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((p) => (
                <article key={p.id} className="card-pop flex gap-4 rounded-2xl p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">
                    🌭
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-display text-lg font-bold text-primary">{formatAr(p.price_ar)}</span>
                      <Button
                        size="sm"
                        className="btn-hero gap-1 rounded-full"
                        onClick={() => {
                          add({ id: p.id, name: p.name, price_ar: p.price_ar, image_url: p.image_url });
                          toast.success(`${p.name} ajouté`);
                        }}
                      >
                        <Plus className="h-4 w-4" /> Ajouter
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
