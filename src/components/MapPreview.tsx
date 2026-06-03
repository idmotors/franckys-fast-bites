interface Props { lat: number; lng: number; height?: number; className?: string }

export function MapPreview({ lat, lng, height = 200, className }: Props) {
  const d = 0.005;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div className={`overflow-hidden rounded-xl border ${className ?? ""}`}>
      <iframe
        title="map"
        src={src}
        style={{ width: "100%", height, border: 0 }}
        loading="lazy"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
        target="_blank"
        rel="noreferrer"
        className="block bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:underline"
      >
        Voir en plein écran ↗
      </a>
    </div>
  );
}
