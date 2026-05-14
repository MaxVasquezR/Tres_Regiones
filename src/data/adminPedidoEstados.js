/** Estados operativos de pedidos (admin). Deben coincidir con el servidor. */
export const PEDIDO_ESTADOS = [
  { value: "Pendiente_caja", label: "Pendiente · caja" },
  { value: "Pagado_simulado_tarjeta", label: "Pagado · tarjeta" },
  { value: "Pendiente_confirmacion_QR", label: "Pendiente · QR" },
  { value: "Confirmado_cocina", label: "Recibido · cocina" },
  { value: "Listo_recojo", label: "Listo · recojo" },
  { value: "En_reparto", label: "En reparto" },
  { value: "Entregado", label: "Entregado" },
  { value: "Cerrado", label: "Cerrado / cobrado" },
  { value: "Anulado", label: "Anulado" },
];

export function labelPedidoEstado(value) {
  return PEDIDO_ESTADOS.find((x) => x.value === value)?.label ?? value;
}

export function pedidoBadgeClass(estado) {
  if (estado === "Anulado") return "badge badge--danger";
  if (estado === "Entregado" || estado === "Cerrado" || estado === "Pagado_simulado_tarjeta") return "badge badge--ok";
  return "badge badge--warn";
}
