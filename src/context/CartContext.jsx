import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tr_cart_v1";

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
      };
    }
  } catch {
    /* ignore */
  }
  return { items: [], sedeId: null };
}

export function CartProvider({ children }) {
  const initial = readState();
  const [items, setItems] = useState(initial.items);
  const [sedeId, setSedeId] = useState(initial.sedeId);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, sedeId }));
  }, [items, sedeId]);

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

  const value = {
    items,
    sedeId,
    subtotal,
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
