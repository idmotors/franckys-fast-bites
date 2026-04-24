import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { formatAr } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Panier vide</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajoutez vos hot-dogs préférés.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button className="btn-hero">Voir le menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <h1 className="font-display text-3xl font-bold">Mon panier</h1>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="card-pop flex items-center gap-3 rounded-2xl p-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-2xl">🌭</div>
            <div className="flex-1">
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-primary font-bold">{formatAr(i.price_ar)}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border bg-background p-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.id, i.quantity - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.id, i.quantity + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(i.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="card-pop flex items-center justify-between rounded-2xl p-4">
        <span className="font-display text-lg">Total</span>
        <span className="font-display text-2xl font-bold text-primary">{formatAr(total)}</span>
      </div>

      <Link to="/checkout" className="block">
        <Button className="btn-hero w-full" size="lg">Passer la commande</Button>
      </Link>
    </div>
  );
}
