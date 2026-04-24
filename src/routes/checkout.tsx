import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatAr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

interface Cart { id: string; name: string; address: string; }

const phoneSchema = z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Numéro invalide");

function Checkout() {
  const { user, loading } = useAuth();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [cartId, setCartId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("carts").select("id,name,address").eq("active", true).then(({ data }) => {
      setCarts((data as Cart[]) ?? []);
      if (data?.[0]) setCartId(data[0].id);
    });
    if (user) {
      supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
    }
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Votre panier est vide.</p>
        <Link to="/" className="mt-4 inline-block"><Button className="btn-hero">Voir le menu</Button></Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(phone);
    } catch {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (mode === "pickup" && !cartId) return toast.error("Choisissez un charriot");
    if (mode === "delivery" && address.trim().length < 5) return toast.error("Adresse de livraison requise");
    if (!user) return;

    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        phone,
        mode,
        cart_id: mode === "pickup" ? cartId : null,
        delivery_address: mode === "delivery" ? address : null,
        notes: notes || null,
        total_ar: total,
      })
      .select()
      .single();

    if (error || !order) {
      toast.error("Erreur : " + (error?.message ?? "inconnue"));
      setBusy(false);
      return;
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        unit_price_ar: i.price_ar,
        quantity: i.quantity,
      }))
    );
    if (itemsErr) {
      toast.error("Erreur lignes : " + itemsErr.message);
      setBusy(false);
      return;
    }

    // Save phone to profile
    await supabase.from("profiles").update({ phone }).eq("user_id", user.id);

    clear();
    toast.success("Commande envoyée ! 🌭");
    navigate({ to: "/my-orders" });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 py-4">
      <h1 className="font-display text-3xl font-bold">Finaliser ma commande</h1>

      <div className="card-pop space-y-3 rounded-2xl p-4">
        <Label className="text-base font-semibold">Mode</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "pickup" | "delivery")} className="grid grid-cols-2 gap-2">
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 ${mode==="pickup"?"border-primary bg-primary/5":"border-border"}`}>
            <RadioGroupItem value="pickup" /> 🛒 Retrait
          </label>
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 ${mode==="delivery"?"border-primary bg-primary/5":"border-border"}`}>
            <RadioGroupItem value="delivery" /> 🛵 Livraison
          </label>
        </RadioGroup>
      </div>

      {mode === "pickup" && (
        <div className="card-pop space-y-2 rounded-2xl p-4">
          <Label className="text-base font-semibold">Choisir un charriot</Label>
          <div className="space-y-2">
            {carts.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${cartId===c.id?"border-primary bg-primary/5":"border-border"}`}>
                <input type="radio" name="cart" checked={cartId===c.id} onChange={() => setCartId(c.id)} className="mt-1" />
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.address}</p>
                </div>
              </label>
            ))}
            {carts.length === 0 && <p className="text-sm text-muted-foreground">Aucun charriot disponible.</p>}
          </div>
        </div>
      )}

      {mode === "delivery" && (
        <div className="card-pop space-y-2 rounded-2xl p-4">
          <Label htmlFor="addr" className="text-base font-semibold">Adresse de livraison</Label>
          <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} placeholder="Quartier, rue, repère..." />
        </div>
      )}

      <div className="card-pop space-y-3 rounded-2xl p-4">
        <div>
          <Label htmlFor="phone" className="text-base font-semibold">Téléphone *</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+261 …" required />
        </div>
        <div>
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        </div>
      </div>

      <div className="card-pop flex items-center justify-between rounded-2xl p-4">
        <span className="font-display text-lg">Total</span>
        <span className="font-display text-2xl font-bold text-primary">{formatAr(total)}</span>
      </div>

      <Button type="submit" className="btn-hero w-full" size="lg" disabled={busy}>
        {busy ? "Envoi..." : "Confirmer la commande"}
      </Button>
    </form>
  );
}
