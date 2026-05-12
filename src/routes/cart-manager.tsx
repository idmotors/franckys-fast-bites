import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/cart-manager")({ component: CartManager });

const STATUSES = ["pending", "preparing", "delivering", "delivered", "ready", "cancelled"];
const labels: Record<string, string> = {
  pending: "Commande reçue", preparing: "En préparation", delivering: "En livraison",
  delivered: "Livrée", ready: "Prête", cancelled: "Annulée",
};

function CartManager() {
  const { user, loading, isCartManager, isBO } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isCartManager && !isBO) navigate({ to: "/" });
  }, [user, loading, isCartManager, isBO, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("carts").select("id").eq("manager_user_id", user.id).maybeSingle().then(({ data }) => {
      setCartId(data?.id ?? null);
    });
  }, [user]);

  const load = () => {
    if (!cartId) return;
    supabase.from("orders").select("*,order_items(*)").or(`cart_id.eq.${cartId},assigned_cart_id.eq.${cartId}`).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) ?? []));
  };

  useEffect(() => { load(); }, [cartId]);

  // Realtime + notifications
  useEffect(() => {
    if (!cartId) return;
    const ch = supabase.channel(`cm-${cartId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
      const r = payload.new;
      if (r.cart_id === cartId || r.assigned_cart_id === cartId) {
        toast.success("🔔 Nouvelle commande reçue !");
        try { new Notification("Francky's", { body: "Nouvelle commande reçue" }); } catch {}
        load();
      }
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => load()).subscribe();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    return () => { supabase.removeChannel(ch); };
  }, [cartId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Statut mis à jour"); load(); }
  };

  if (!cartId) return <p className="py-12 text-center text-muted-foreground">Aucun charriot affecté à votre compte.</p>;

  return (
    <div className="space-y-4 py-4">
      <h1 className="font-display text-3xl font-bold">Mes commandes — Charriot</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune commande.</p>}
      {orders.map((o) => (
        <article key={o.id} className="card-pop space-y-2 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
              <p className="font-semibold">{o.mode === "pickup" ? "🛒 Retrait" : "🛵 Livraison"}</p>
              <p className="text-sm">📞 <a href={`tel:${o.phone}`} className="text-primary underline">{o.phone}</a></p>
              {o.mode === "delivery" && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
            </div>
            <Badge>{labels[o.status] ?? o.status}</Badge>
          </div>
          <ul className="text-sm">
            {o.order_items.map((it: any, i: number) => <li key={i}>{it.quantity}× {it.product_name}</li>)}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="font-display text-lg font-bold text-primary">{formatAr(o.total_ar)}</span>
            <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
