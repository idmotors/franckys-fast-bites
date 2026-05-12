import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/stocks")({ component: AdminStocks });

function AdminStocks() {
  const [carts, setCarts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [cartId, setCartId] = useState<string>("");

  const loadAll = async () => {
    const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("carts").select("id,name").order("name"),
      supabase.from("products").select("id,name,category").order("name"),
      supabase.from("cart_stocks").select("*"),
    ]);
    setCarts(c ?? []); setProducts(p ?? []); setStocks(s ?? []);
    if (!cartId && c?.[0]) setCartId(c[0].id);
  };
  useEffect(() => { loadAll(); }, []);

  const getQty = (pid: string) => stocks.find((s) => s.cart_id === cartId && s.product_id === pid)?.quantity ?? 0;

  const setQty = async (pid: string, qty: number) => {
    const existing = stocks.find((s) => s.cart_id === cartId && s.product_id === pid);
    if (existing) {
      await supabase.from("cart_stocks").update({ quantity: Math.max(0, qty) }).eq("id", existing.id);
    } else {
      await supabase.from("cart_stocks").insert({ cart_id: cartId, product_id: pid, quantity: Math.max(0, qty) });
    }
    loadAll();
  };

  return (
    <div className="space-y-4">
      <div className="card-pop rounded-2xl p-4">
        <label className="text-sm font-semibold">Charriot</label>
        <Select value={cartId} onValueChange={setCartId}>
          <SelectTrigger><SelectValue placeholder="Choisir un charriot" /></SelectTrigger>
          <SelectContent>{carts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {cartId && (
        <div className="space-y-2">
          {products.map((p) => {
            const q = getQty(p.id);
            return (
              <div key={p.id} className="card-pop flex items-center gap-3 rounded-xl p-3">
                <div className="flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <Input type="number" min="0" value={q} onChange={(e) => setQty(p.id, parseInt(e.target.value || "0", 10))} className="w-24" />
              </div>
            );
          })}
          {products.length === 0 && <p className="text-sm text-muted-foreground">Aucun produit.</p>}
        </div>
      )}
    </div>
  );
}
