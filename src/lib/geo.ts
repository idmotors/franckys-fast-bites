// Geocoding & distance utilities (OpenStreetMap Nominatim)

export interface LatLng { lat: number; lng: number }

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function geocodeSearch(q: string, limit = 5): Promise<NominatimResult[]> {
  if (!q.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
  if (!res.ok) return [];
  return (await res.json()) as NominatimResult[];
}

export function deliveryFee(km: number): number {
  return km <= 15 ? 5000 : 10000;
}
