/** Estados operativos de pedidos de mesa (admin / POS). */
export const PEDIDO_ESTADOS = [
  { value: "Ocupada", label: "En curso", grupo: "Sala" },
  { value: "Cuenta_pedida", label: "Cuenta pedida", grupo: "Sala" },
  { value: "Pagado", label: "Cobrado", grupo: "Sala" },
  { value: "Anulado", label: "Anulado", grupo: "Sala" },
  { value: "Cerrado", label: "Cerrado", grupo: "Sala" },
];

export function labelPedidoEstado(value) {
  return PEDIDO_ESTADOS.find((x) => x.value === value)?.label ?? value.replace(/_/g, " ");
}

export function pedidoBadgeClass(estado) {
  if (estado === "Anulado") return "badge badge--danger";
  if (estado === "Pagado" || estado === "Cerrado") return "badge badge--ok";
  if (estado === "Cuenta_pedida") return "badge badge--warn";
  return "badge badge--info";
}

export const METODO_PAGO_LABEL = {
  cash: "Efectivo",
  qr: "Yape / Plin",
  card: "Tarjeta",
};
