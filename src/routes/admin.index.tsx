import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminOrders,
});

interface Order {
  id: string; phone: string; mode: string; status: string; total_ar: number; created_at: string;
  delivery_address: string | null; notes: string | null;
  carts: { name: string } | null;
  order_items: { product_name: string; quantity: number; unit_price_ar: number }[];
}

const STATUSES = ["pending", "validated", "preparing", "ready", "completed", "cancelled"];
const labels: Record<string, string> = {
  pending: "En attente", validated: "Validée", preparing: "Préparation",
  ready: "Prête", completed: "Livrée", cancelled: "Annulée",
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = () => {
    let q = supabase.from("orders").select("*,carts(name),order_items(*)").order("created_at", { ascending: false });
    q.then(({ data }) => setOrders((data as any) ?? []));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Statut mis à jour"); load(); }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} commande(s)</span>
      </div>

      {filtered.map((o) => (
        <article key={o.id} className="card-pop space-y-2 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
              <p className="font-semibold">
                {o.mode === "pickup" ? `🛒 Retrait — ${o.carts?.name ?? "—"}` : `🛵 Livraison`}
              </p>
              <p className="text-sm">📞 <a href={`tel:${o.phone}`} className="text-primary underline">{o.phone}</a></p>
              {o.mode === "delivery" && <p className="text-xs text-muted-foreground">📍 {o.delivery_address}</p>}
              {o.notes && <p className="text-xs italic text-muted-foreground">« {o.notes} »</p>}
            </div>
            <Badge>{labels[o.status]}</Badge>
          </div>
          <ul className="text-sm">
            {o.order_items.map((it, i) => (
              <li key={i}>{it.quantity}× {it.product_name}</li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="font-display text-lg font-bold text-primary">{formatAr(o.total_ar)}</span>
            <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </article>
      ))}
      {filtered.length === 0 && <p className="py-8 text-center text-muted-foreground">Aucune commande.</p>}
    </div>
  );
}
