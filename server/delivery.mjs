/** Lógica de cobertura y tiempos de delivery, aislada para pruebas. */

/** Normaliza un distrito para comparar (sin acentos, minúsculas, espacios colapsados). */
export function distritoClave(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sedeActiva(store, sedeId) {
  return (store.sedes || []).find((s) => s.id === sedeId && s.activa !== false) || null;
}

/** Devuelve la zona de delivery activa que cubre un distrito, o null si no hay cobertura. */
export function zonaPorDistrito(store, distrito) {
  const clave = distritoClave(distrito);
  if (!clave) return null;
  return (
    (store.zonasDelivery || []).find((z) => z.activa !== false && distritoClave(z.distrito) === clave) || null
  );
}

/** ETA aproximado: rango base de la zona + recargo por cola de cocina de la sede. */
export function calcularEta(store, sedeId, zona) {
  const min = Number(zona?.minutosMin) || 25;
  const max = Number(zona?.minutosMax) || 40;
  const enCola = (store.comandas || []).filter(
    (c) => c.sedeId === sedeId && ["Pendiente_cocina", "En_preparacion"].includes(c.estado),
  ).length;
  const recargo = Math.floor(enCola / 2) * 3;
  const etaMin = min + recargo;
  const etaMax = max + recargo;
  return { etaMin, etaMax, etaTexto: `${etaMin}–${etaMax} min` };
}
