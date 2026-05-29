import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiGet } from "../api";

const LIMA_NORTE = { lat: -11.9756, lng: -77.0719 };

const markerIcon = L.divIcon({
  className: "delivery-map-pin",
  html: "<span>📍</span>",
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

export default function DeliveryMapPicker({ onLocation }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [resolving, setResolving] = useState(false);
  const [hint, setHint] = useState("");

  const resolver = async (lat, lng) => {
    setResolving(true);
    setHint("Ubicando tu dirección…");
    try {
      const res = await apiGet(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      const data = res.data || {};
      onLocation?.({ lat, lng, ...data });
      setHint(
        data.cobertura
          ? `Entrega disponible en ${data.distrito} ⚡`
          : `Aún no llegamos a ${data.distrito || "esa zona"}. Elige tu distrito manualmente.`,
      );
    } catch {
      setHint("No pudimos ubicar la dirección. Elige tu distrito manualmente.");
      onLocation?.({ lat, lng, cobertura: false });
    } finally {
      setResolving(false);
    }
  };

  const moverMarcador = (lat, lng, recenter = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e) => {
        const { lat: dlat, lng: dlng } = e.target.getLatLng();
        void resolver(dlat, dlng);
      });
    }
    if (recenter) map.setView([lat, lng], 16);
  };

  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true }).setView([LIMA_NORTE.lat, LIMA_NORTE.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e) => {
      moverMarcador(e.latlng.lat, e.latlng.lng);
      void resolver(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Inicializa el mapa una sola vez; los handlers usan refs estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setHint("Tu navegador no permite geolocalización. Elige tu distrito manualmente.");
      return;
    }
    setResolving(true);
    setHint("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        moverMarcador(latitude, longitude, true);
        void resolver(latitude, longitude);
      },
      () => {
        setResolving(false);
        setHint("No autorizaste la ubicación. Marca el punto en el mapa o elige tu distrito.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="delivery-map-picker">
      <div className="delivery-map-picker__map" ref={mapEl} aria-label="Mapa de ubicación de entrega" />
      <div className="delivery-map-picker__bar">
        <button type="button" className="btn btn--surface btn--sm" onClick={usarMiUbicacion} disabled={resolving}>
          {resolving ? "Ubicando…" : "📍 Usar mi ubicación"}
        </button>
        {hint && <span className="delivery-map-picker__hint">{hint}</span>}
      </div>
    </div>
  );
}
