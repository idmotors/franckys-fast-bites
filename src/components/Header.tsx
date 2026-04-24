import { Link } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, MapPin, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌭</span>
          <span className="font-display text-xl font-bold tracking-tight">
            Francky's
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/locate" className="hidden sm:flex">
            <Button variant="ghost" size="sm"><MapPin className="h-4 w-4" /></Button>
          </Link>
          <Link to="/cart">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4" /></Button>
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm"><UserIcon className="h-4 w-4" /></Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
