import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas chez Francky's.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="btn-hero inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { name: "theme-color", content: "#d63a2f" },
      { title: "Francky's — Hot-Dogs à Antananarivo" },
      { name: "description", content: "Commandez vos hot-dogs Francky's : livraison ou retrait au charriot le plus proche." },
      { property: "og:title", content: "Francky's — Hot-Dogs" },
      { property: "og:description", content: "Commandez vos hot-dogs Francky's : livraison ou retrait au charriot." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <CartProvider>
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
          <Outlet />
        </main>
        <Toaster richColors position="top-center" />
      </CartProvider>
    </AuthProvider>
  );
}
