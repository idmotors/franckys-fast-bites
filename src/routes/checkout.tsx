import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useGeo } from "@/hooks/useGeo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatAr } from "@/lib/format";
import { distanceKm, deliveryFee, geocodeSearch, type NominatimResult } from "@/lib/geo";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";

export const Route = createFileRoute("/checkout")({ component: Checkout });

interface CartLoc { id: string; name: string; address: string; latitude: number; longitude: number; }
interface Stock { cart_id: string; product_id: string; quantity: number; }

const phoneSchema = z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Numéro invalide");

function Checkout() {
  const { user, loading } = useAuth();
  const { items, total, clear } = useCart();
  const { pos } = useGeo();
  const navigate = useNavigate();

  const [carts, setCarts] = useState<CartLoc[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [pickupCartId, setPickupCartId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [delivery, setDelivery] = useState<{ display: string; lat: number; lng: number } | null>(null);

  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("carts").select("id,name,address,latitude,longitude").eq("active", true).then(({ data }) => {
      setCarts((data as CartLoc[]) ?? []);
      if (data?.[0]) setPickupCartId(data[0].id);
    });
    supabase.from("cart_stocks").select("cart_id,product_id,quantity").then(({ data }) => {
      setStocks((data as Stock[]) ?? []);
    });
    if (user) {
      supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
    }
  }, [user]);

  // For delivery: find nearest cart that has full stock for the order
  const assignment = useMemo(() => {
    if (mode !== "delivery" || !delivery) return null;
    const candidates = carts.map((c) => {
      const ok = items.every((it) => {
        const s = stocks.find((s) => s.cart_id === c.id && s.product_id === it.id);
        return s ? s.quantity >= it.quantity : false;
      });
      return { cart: c, hasStock: ok, km: distanceKm({ lat: delivery.lat, lng: delivery.lng }, { lat: c.latitude, lng: c.longitude }) };
    }).sort((a, b) => a.km - b.km);
    const chosen = candidates.find((c) => c.hasStock) ?? candidates[0];
    if (!chosen) return null;
    return { cart: chosen.cart, km: chosen.km, fee: deliveryFee(chosen.km), hasStock: chosen.hasStock };
  }, [mode, delivery, carts, items, stocks]);

  const fee = mode === "delivery" ? (assignment?.fee ?? 0) : 0;
  const grandTotal = total + fee;

  useEffect(() => {
    if (!addrQuery.trim() || (delivery && addrQuery === delivery.display)) { setAddrResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setAddrResults(await geocodeSearch(addrQuery, 6)); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [addrQuery, delivery]);

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
    try { phoneSchema.parse(phone); } catch { return toast.error("Numéro invalide"); }
    if (mode === "pickup" && !pickupCartId) return toast.error("Choisissez un charriot");
    if (mode === "delivery" && !delivery) return toast.error("Renseignez votre adresse de livraison");
    if (mode === "delivery" && assignment && !assignment.hasStock) {
      if (!confirm("Stock insuffisant sur le charriot le plus proche. Confirmer la commande quand même ?")) return;
    }
    if (!user) return;

    setBusy(true);
    const cart_id = mode === "pickup" ? pickupCartId : null;
    const assigned_cart_id = mode === "delivery" ? assignment?.cart.id ?? null : null;

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      phone,
      mode,
      cart_id,
      assigned_cart_id,
      delivery_address: mode === "delivery" ? delivery!.display : null,
      delivery_lat: mode === "delivery" ? delivery!.lat : null,
      delivery_lng: mode === "delivery" ? delivery!.lng : null,
      delivery_fee_ar: fee,
      notes: notes || null,
      total_ar: grandTotal,
      status: "pending",
    }).select().single();

    if (error || !order) { toast.error(error?.message ?? "Erreur"); setBusy(false); return; }

    const { error: ie } = await supabase.from("order_items").insert(
      items.map((i) => ({ order_id: order.id, product_id: i.id, product_name: i.name, unit_price_ar: i.price_ar, quantity: i.quantity }))
    );
    if (ie) { toast.error(ie.message); setBusy(false); return; }

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
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid grid-cols-2 gap-2">
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
              <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${pickupCartId===c.id?"border-primary bg-primary/5":"border-border"}`}>
                <input type="radio" name="cart" checked={pickupCartId===c.id} onChange={() => setPickupCartId(c.id)} className="mt-1" />
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.address}</p>
                  {pos && <p className="text-[10px] text-muted-foreground">à {distanceKm(pos, { lat: c.latitude, lng: c.longitude }).toFixed(1)} km de vous</p>}
                </div>
              </label>
            ))}
            {carts.length === 0 && <p className="text-sm text-muted-foreground">Aucun charriot disponible.</p>}
          </div>
        </div>
      )}

      {mode === "delivery" && (
        <div className="card-pop space-y-3 rounded-2xl p-4">
          <Label className="text-base font-semibold">Adresse de livraison</Label>
          <div className="flex gap-2">
            <Input value={addrQuery} onChange={(e) => setAddrQuery(e.target.value)} placeholder="Quartier, rue, ville..." />
            <Button type="button" variant="outline" onClick={doSearch} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {addrResults.length > 0 && (
            <div className="space-y-1">
              {addrResults.map((r, i) => (
                <button type="button" key={i} onClick={() => { setDelivery({ display: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }); setAddrResults([]); setAddrQuery(r.display_name); }}
                  className="block w-full rounded-lg border p-2 text-left text-xs hover:bg-secondary">
                  📍 {r.display_name}
                </button>
              ))}
            </div>
          )}
          {delivery && assignment && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 text-sm">
              <p>Charriot affecté : <strong>{assignment.cart.name}</strong> ({assignment.km.toFixed(1)} km)</p>
              <p className="text-xs text-muted-foreground">Frais de livraison : {formatAr(assignment.fee)} ({assignment.km <= 15 ? "≤ 15 km" : "> 15 km"})</p>
              {!assignment.hasStock && <p className="mt-1 text-xs text-destructive">⚠ Stock partiel — sera traité dès que possible.</p>}
            </div>
          )}
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

      <div className="card-pop space-y-2 rounded-2xl p-4">
        <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatAr(total)}</span></div>
        {mode === "delivery" && <div className="flex justify-between text-sm"><span>Livraison</span><span>{formatAr(fee)}</span></div>}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-display text-lg">Total</span>
          <span className="font-display text-2xl font-bold text-primary">{formatAr(grandTotal)}</span>
        </div>
      </div>

      <Button type="submit" className="btn-hero w-full" size="lg" disabled={busy}>
        {busy ? "Envoi..." : "Confirmer la commande"}
      </Button>
    </form>
  );
}
