/** Mapa ilustrado de ruta sede → cliente (progreso 0–100). */
export default function TrackingRouteMap({ progreso = 0, distrito = "", sedeNombre = "" }) {
  const pct = Math.min(100, Math.max(0, Number(progreso) || 0));

  return (
    <div className="track-route-map card" aria-label="Ruta de entrega ilustrada">
      <div className="track-route-map__header">
        <span className="track-route-map__from" title={sedeNombre || "Sede"}>
          🏪 {sedeNombre ? sedeNombre.split("·")[0].trim() : "Sede"}
        </span>
        <span className="track-route-map__to" title={distrito || "Tu dirección"}>
          📍 {distrito || "Tu puerta"}
        </span>
      </div>
      <div className="track-route-map__canvas">
        <svg className="track-route-map__svg" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
          <path
            className="track-route-map__road"
            d="M 24 88 Q 120 20 200 60 T 376 40"
            fill="none"
            strokeWidth="8"
          />
          <path
            className="track-route-map__road track-route-map__road--done"
            d="M 24 88 Q 120 20 200 60 T 376 40"
            fill="none"
            strokeWidth="8"
            pathLength="100"
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        <span
          className="track-route-map__rider"
          style={{ left: `calc(${pct}% - 18px)` }}
          aria-hidden
        >
          🐆
        </span>
      </div>
      <p className="track-route-map__hint hint">
        {pct >= 100 ? "Tu pedido llegó a destino" : pct >= 60 ? "Guepardo en tu zona" : "Saliendo de cocina hacia ti"}
      </p>
    </div>
  );
}
