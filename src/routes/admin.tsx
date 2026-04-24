import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingBag, Package, Truck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !isAdmin) return <p className="py-12 text-center text-muted-foreground">Vérification…</p>;

  return (
    <div className="space-y-5 py-4">
      <div>
        <p className="text-xs uppercase text-primary">Back-office</p>
        <h1 className="font-display text-3xl font-bold">Admin Francky's</h1>
      </div>
      <nav className="grid grid-cols-3 gap-2">
        <Link to="/admin" activeProps={{ className: "bg-primary text-primary-foreground" }} activeOptions={{ exact: true }} className="card-pop flex flex-col items-center gap-1 rounded-xl p-3 text-sm font-semibold">
          <ShoppingBag className="h-5 w-5" /> Commandes
        </Link>
        <Link to="/admin/products" activeProps={{ className: "bg-primary text-primary-foreground" }} className="card-pop flex flex-col items-center gap-1 rounded-xl p-3 text-sm font-semibold">
          <Package className="h-5 w-5" /> Produits
        </Link>
        <Link to="/admin/carts" activeProps={{ className: "bg-primary text-primary-foreground" }} className="card-pop flex flex-col items-center gap-1 rounded-xl p-3 text-sm font-semibold">
          <Truck className="h-5 w-5" /> Charriots
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
