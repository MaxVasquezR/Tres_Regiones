import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tr_cart_v1";

const PROMOS_VALIDOS = {
  GUEPARDO: { pct: 10, label: "Guepardo -10%" },
  VELOZ28: { pct: 5, label: "Entrega veloz -5%" },
  REGIONES: { pct: 15, label: "Tres Regiones -15%", maxSoles: 35 },
};

const CartContext = createContext(null);

function parsePrecio(v) {
  if (typeof v === "number") return v;
  return Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        sedeId: typeof parsed.sedeId === "string" ? parsed.sedeId : null,
        promoCode: typeof parsed.promoCode === "string" ? parsed.promoCode : "",
      };
    }
  } catch {
    /* ignore */
  }
  return { items: [], sedeId: null, promoCode: "" };
}

export function CartProvider({ children }) {
  const initial = readState();
  const [items, setItems] = useState(initial.items);
  const [sedeId, setSedeId] = useState(initial.sedeId);
  const [promoCode, setPromoCode] = useState(initial.promoCode || "");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, sedeId, promoCode }));
  }, [items, sedeId, promoCode]);

  const addPlato = useCallback((plato, qty = 1, notas = "") => {
    const key = `p:${plato.id}:${notas}`;
    setItems((prev) => {
      const existing = prev.find((x) => x.key === key);
      if (existing) {
        return prev.map((x) => (x.key === key ? { ...x, qty: Math.min(30, x.qty + qty) } : x));
      }
      return [
        ...prev,
        {
          key,
          tipo: "plato",
          platoId: plato.id,
          nombre: plato.nombre,
          precioSoles: parsePrecio(plato.precio),
          qty: Math.min(30, Math.max(1, qty)),
          notas,
          imagen: plato.imagen || "",
        },
      ];
    });
  }, []);

  const addCombo = useCallback((combo, qty = 1) => {
    const key = `c:${combo.id}`;
    setItems((prev) => {
      const existing = prev.find((x) => x.key === key);
      if (existing) {
        return prev.map((x) => (x.key === key ? { ...x, qty: Math.min(30, x.qty + qty) } : x));
      }
      return [
        ...prev,
        {
          key,
          tipo: "combo",
          comboId: combo.id,
          nombre: combo.nombre,
          precioSoles: parsePrecio(combo.precioCombo),
          comboItems: combo.items || [],
          qty: Math.min(30, Math.max(1, qty)),
          notas: "",
          imagen: combo.imagen || "",
        },
      ];
    });
  }, []);

  const setQty = useCallback((key, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.key !== key)
        : prev.map((x) => (x.key === key ? { ...x, qty: Math.min(30, qty) } : x)),
    );
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const setSede = useCallback((id) => setSedeId(id || null), []);

  const subtotal = useMemo(() => items.reduce((s, x) => s + x.precioSoles * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  const promo = useMemo(() => {
    const key = String(promoCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return PROMOS_VALIDOS[key] ? { code: key, ...PROMOS_VALIDOS[key] } : null;
  }, [promoCode]);

  const descuentoSoles = useMemo(() => {
    if (!promo || subtotal <= 0) return 0;
    let d = Math.round(subtotal * (promo.pct / 100) * 100) / 100;
    if (promo.maxSoles != null) d = Math.min(d, promo.maxSoles);
    return d;
  }, [promo, subtotal]);

  const applyPromo = useCallback((code) => {
    const key = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!PROMOS_VALIDOS[key]) return { ok: false, error: "Código no válido. Prueba GUEPARDO, VELOZ28 o REGIONES." };
    setPromoCode(key);
    return { ok: true, promo: PROMOS_VALIDOS[key] };
  }, []);

  const clearPromo = useCallback(() => setPromoCode(""), []);

  const value = {
    items,
    sedeId,
    subtotal,
    descuentoSoles,
    promo,
    promoCode,
    applyPromo,
    clearPromo,
    count,
    addPlato,
    addCombo,
    setQty,
    removeItem,
    clear,
    setSede,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
