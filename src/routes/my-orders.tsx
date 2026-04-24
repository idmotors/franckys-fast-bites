import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatAr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/my-orders")({
  component: MyOrders,
});

interface Order {
  id: string; mode: string; status: string; total_ar: number; created_at: string;
  delivery_address: string | null;
  carts: { name: string } | null;
  order_items: { product_name: string; quantity: number; unit_price_ar: number }[];
}

const statusLabel: Record<string, string> = {
  pending: "En attente", validated: "Validée", preparing: "En préparation",
  ready: "Prête", completed: "Livrée", cancelled: "Annulée",
};

function MyOrders() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,mode,status,total_ar,created_at,delivery_address,carts(name),order_items(product_name,quantity,unit_price_ar)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) ?? []));
  }, [user]);

  return (
    <div className="space-y-4 py-4">
      <h1 className="font-display text-3xl font-bold">Mes commandes</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune commande pour l'instant.</p>}
      {orders.map((o) => (
        <article key={o.id} className="card-pop space-y-2 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
              <p className="font-semibold">{o.mode === "pickup" ? `🛒 Retrait — ${o.carts?.name ?? "—"}` : `🛵 Livraison`}</p>
              {o.mode === "delivery" && <p className="text-xs text-muted-foreground">{o.delivery_address}</p>}
            </div>
            <Badge variant={o.status === "completed" ? "default" : "secondary"}>{statusLabel[o.status]}</Badge>
          </div>
          <ul className="text-sm text-muted-foreground">
            {o.order_items.map((it, i) => (
              <li key={i}>{it.quantity}× {it.product_name} — {formatAr(it.unit_price_ar * it.quantity)}</li>
            ))}
          </ul>
          <p className="text-right font-display text-lg font-bold text-primary">{formatAr(o.total_ar)}</p>
        </article>
      ))}
    </div>
  );
}
