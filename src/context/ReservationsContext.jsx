import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import { obtenerSesion } from "../session";
import { TOTAL_MESAS, TURNOS, mesasDisponibles } from "../data/salon";

const STORAGE_KEY = "sazon_reservas_v1";

const seedReservations = [
  {
    id: 1,
    cliente: "Valeria Quispe",
    telefono: "987112233",
    fecha: "2026-04-16",
    hora: "19:00",
    personas: 2,
    mesa: "M2",
    zona: "Salón principal",
    estado: "Confirmada",
    notas: "",
  },
  {
    id: 2,
    cliente: "Diego Huamán",
    telefono: "956778899",
    fecha: "2026-04-16",
    hora: "20:00",
    personas: 4,
    mesa: "M4",
    zona: "Salón principal",
    estado: "Pendiente",
    notas: "Cumpleaños",
  },
  {
    id: 3,
    cliente: "Lucía Fernández",
    telefono: "944556677",
    fecha: "2026-04-17",
    hora: "13:00",
    personas: 3,
    mesa: "M3",
    zona: "Salón principal",
    estado: "Confirmada",
    notas: "",
  },
  {
    id: 4,
    cliente: "Martín Rojas",
    telefono: "933445566",
    fecha: "2026-04-17",
    hora: "19:00",
    personas: 6,
    mesa: "M6",
    zona: "Terraza",
    estado: "Pendiente",
    notas: "",
  },
  {
    id: 5,
    cliente: "Paola Méndez",
    telefono: "988776655",
    fecha: "2026-04-18",
    hora: "14:00",
    personas: 2,
    mesa: "M1",
    zona: "Salón principal",
    estado: "Cancelada",
    notas: "Cliente canceló",
  },
];

const ReservationsContext = createContext(null);

function readLocalReservations() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...seedReservations];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...seedReservations];
  } catch {
    return [...seedReservations];
  }
}

function validateLocalReservation(payload, reservas) {
  const cliente = String(payload?.cliente ?? "").trim();
  const telefono = String(payload?.telefono ?? "").trim();
  const fecha = String(payload?.fecha ?? "").trim();
  const hora = String(payload?.hora ?? "").trim();
  const zona = String(payload?.zona ?? "").trim();
  const personas = Number(payload?.personas);

  if (!cliente || !telefono || !fecha || !hora || !zona || Number.isNaN(personas)) {
    throw new Error("Faltan campos obligatorios (cliente, teléfono, fecha, hora, personas, zona).");
  }
  if (cliente.length < 3 || cliente.length > 80) {
    throw new Error("El nombre del cliente debe tener entre 3 y 80 caracteres.");
  }
  if (!/^[0-9]{9}$/.test(telefono)) {
    throw new Error("El teléfono debe tener 9 dígitos.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error("La fecha debe estar en formato YYYY-MM-DD.");
  }
  const hoy = new Date();
  const hoyIso = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString().slice(0, 10);
  if (fecha < hoyIso) {
    throw new Error("No se permiten reservas para fechas pasadas.");
  }
  if (!["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"].includes(hora)) {
    throw new Error("La hora no pertenece a los turnos disponibles.");
  }
  if (!Number.isInteger(personas) || personas < 1 || personas > 8) {
    throw new Error("La cantidad de personas debe ser un número entero entre 1 y 8.");
  }
  if (!["Salón principal", "Terraza"].includes(zona)) {
    throw new Error("La zona no es válida.");
  }

  const duplicada = reservas.some(
    (r) =>
      !["Cancelada", "No show"].includes(r.estado) &&
      r.telefono === telefono &&
      r.fecha === fecha &&
      r.hora === hora,
  );
  if (duplicada) {
    throw new Error("Ya existe una reserva activa para ese cliente/teléfono en la misma fecha y hora.");
  }
}

export function ReservationsProvider({ children }) {
  const [reservas, setReservas] = useState([]);
  const [apiMode, setApiMode] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setReady(false);
    try {
      await apiGet("/api/health");
    } catch {
      setReservas(readLocalReservations());
      setApiMode(false);
      setReady(true);
      return;
    }

    const session = obtenerSesion();
    try {
      if (session?.role === "admin" && session?.token) {
        const json = await apiGet("/api/reservas", { auth: true });
        setReservas(Array.isArray(json.data) ? json.data : []);
      } else {
        const json = await apiGet("/api/reservas-publicas");
        setReservas(Array.isArray(json.data) ? json.data : []);
      }
      setApiMode(true);
    } catch {
      setReservas(readLocalReservations());
      setApiMode(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (apiMode) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
  }, [reservas, apiMode]);

  const createReservation = useCallback(
    async (payload) => {
      const body = {
        cliente: payload.cliente,
        telefono: payload.telefono,
        fecha: payload.fecha,
        hora: payload.hora,
        personas: payload.personas,
        zona: payload.zona,
        mesa: payload.mesa,
        notas: payload.notas ?? "",
        depositoPagado: payload.depositoPagado === true,
        idiomaPreferido: payload.idiomaPreferido ?? "",
        ocasion: payload.ocasion ?? "",
        restriccionAlimentaria: payload.restriccionAlimentaria ?? "",
        referenciaHotel: payload.referenciaHotel ?? "",
        horaLlegadaEstimada: payload.horaLlegadaEstimada ?? "",
      };

      if (apiMode) {
        const json = await apiPost("/api/reservas", body);
        const nueva = json.data;
        setReservas((prev) => [nueva, ...prev.filter((r) => r.id !== nueva.id)]);
        return nueva;
      }

      validateLocalReservation(body, reservas);
      if (!body.depositoPagado) {
        throw new Error("Debes confirmar el depósito de S/ 20 para separar la mesa.");
      }
      const mesaElegida =
        payload.mesa ||
        mesasDisponibles(reservas, {
          fecha: body.fecha,
          hora: body.hora,
          personas: body.personas,
          zona: body.zona,
        })[0]?.codigo;
      if (!mesaElegida) {
        throw new Error("No hay mesas disponibles para ese horario.");
      }
      const nueva = {
        ...payload,
        id: Date.now(),
        mesa: mesaElegida,
        estado: "Pendiente",
        depositoSoles: 20,
        depositoPagado: true,
        canal: "Web",
        idiomaPreferido: String(payload.idiomaPreferido ?? "").slice(0, 40),
        ocasion: String(payload.ocasion ?? "").slice(0, 80),
        restriccionAlimentaria: String(payload.restriccionAlimentaria ?? "").slice(0, 120),
        referenciaHotel: String(payload.referenciaHotel ?? "").slice(0, 120),
        horaLlegadaEstimada: String(payload.horaLlegadaEstimada ?? "").slice(0, 24),
        notasInternas: "",
      };
      setReservas((prev) => [nueva, ...prev]);
      return nueva;
    },
    [apiMode, reservas],
  );

  const updateReservationStatus = useCallback(
    async (id, estado) => {
      if (apiMode) {
        const json = await apiPatch(`/api/reservas/${id}`, { estado }, { auth: true });
        const actualizada = json.data;
        setReservas((prev) => prev.map((r) => (r.id === id ? actualizada : r)));
        return actualizada;
      }
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, estado } : r)));
      return { id, estado };
    },
    [apiMode],
  );

  const updateReservationDetails = useCallback(
    async (id, patch) => {
      if (apiMode) {
        const json = await apiPatch(`/api/reservas/${id}`, patch, { auth: true });
        const actualizada = json.data;
        setReservas((prev) => prev.map((r) => (r.id === id ? actualizada : r)));
        return actualizada;
      }
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { id, ...patch };
    },
    [apiMode],
  );

  const deleteReservation = useCallback(
    async (id) => {
      if (apiMode) {
        await apiDelete(`/api/reservas/${id}`, { auth: true });
        setReservas((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      setReservas((prev) => prev.filter((r) => r.id !== id));
    },
    [apiMode],
  );

  const dashboardStats = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const activas = (item) => !["Cancelada", "No show"].includes(item.estado);
    const reservasHoy = reservas.filter((item) => item.fecha === hoy && activas(item));
    const reservasHoyCount = reservasHoy.length;
    const confirmadas = reservas.filter((item) => item.estado === "Confirmada").length;
    const pendientes = reservas.filter((item) => item.estado === "Pendiente").length;
    const atendidas = reservas.filter((item) => item.estado === "Atendida").length;
    const noShows = reservas.filter((item) => item.estado === "No show").length;
    const canceladas = reservas.filter((item) => item.estado === "Cancelada").length;
    const clientesUnicos = new Set(reservas.map((item) => item.cliente).filter(Boolean)).size;
    const depositosCobrados = reservas
      .filter((item) => item.depositoPagado && item.estado !== "Cancelada")
      .reduce((sum, item) => sum + (Number(item.depositoSoles) || 20), 0);
    const mesasOcupadasHoy = new Set(reservasHoy.map((item) => item.mesa).filter(Boolean)).size;
    const ocupacionHoy = Math.round((mesasOcupadasHoy / TOTAL_MESAS) * 100);
    const ocupacionPorTurno = TURNOS.map((hora) => ({
      label: hora,
      value: reservas.filter((item) => item.fecha === hoy && item.hora === hora && activas(item)).length,
    }));
    const estados = ["Pendiente", "Confirmada", "Atendida", "No show", "Cancelada"].map((estado) => ({
      label: estado,
      value: reservas.filter((item) => item.estado === estado).length,
    }));
    const zonas = ["Salón principal", "Terraza"].map((zona) => ({
      label: zona,
      value: reservasHoy.filter((item) => item.zona === zona).length,
    }));
    const canales = ["Web", "Mostrador", "Teléfono", "Agencia", "OTAs", "Evento"]
      .map((canal) => ({
        label: canal,
        value: reservas.filter((item) => (item.canal || "Web") === canal && activas(item)).length,
      }))
      .filter((item) => item.value > 0);
    const proximasHoy = [...reservasHoy]
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(0, 6);

    return {
      reservasHoy: reservasHoyCount,
      confirmadas,
      pendientes,
      atendidas,
      noShows,
      canceladas,
      clientesUnicos,
      depositosCobrados,
      ocupacionHoy,
      mesasOcupadasHoy,
      ocupacionPorTurno,
      estados,
      zonas,
      canales,
      proximasHoy,
    };
  }, [reservas]);

  const value = {
    reservas,
    ready,
    apiMode,
    refresh,
    createReservation,
    updateReservationStatus,
    updateReservationDetails,
    deleteReservation,
    dashboardStats,
  };

  return <ReservationsContext.Provider value={value}>{children}</ReservationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error("useReservations debe usarse dentro de ReservationsProvider");
  return ctx;
}
