import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatAr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/my-orders")({ component: MyOrders });

interface Order {
  id: string; mode: string; status: string; total_ar: number; created_at: string;
  delivery_address: string | null; delivery_fee_ar: number;
  carts: { name: string } | null;
  assigned: { name: string } | null;
  order_items: { product_name: string; quantity: number; unit_price_ar: number }[];
}

const statusLabel: Record<string, string> = {
  pending: "Commande reçue", validated: "Validée", preparing: "En préparation",
  ready: "Prête à retirer", delivering: "En livraison", delivered: "Livrée",
  completed: "Terminée", cancelled: "Annulée",
};

const STEPS_DELIVERY = ["pending", "preparing", "delivering", "delivered"];

function MyOrders() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const load = () => {
    if (!user) return;
    supabase.from("orders")
      .select("id,mode,status,total_ar,created_at,delivery_address,delivery_fee_ar,carts:cart_id(name),assigned:assigned_cart_id(name),order_items(product_name,quantity,unit_price_ar)")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) ?? []));
  };

  useEffect(() => { load(); }, [user]);

  // Realtime updates on my orders
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("my-orders").on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="space-y-4 py-4">
      <h1 className="font-display text-3xl font-bold">Mes commandes</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune commande pour l'instant.</p>}
      {orders.map((o) => {
        const step = STEPS_DELIVERY.indexOf(o.status);
        const cartName = o.mode === "delivery" ? o.assigned?.name : o.carts?.name;
        return (
          <article key={o.id} className="card-pop space-y-3 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
                <p className="font-semibold">{o.mode === "pickup" ? `🛒 Retrait — ${cartName ?? "—"}` : `🛵 Livraison — ${cartName ?? "—"}`}</p>
                {o.mode === "delivery" && <p className="text-xs text-muted-foreground">{o.delivery_address}</p>}
              </div>
              <Badge>{statusLabel[o.status] ?? o.status}</Badge>
            </div>

            {o.mode === "delivery" && step >= 0 && (
              <div className="flex items-center gap-1">
                {STEPS_DELIVERY.map((s, i) => (
                  <div key={s} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`h-2 w-full rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                    <span className={`text-[10px] ${i <= step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{statusLabel[s]}</span>
                  </div>
                ))}
              </div>
            )}

            <ul className="text-sm text-muted-foreground">
              {o.order_items.map((it, i) => (
                <li key={i}>{it.quantity}× {it.product_name} — {formatAr(it.unit_price_ar * it.quantity)}</li>
              ))}
              {o.delivery_fee_ar > 0 && <li>Livraison — {formatAr(o.delivery_fee_ar)}</li>}
            </ul>
            <p className="text-right font-display text-lg font-bold text-primary">{formatAr(o.total_ar)}</p>
          </article>
        );
      })}
    </div>
  );
}
