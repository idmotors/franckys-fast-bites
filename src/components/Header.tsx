import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, MapPin, LayoutDashboard, LogOut, ClipboardList, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, isBO, isCartManager, signOut } = useAuth();
  const { count } = useCart();
  const loc = useLocation();
  const isAdminArea = loc.pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌭</span>
          <span className="font-display text-xl font-bold tracking-tight">Francky's</span>
          {isAdminArea && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">BO</span>}
        </Link>
        <nav className="flex items-center gap-1">
          {!isAdminArea && (
            <>
              <Link to="/locate"><Button variant="ghost" size="sm"><MapPin className="h-4 w-4" /></Button></Link>
              <Link to="/cart">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingBag className="h-4 w-4" />
                  {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>}
                </Button>
              </Link>
              {user && <Link to="/my-orders"><Button variant="ghost" size="sm"><ClipboardList className="h-4 w-4" /></Button></Link>}
            </>
          )}
          {isCartManager && <Link to="/cart-manager"><Button variant="ghost" size="sm" title="Gestionnaire charriot"><Truck className="h-4 w-4" /></Button></Link>}
          {isBO && <Link to="/admin"><Button variant="ghost" size="sm" title="Back-office"><LayoutDashboard className="h-4 w-4" /></Button></Link>}
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} title="Déconnexion"><LogOut className="h-4 w-4" /></Button>
          ) : (
            <Link to="/auth"><Button variant="ghost" size="sm"><UserIcon className="h-4 w-4" /></Button></Link>
          )}
        </nav>
      </div>
    </header>
  );
}
