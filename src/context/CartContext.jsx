import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tres_regiones_cart_v1";
const DELIVERY_FEE = 10;

const emptyDireccion = () => ({
  calle: "",
  distrito: "",
  urbanizacion: "",
  referencia: "",
  lat: null,
  lng: null,
  fuente: "",
});

function parsePrecioSoles(precioStr) {
  const m = String(precioStr ?? "")
    .replace(/,/g, ".")
    .match(/(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : 0;
}

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const stored = typeof sessionStorage !== "undefined" ? loadStored() : null;
  const [items, setItems] = useState(() => (Array.isArray(stored?.items) ? stored.items : []));
  const [delivery, setDelivery] = useState(Boolean(stored?.delivery));
  const [direccion, setDireccion] = useState(() => {
    const s = stored?.direccion && typeof stored.direccion === "object" ? stored.direccion : {};
    const base = emptyDireccion();
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    const fu = String(s.fuente || "").toLowerCase();
    return {
      ...base,
      ...s,
      lat: Number.isFinite(lat) ? Math.round(lat * 1e6) / 1e6 : null,
      lng: Number.isFinite(lng) ? Math.round(lng * 1e6) / 1e6 : null,
      fuente: fu === "gps" || fu === "mapa" || fu === "manual" ? fu : "",
    };
  });

  useEffect(() => {
    const payload = { items, delivery, direccion };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [items, delivery, direccion]);

  const countPlatos = useMemo(() => items.reduce((n, x) => n + x.qty, 0), [items]);

  const subtotalSoles = useMemo(
    () => Math.round(items.reduce((s, x) => s + x.precioSoles * x.qty, 0) * 100) / 100,
    [items],
  );

  const deliverySoles = delivery ? DELIVERY_FEE : 0;
  const totalSoles = Math.round((subtotalSoles + deliverySoles) * 100) / 100;

  const addPlato = useCallback((plato) => {
    const precioSoles = parsePrecioSoles(plato.precio);
    if (precioSoles <= 0) return;
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.platoId === plato.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            platoId: plato.id,
            nombre: plato.nombre,
            precioDisplay: plato.precio,
            precioSoles,
            imagen: plato.imagen ?? "",
            qty: 1,
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: Math.min(20, next[idx].qty + 1) };
      return next;
    });
  }, []);

  const setQty = useCallback((platoId, qty) => {
    const q = Math.min(20, Math.max(0, Math.floor(Number(qty)) || 0));
    setItems((prev) => {
      if (q === 0) return prev.filter((x) => x.platoId !== platoId);
      return prev.map((x) => (x.platoId === platoId ? { ...x, qty: q } : x));
    });
  }, []);

  const removeLine = useCallback((platoId) => {
    setItems((prev) => prev.filter((x) => x.platoId !== platoId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDelivery(false);
    setDireccion(emptyDireccion());
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const mergeDireccion = useCallback((patch) => {
    setDireccion((d) => {
      const next = { ...d };
      if (patch.calle !== undefined) next.calle = String(patch.calle).slice(0, 160);
      if (patch.distrito !== undefined) next.distrito = String(patch.distrito).slice(0, 80);
      if (patch.urbanizacion !== undefined) next.urbanizacion = String(patch.urbanizacion).slice(0, 80);
      if (patch.referencia !== undefined) next.referencia = String(patch.referencia).slice(0, 200);
      if (patch.lat !== undefined) {
        const n = Number(patch.lat);
        next.lat = Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null;
      }
      if (patch.lng !== undefined) {
        const n = Number(patch.lng);
        next.lng = Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null;
      }
      if (patch.fuente !== undefined) {
        const f = String(patch.fuente).toLowerCase();
        next.fuente = f === "gps" || f === "mapa" || f === "manual" ? f : "";
      }
      if (patch.etiqueta && !String(d.referencia ?? "").trim()) {
        next.referencia = String(patch.etiqueta).slice(0, 200);
      }
      return next;
    });
  }, []);

  const setDireccionField = useCallback((key, value) => {
    setDireccion((d) => {
      if (key === "lat" || key === "lng") {
        const n = Number(value);
        return { ...d, [key]: Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null };
      }
      if (key === "fuente") {
        const f = String(value ?? "").toLowerCase();
        const ok = f === "gps" || f === "mapa" || f === "manual";
        return { ...d, fuente: ok ? f : "" };
      }
      const max =
        key === "referencia" ? 200 : key === "distrito" ? 80 : key === "urbanizacion" ? 80 : 160;
      return { ...d, [key]: String(value ?? "").slice(0, max) };
    });
  }, []);

  const value = useMemo(
    () => ({
      items,
      delivery,
      setDelivery,
      direccion,
      setDireccionField,
      mergeDireccion,
      addPlato,
      setQty,
      removeLine,
      clearCart,
      countPlatos,
      subtotalSoles,
      deliverySoles,
      totalSoles,
      deliveryFee: DELIVERY_FEE,
    }),
    [
      items,
      delivery,
      direccion,
      mergeDireccion,
      addPlato,
      setQty,
      removeLine,
      clearCart,
      countPlatos,
      subtotalSoles,
      deliverySoles,
      totalSoles,
      setDireccionField,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto al provider
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
