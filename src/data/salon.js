export const TURNOS = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"];

export const ZONAS = ["Salón principal", "Terraza"];

export const MESAS = [
  { codigo: "M1", capacidad: 2, zona: "Salón principal", etiqueta: "Ventana", ambiente: "Íntimo" },
  { codigo: "M2", capacidad: 2, zona: "Salón principal", etiqueta: "Pasillo", ambiente: "Íntimo" },
  { codigo: "M3", capacidad: 4, zona: "Salón principal", etiqueta: "Central", ambiente: "Familiar" },
  { codigo: "M4", capacidad: 4, zona: "Salón principal", etiqueta: "Chef view", ambiente: "Familiar" },
  { codigo: "M5", capacidad: 6, zona: "Terraza", etiqueta: "Jardín", ambiente: "Grupo" },
  { codigo: "M6", capacidad: 6, zona: "Terraza", etiqueta: "Atardecer", ambiente: "Grupo" },
];

/** Posiciones % dentro del canvas del plano (0–100) por zona — vista previa comercial / confirmación. */
export const PLANO_MESAS_POR_ZONA = {
  "Salón principal": [
    { codigo: "M1", x: 8, y: 10, w: 22, h: 24 },
    { codigo: "M2", x: 70, y: 10, w: 22, h: 24 },
    { codigo: "M3", x: 34, y: 38, w: 32, h: 28 },
    { codigo: "M4", x: 14, y: 72, w: 72, h: 18 },
  ],
  Terraza: [
    { codigo: "M5", x: 10, y: 28, w: 38, h: 44 },
    { codigo: "M6", x: 54, y: 22, w: 36, h: 50 },
  ],
};

export const TOTAL_MESAS = MESAS.length;

export function mesasOcupadas(reservas, fecha, hora) {
  return new Set(
    reservas
      .filter((reserva) => reserva.fecha === fecha && reserva.hora === hora && !["Cancelada", "No show"].includes(reserva.estado))
      .map((reserva) => reserva.mesa),
  );
}

export function mesasDisponibles(reservas, { fecha, hora, personas, zona }) {
  const ocupadas = mesasOcupadas(reservas, fecha, hora);
  return MESAS.filter(
    (mesa) => mesa.zona === zona && mesa.capacidad >= Number(personas) && !ocupadas.has(mesa.codigo),
  );
}
