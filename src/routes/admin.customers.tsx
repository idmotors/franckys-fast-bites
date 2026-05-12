import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/customers")({ component: AdminCustomers });

function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, any[]>>({});

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) { setCustomers([]); return; }
      const { data: p } = await supabase.from("profiles").select("user_id,full_name,phone,created_at").in("user_id", ids).order("created_at", { ascending: false });
      setCustomers(p ?? []);
    })();
  }, []);

  const toggle = async (uid: string) => {
    if (open === uid) { setOpen(null); return; }
    setOpen(uid);
    if (!orders[uid]) {
      const { data } = await supabase.from("orders").select("id,mode,status,total_ar,created_at").eq("user_id", uid).order("created_at", { ascending: false });
      setOrders((o) => ({ ...o, [uid]: data ?? [] }));
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-bold">Clients ({customers.length})</h2>
      {customers.map((c) => (
        <div key={c.user_id} className="card-pop rounded-xl">
          <button onClick={() => toggle(c.user_id)} className="flex w-full items-center gap-3 p-3 text-left">
            <div className="flex-1">
              <p className="font-semibold">{c.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{c.phone ?? ""}</p>
            </div>
            <Badge variant="secondary">{open === c.user_id ? "▾" : "▸"}</Badge>
          </button>
          {open === c.user_id && (
            <div className="space-y-1 border-t p-3 text-sm">
              {(orders[c.user_id] ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <span>{new Date(o.created_at).toLocaleDateString("fr-FR")} · {o.mode} · {o.status}</span>
                  <span className="font-bold text-primary">{formatAr(o.total_ar)}</span>
                </div>
              ))}
              {(orders[c.user_id]?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">Aucune commande.</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
