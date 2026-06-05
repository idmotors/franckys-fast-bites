import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Vite asset URLs)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
  className?: string;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng]); }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function MapPicker({ lat, lng, onChange, height = 240, className }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={`rounded-xl border bg-secondary ${className ?? ""}`} style={{ height }} />;
  return (
    <div className={`overflow-hidden rounded-xl border ${className ?? ""}`} style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={16} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter lat={lat} lng={lng} />
        <ClickHandler onChange={onChange} />
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => { const m = e.target as L.Marker; const p = m.getLatLng(); onChange(p.lat, p.lng); },
          }}
        />
      </MapContainer>
      <p className="bg-secondary px-2 py-1 text-[10px] text-muted-foreground">Glissez le marqueur ou cliquez sur la carte pour ajuster</p>
    </div>
  );
}
