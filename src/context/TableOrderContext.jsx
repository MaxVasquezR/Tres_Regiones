import { createContext, useContext, useState, useCallback } from "react";

const TableOrderContext = createContext(null);

export function TableOrderProvider({ children }) {
  const [mesaActiva, setMesaActiva] = useState(null);
  const [items, setItems] = useState([]);

  const setMesa = useCallback((codigo) => {
    setMesaActiva(codigo);
    setItems([]);
  }, []);

  const addItem = useCallback((plato, qty, notas = "") => {
    setItems((prev) => {
      const existing = prev.find((x) => x.platoId === plato.id && x.notas === notas);
      if (existing) {
        return prev.map((x) =>
          x.platoId === plato.id && x.notas === notas
            ? { ...x, qty: Math.min(20, x.qty + qty) }
            : x,
        );
      }
      const unit = typeof plato.precio === "string"
        ? Number(plato.precio.replace(/[^0-9.]/g, ""))
        : Number(plato.precio || 0);
      return [...prev, { platoId: plato.id, nombre: plato.nombre, precioSoles: unit, qty, notas }];
    });
  }, []);

  const setQty = useCallback((platoId, notas, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((x) => !(x.platoId === platoId && x.notas === notas)));
    } else {
      setItems((prev) =>
        prev.map((x) => (x.platoId === platoId && x.notas === notas ? { ...x, qty: Math.min(20, qty) } : x)),
      );
    }
  }, []);

  const removeItem = useCallback((platoId, notas) => {
    setItems((prev) => prev.filter((x) => !(x.platoId === platoId && x.notas === notas)));
  }, []);

  const clearComanda = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = items.reduce((s, x) => s + x.precioSoles * x.qty, 0);

  return (
    <TableOrderContext.Provider
      value={{ mesaActiva, setMesa, items, addItem, setQty, removeItem, clearComanda, subtotal }}
    >
      {children}
    </TableOrderContext.Provider>
  );
}

export function useTableOrder() {
  const ctx = useContext(TableOrderContext);
  if (!ctx) throw new Error("useTableOrder debe usarse dentro de TableOrderProvider");
  return ctx;
}
