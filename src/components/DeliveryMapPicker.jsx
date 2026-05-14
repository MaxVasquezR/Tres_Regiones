import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const LIMA_DEFAULT = [-12.091, -77.035];

export default function DeliveryMapPicker({ lat, lng, onPositionChange }) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPosRef = useRef(onPositionChange);
  onPosRef.current = onPositionChange;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const la0 = Number(lat);
    const lo0 = Number(lng);
    const center = Number.isFinite(la0) && Number.isFinite(lo0) ? [la0, lo0] : [...LIMA_DEFAULT];

    const map = L.map(el, { zoomControl: true, scrollWheelZoom: true }).setView(center, 16);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: '<div class="delivery-map-pin" aria-hidden="true"></div>',
      iconSize: [34, 42],
      iconAnchor: [17, 40],
    });

    const mk = L.marker(center, { draggable: true, icon }).addTo(map);
    markerRef.current = mk;

    const emit = () => {
      const p = mk.getLatLng();
      onPosRef.current(p.lat, p.lng);
    };
    mk.on("dragend", emit);
    map.on("click", (e) => {
      mk.setLatLng(e.latlng);
      emit();
    });

    const t = window.setTimeout(() => map.invalidateSize(), 160);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapa se inicializa una vez al montar
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mk = markerRef.current;
    if (!map || !mk) return;
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    const cur = mk.getLatLng();
    if (Math.abs(cur.lat - la) < 1e-6 && Math.abs(cur.lng - lo) < 1e-6) return;
    mk.setLatLng([la, lo]);
    map.setView([la, lo], Math.max(map.getZoom(), 15), { animate: false });
  }, [lat, lng]);

  return <div ref={wrapRef} className="delivery-map-picker" />;
}
