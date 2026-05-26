import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Package, Truck, Users, UserCog, Boxes, ContactRound, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, isBO, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isBO) navigate({ to: "/" });
  }, [user, isBO, loading, navigate]);

  if (loading || !isBO) return <p className="py-12 text-center text-muted-foreground">Vérification…</p>;

  const Item = ({ to, icon: Icon, label, exact }: any) => (
    <Link
      to={to}
      activeProps={{ className: "!bg-primary !text-primary-foreground !bg-none shadow-[var(--shadow-pop)] ring-2 ring-primary" }}
      activeOptions={exact ? { exact: true } : undefined}
      className="card-pop flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold text-foreground transition-colors"
    >
      <Icon className="h-5 w-5" /> {label}
    </Link>
  );

  return (
    <div className="space-y-5 py-4">
      <div>
        <p className="text-xs uppercase text-primary">Back-office</p>
        <h1 className="font-display text-3xl font-bold">Admin Francky's</h1>
      </div>
      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-7">
        <Item to="/admin" icon={LayoutDashboard} label="Tableau" exact />
        <Item to="/admin/products" icon={Package} label="Produits" />
        <Item to="/admin/carts" icon={Truck} label="Charriots" />
        <Item to="/admin/stocks" icon={Boxes} label="Stocks" />
        <Item to="/admin/cart-managers" icon={UserCog} label="Gest. charriot" />
        {isAdmin && <Item to="/admin/users" icon={Users} label="Utilisateurs" />}
        <Item to="/admin/customers" icon={ContactRound} label="Clients" />
      </nav>
      <Outlet />
    </div>
  );
}
