import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/locate")({
  component: Locate,
});

interface Cart { id: string; name: string; address: string; latitude: number; longitude: number; }

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function Locate() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [nearest, setNearest] = useState<(Cart & { km: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);

  useEffect(() => {
    supabase.from("carts").select("*").eq("active", true).then(({ data }) => {
      setCarts((data as Cart[]) ?? []);
    });
  }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas disponible sur votre appareil.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUser(u);
        if (carts.length > 0) {
          const withDist = carts.map((c) => ({ ...c, km: distKm(u, { lat: c.latitude, lng: c.longitude }) }));
          withDist.sort((a, b) => a.km - b.km);
          setNearest(withDist[0]);
        }
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        const msg = err.code === 1
          ? "Vous avez refusé l'accès à votre position. Activez la localisation pour utiliser cette fonctionnalité."
          : "Impossible d'obtenir votre position.";
        setError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Init Leaflet when nearest is set
  useEffect(() => {
    if (!nearest || !user || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // Fix marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (cancelled || !mapRef.current) return;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
      const map = L.map(mapRef.current).setView([user.lat, user.lng], 14);
      mapInst.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      L.marker([user.lat, user.lng]).addTo(map).bindPopup("📍 Vous êtes ici").openPopup();
      L.marker([nearest.latitude, nearest.longitude]).addTo(map).bindPopup(`🌭 ${nearest.name}`);
      const bounds = L.latLngBounds([
        [user.lat, user.lng],
        [nearest.latitude, nearest.longitude],
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
    })();
    return () => {
      cancelled = true;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, [nearest, user]);

  return (
    <div className="space-y-5 py-4">
      <h1 className="font-display text-3xl font-bold">Charriot le plus proche</h1>

      {!user && (
        <div className="card-pop space-y-3 rounded-2xl p-6 text-center">
          <MapPin className="mx-auto h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">
            Activez votre localisation pour trouver le charriot Francky's le plus proche de vous.
          </p>
          <Button onClick={locate} className="btn-hero" size="lg" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Localiser le charriot le plus proche de ma position
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {nearest && (
        <div className="card-pop space-y-3 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Le plus proche</p>
              <h2 className="font-display text-xl font-bold">{nearest.name}</h2>
              <p className="text-sm text-muted-foreground">{nearest.address}</p>
            </div>
            <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              {nearest.km.toFixed(1)} km
            </span>
          </div>
        </div>
      )}

      <div ref={mapRef} className="h-[400px] w-full overflow-hidden rounded-2xl border" style={{ display: nearest ? "block" : "none" }} />

      {carts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-lg font-semibold">Tous nos charriots</h3>
          {carts.map((c) => (
            <div key={c.id} className="card-pop rounded-xl p-3">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.address}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
