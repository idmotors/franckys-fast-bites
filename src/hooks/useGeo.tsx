import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface GeoCtx {
  pos: { lat: number; lng: number } | null;
  error: string | null;
  request: () => void;
  busy: boolean;
}

const Ctx = createContext<GeoCtx>({ pos: null, error: null, request: () => {}, busy: false });
const KEY = "franckys_geo";

export function GeoProvider({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {}
  }, []);

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Géolocalisation non disponible.");
      return;
    }
    setBusy(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(v);
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(err.code === 1 ? "Activez votre localisation pour utiliser l'app." : "Impossible d'obtenir votre position.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return <Ctx.Provider value={{ pos, error, request, busy }}>{children}</Ctx.Provider>;
}

export const useGeo = () => useContext(Ctx);
