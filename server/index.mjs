import http from "node:http";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  hashPassword,
  hashPasswordDeterministic,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
} from "./auth.mjs";
import { distReady, tryServeStatic } from "./static.mjs";
import { distritoClave, sedeActiva, zonaPorDistrito, calcularEta } from "./delivery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_PATH = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, "data.json");
const SEED_PATH = path.join(__dirname, "seed.json");

function readPackageVersion() {
  try {
    const raw = fsSync.readFileSync(path.join(__dirname, "..", "package.json"), "utf8");
    const j = JSON.parse(raw);
    return String(j.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}
const APP_VERSION = readPackageVersion();

function normalizarUsuarioAdmin(u) {
  return String(u ?? "")
    .trim()
    .toLowerCase();
}

const JWT_SECRET = process.env.JWT_SECRET || "tres-regiones-dev-secret-cambiar";
const ADMIN_USER = normalizarUsuarioAdmin(process.env.ADMIN_USER || "admin");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const ADMIN_PEPPER = `admin:${ADMIN_USER}`;
const ADMIN_PASSWORD_HASH = hashPasswordDeterministic(ADMIN_PASSWORD, ADMIN_PEPPER);

const TOKEN_TTL_SEC = 60 * 60 * 24 * 7;
const CORS_EXPLICIT = String(process.env.CORS_ORIGIN ?? "").trim();
const RENDER_PUBLIC_URL = String(process.env.RENDER_EXTERNAL_URL ?? "").trim();
const CORS_ORIGIN = CORS_EXPLICIT || RENDER_PUBLIC_URL || "*";
const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES || 1024 * 64);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

function assertProductionSafe() {
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv !== "production") return;
  const secret = process.env.JWT_SECRET || "";
  if (!secret || secret === "tres-regiones-dev-secret-cambiar") {
    console.error(
      "[FATAL] NODE_ENV=production exige JWT_SECRET único (no use el secreto por defecto de desarrollo).",
    );
    process.exit(1);
  }
  const adminPwd = String(process.env.ADMIN_PASSWORD || "");
  if (adminPwd.length < 8) {
    console.warn("[WARN] ADMIN_PASSWORD corto en producción. Use al menos 8 caracteres fuertes.");
  }
  if (CORS_ORIGIN === "*") {
    console.warn(
      "[WARN] CORS_ORIGIN=* en producción. Defina el origen exacto del sitio (p. ej. https://su-dominio.com).",
    );
  }
}

const DEPOSITO_SOLES = 20;
const CANALES_VALIDOS = new Set(["Web", "Mostrador", "Teléfono", "Agencia", "OTAs", "Evento"]);
const ROLES_CUENTA = new Set(["Cliente", "Administrador", "Mozo"]);
const ESTADOS_CUENTA = new Set(["Activo", "Inactivo"]);
const ESTADOS_PEDIDO_ADMIN = new Set([
  "Ocupada",
  "Cuenta_pedida",
  "Pagado",
  "Anulado",
  "Cerrado",
]);

const COCINA_PIN = String(process.env.COCINA_PIN || "7890").replace(/\D/g, "");
const CATEGORIAS_PLATO = new Set(["Entradas", "Clásicos", "Norte", "Mar", "Especiales", "Postres"]);

const MESAS = [
  { codigo: "M1", capacidad: 2, zona: "Salón principal" },
  { codigo: "M2", capacidad: 2, zona: "Salón principal" },
  { codigo: "M3", capacidad: 4, zona: "Salón principal" },
  { codigo: "M4", capacidad: 4, zona: "Salón principal" },
  { codigo: "M5", capacidad: 6, zona: "Terraza" },
  { codigo: "M6", capacidad: 6, zona: "Terraza" },
];

const SEDES_DEFAULT = [
  {
    id: "olivos",
    nombre: "Tres Regiones · Los Olivos",
    distrito: "Los Olivos",
    direccion: "Av. Carlos Izaguirre 801, Los Olivos",
    telefono: "987 654 321",
    horario: "Lun a Dom · 11:00 – 23:00",
    lat: -11.9756,
    lng: -77.0719,
    activa: true,
  },
  {
    id: "smp",
    nombre: "Tres Regiones · San Martín de Porres",
    distrito: "San Martín de Porres",
    direccion: "Av. Perú 3450, San Martín de Porres",
    telefono: "987 654 322",
    horario: "Lun a Dom · 11:00 – 23:00",
    lat: -12.0089,
    lng: -77.0828,
    activa: true,
  },
  {
    id: "comas",
    nombre: "Tres Regiones · Comas",
    distrito: "Comas",
    direccion: "Av. Túpac Amaru 4100, Comas",
    telefono: "987 654 323",
    horario: "Lun a Dom · 11:00 – 23:00",
    lat: -11.9389,
    lng: -77.0619,
    activa: true,
  },
];

const REPARTIDORES_DEFAULT = [
  { id: "r-olivos-1", nombre: "Carlos Ñañez", sedeId: "olivos", vehiculo: "Moto Honda", placa: "M2-4821", activo: true },
  { id: "r-olivos-2", nombre: "Luis Béjar", sedeId: "olivos", vehiculo: "Moto Italika", placa: "M1-9034", activo: true },
  { id: "r-smp-1", nombre: "Rosa Inga", sedeId: "smp", vehiculo: "Moto Honda", placa: "M3-1177", activo: true },
  { id: "r-smp-2", nombre: "Pedro Mallqui", sedeId: "smp", vehiculo: "Moto Bajaj", placa: "M2-6620", activo: true },
  { id: "r-comas-1", nombre: "Jhon Ramírez", sedeId: "comas", vehiculo: "Moto Honda", placa: "M4-3390", activo: true },
  { id: "r-comas-2", nombre: "Milagros Soto", sedeId: "comas", vehiculo: "Moto Italika", placa: "M1-7745", activo: true },
];

const ZONAS_DELIVERY_DEFAULT = [
  { distrito: "Los Olivos", sedeId: "olivos", minutosMin: 20, minutosMax: 30, costoSoles: 5, activa: true },
  { distrito: "Independencia", sedeId: "olivos", minutosMin: 25, minutosMax: 35, costoSoles: 6, activa: true },
  { distrito: "San Martín de Porres", sedeId: "smp", minutosMin: 25, minutosMax: 35, costoSoles: 6, activa: true },
  { distrito: "Comas", sedeId: "comas", minutosMin: 30, minutosMax: 45, costoSoles: 7, activa: true },
  { distrito: "Carabayllo", sedeId: "comas", minutosMin: 35, minutosMax: 50, costoSoles: 8, activa: true },
];

const PROMOS_DEFAULT = [
  {
    id: 1,
    titulo: "Lunes de Lomo",
    descripcion: "Lomo saltado para dos + chicha morada de la casa. Solo lunes y martes.",
    imagen: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
    descuentoPct: 20,
    sedeId: null,
    activa: true,
  },
  {
    id: 2,
    titulo: "Ceviche Express ⚡",
    descripcion: "Ceviche clásico recién preparado, entregado en menos de 30 minutos o la próxima va por la casa.",
    imagen: "https://images.unsplash.com/photo-1627308595229-7830a5c18037?auto=format&fit=crop&w=1200&q=80",
    descuentoPct: 15,
    sedeId: null,
    activa: true,
  },
  {
    id: 3,
    titulo: "Antojo de la tarde",
    descripcion: "Picarones + crema volteada a precio especial entre las 3 y 6 p. m.",
    imagen: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=80",
    descuentoPct: 25,
    sedeId: null,
    activa: true,
  },
];

const COMBOS_DEFAULT = [
  {
    id: 1,
    nombre: "Combo Costa Guepardo",
    descripcion: "Ceviche clásico + tiradito de pescado + 2 chichas. Ideal para compartir.",
    imagen: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    items: [{ platoId: 9, qty: 1 }, { platoId: 5, qty: 1 }],
    precioCombo: 49,
    destacado: true,
    sedeIds: [],
    activa: true,
  },
  {
    id: 2,
    nombre: "Combo Criollo Veloz",
    descripcion: "Lomo saltado + ají de gallina + picarones. El clásico que llega volando.",
    imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    items: [{ platoId: 1, qty: 1 }, { platoId: 2, qty: 1 }, { platoId: 8, qty: 1 }],
    precioCombo: 55,
    destacado: true,
    sedeIds: [],
    activa: true,
  },
  {
    id: 3,
    nombre: "Combo Norteño",
    descripcion: "Arroz con pato + chicharrón norteño + crema volteada para dos.",
    imagen: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    items: [{ platoId: 3, qty: 1 }, { platoId: 15, qty: 1 }, { platoId: 12, qty: 2 }],
    precioCombo: 79,
    destacado: false,
    sedeIds: [],
    activa: true,
  },
  {
    id: 4,
    nombre: "Combo Familiar Tres Regiones",
    descripcion: "Lomo saltado + arroz con pato + seco de cordero + 4 postres. Para toda la familia.",
    imagen: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80",
    items: [{ platoId: 1, qty: 1 }, { platoId: 3, qty: 1 }, { platoId: 6, qty: 1 }, { platoId: 8, qty: 4 }],
    precioCombo: 139,
    destacado: true,
    sedeIds: [],
    activa: true,
  },
];

const ESTADOS_DELIVERY = new Set([
  "Recibido",
  "En_cocina",
  "Listo",
  "En_camino",
  "Entregado",
  "Anulado",
]);

let writeChain = Promise.resolve();
const rateBuckets = new Map();

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function requestIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const now = Date.now();
  const ip = requestIp(req);
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    const dir = path.dirname(DATA_PATH);
    await fs.mkdir(dir, { recursive: true });
    const seed = await fs.readFile(SEED_PATH, "utf8");
    await fs.writeFile(DATA_PATH, seed, "utf8");
  }
}

async function readStore() {
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw);
}

function writeStore(store) {
  writeChain = writeChain.then(() => fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8"));
  return writeChain;
}

function migrateCuentasClienteTelefono(store) {
  let dirty = false;
  for (const c of store.cuentas) {
    if (String(c.rol) !== "Cliente") continue;
    const demo = String(c.correo).toLowerCase() === "cliente@sazon.com";
    let tel = String(c.telefono ?? "").replace(/\D/g, "").slice(0, 9);
    if (demo && tel.length !== 9) {
      c.telefono = "999888777";
      tel = "999888777";
      dirty = true;
    }
    if (tel.length === 9 && !c.passwordHash) {
      c.passwordHash = hashPasswordDeterministic(tel, `cliente:tel:${tel}`);
      dirty = true;
    }
    if (demo && c.passwordHash && verifyPassword("123456", c.passwordHash)) {
      const t = String(c.telefono ?? "999888777").replace(/\D/g, "").slice(0, 9);
      c.passwordHash = hashPasswordDeterministic(t, `cliente:tel:${t}`);
      dirty = true;
    }
  }
  return dirty;
}

function migrateReservasCampos(store) {
  let dirty = false;
  for (const r of store.reservas) {
    if (r.depositoSoles === undefined) {
      r.depositoSoles = DEPOSITO_SOLES;
      r.depositoPagado = false;
      dirty = true;
    }
    if (r.canal === undefined) {
      r.canal = "Web";
      dirty = true;
    }
    if (r.idiomaPreferido === undefined) {
      r.idiomaPreferido = "";
      dirty = true;
    }
    if (r.ocasion === undefined) {
      r.ocasion = "";
      dirty = true;
    }
    if (r.restriccionAlimentaria === undefined) {
      r.restriccionAlimentaria = "";
      dirty = true;
    }
    if (r.referenciaHotel === undefined) {
      r.referenciaHotel = "";
      dirty = true;
    }
    if (r.horaLlegadaEstimada === undefined) {
      r.horaLlegadaEstimada = "";
      dirty = true;
    }
    if (r.notasInternas === undefined) {
      r.notasInternas = "";
      dirty = true;
    }
  }
  return dirty;
}

function optClamped(v, max) {
  return normalizarTexto(v).slice(0, max);
}

function normalizarCanal(v) {
  const c = normalizarTexto(v);
  return CANALES_VALIDOS.has(c) ? c : "Web";
}

function nextId(items) {
  const max = items.reduce((m, x) => (typeof x.id === "number" && x.id > m ? x.id : m), 0);
  return max + 1;
}

function ocupadasEnSlot(reservas, fecha, hora) {
  return new Set(
    reservas
      .filter((r) => r.fecha === fecha && r.hora === hora && !["Cancelada", "No show"].includes(r.estado))
      .map((r) => r.mesa),
  );
}

function primeraMesaDisponible(reservas, payload) {
  const ocupadas = ocupadasEnSlot(reservas, payload.fecha, payload.hora);
  const personas = Number(payload.personas);
  const zona = payload.zona;
  return MESAS.find((m) => m.zona === zona && m.capacidad >= personas && !ocupadas.has(m.codigo));
}

function normalizarTexto(v) {
  return String(v ?? "").trim();
}

/** Igualdad de nombre para login (sin acentos, colapsa espacios, minúsculas). */
function normalizeNombreClave(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function validarCorreo(correo) {
  const email = normalizarTexto(correo).toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { ok, value: email };
}

function validarTelefono(telefono) {
  const tel = normalizarTexto(telefono);
  const ok = /^[0-9]{9}$/.test(tel);
  return { ok, value: tel };
}

function validarFechaISO(fecha) {
  const raw = normalizarTexto(fecha);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (!ok) return { ok: false, value: raw };
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { ok: false, value: raw };
  return { ok: true, value: raw };
}

function esFechaPasada(fechaIso) {
  const hoy = new Date();
  const hoyIso = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString().slice(0, 10);
  return fechaIso < hoyIso;
}

function validarHora(hora) {
  const raw = normalizarTexto(hora);
  const permitidas = new Set(["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"]);
  return { ok: permitidas.has(raw), value: raw };
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) chunks.push(chunk);
  for (const chunk of chunks) total += chunk.length;
  if (total > BODY_LIMIT_BYTES) return "__body_too_large__";
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function parsePath(url) {
  const u = new URL(url, "http://127.0.0.1");
  return { pathname: u.pathname, searchParams: u.searchParams };
}

function readBearer(req) {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== "string") return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function authPayload(req) {
  const token = readBearer(req);
  if (!token) return null;
  return verifyAccessToken(token, JWT_SECRET);
}

function requireAdmin(req, res) {
  const p = authPayload(req);
  if (!p || p.role !== "admin") {
    json(res, 401, { error: "Se requiere sesión de administrador." });
    return null;
  }
  return p;
}

function requireClient(req, res) {
  const p = authPayload(req);
  if (!p || p.role !== "client") {
    json(res, 401, { error: "Se requiere sesión de cliente." });
    return null;
  }
  return p;
}

function requireMozoOrAdmin(req, res) {
  const p = authPayload(req);
  if (!p || (p.role !== "mozo" && p.role !== "admin")) {
    json(res, 401, { error: "Se requiere sesión de mozo o administrador." });
    return null;
  }
  return p;
}

function requireStaff(req, res) {
  const p = authPayload(req);
  if (!p || !["mozo", "admin", "cocina"].includes(p.role)) {
    json(res, 401, { error: "Se requiere sesión autorizada." });
    return null;
  }
  return p;
}

function ensurePedidosArray(store) {
  if (!Array.isArray(store.pedidos)) store.pedidos = [];
}

function ensureComandasArray(store) {
  if (!Array.isArray(store.comandas)) store.comandas = [];
}

function ensureMenuDelDia(store) {
  if (!store.menuDelDia || typeof store.menuDelDia !== "object") {
    store.menuDelDia = {
      activo: false,
      fecha: new Date().toISOString().slice(0, 10),
      precioSoles: 18,
      entrada: "",
      fondo: "",
      bebida: "",
      descripcion: "Menú del día",
    };
  }
}

function parsePrecioSoles(str) {
  const m = String(str ?? "")
    .replace(/,/g, ".")
    .match(/(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : 0;
}

function cuentaSinSecret(c) {
  const { passwordHash: _omit, ...rest } = c;
  return rest;
}

function reservasResumen(store) {
  return store.reservas.map((r) => ({
    id: r.id,
    fecha: r.fecha,
    hora: r.hora,
    mesa: r.mesa,
    estado: r.estado,
    zona: r.zona,
  }));
}

function migrateMozosDemo(store) {
  const hasMozo = store.cuentas.some((c) => c.rol === "Mozo");
  if (!hasMozo) {
    store.cuentas.push({
      id: nextId(store.cuentas),
      nombre: "Jorge Palomino",
      correo: "jorge@tresregiones.pe",
      rol: "Mozo",
      estado: "Activo",
      pin: "1234",
      turno: "Almuerzo",
    });
    store.cuentas.push({
      id: nextId(store.cuentas),
      nombre: "Ana Quispe",
      correo: "ana@tresregiones.pe",
      rol: "Mozo",
      estado: "Activo",
      pin: "5678",
      turno: "Noche",
    });
    return true;
  }
  return false;
}

function migratePlatosDisponible(store) {
  let dirty = false;
  for (const p of store.platos) {
    if (p.disponible === undefined) { p.disponible = true; dirty = true; }
    if (p.esMenuDelDia === undefined) { p.esMenuDelDia = false; dirty = true; }
  }
  return dirty;
}

/** Operación dual (sala + delivery): conserva pedidos de mesa y delivery con sedeId;
 *  descarta pedidos web legacy con esquema antiguo (sin tipo válido). */
function migrateOperacionDual(store) {
  let dirty = false;
  ensurePedidosArray(store);
  ensureComandasArray(store);
  const antes = store.pedidos.length;
  store.pedidos = store.pedidos.filter(
    (p) => p.tipo === "mesa" || (p.tipo === "delivery" && p.sedeId),
  );
  if (store.pedidos.length !== antes) dirty = true;
  return dirty;
}

function ensureSedesYDelivery(store) {
  let dirty = false;
  if (!Array.isArray(store.sedes) || store.sedes.length === 0) {
    store.sedes = SEDES_DEFAULT.map((s) => ({ ...s }));
    dirty = true;
  }
  if (!Array.isArray(store.zonasDelivery) || store.zonasDelivery.length === 0) {
    store.zonasDelivery = ZONAS_DELIVERY_DEFAULT.map((z) => ({ ...z }));
    dirty = true;
  }
  if (!Array.isArray(store.promociones) || store.promociones.length === 0) {
    store.promociones = PROMOS_DEFAULT.map((p) => ({ ...p }));
    dirty = true;
  }
  if (!Array.isArray(store.combos) || store.combos.length === 0) {
    store.combos = COMBOS_DEFAULT.map((c) => ({ ...c }));
    dirty = true;
  }
  if (!Array.isArray(store.repartidores) || store.repartidores.length === 0) {
    store.repartidores = REPARTIDORES_DEFAULT.map((r) => ({ ...r }));
    dirty = true;
  }
  return dirty;
}

/** Métricas públicas para la web (actividad en vivo, sin datos sensibles). */
function computePublicStats(store) {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayMs = dayStart.getTime();
  const hora = new Date().getHours();
  const deliveries = (store.pedidos || []).filter((p) => p.tipo === "delivery");
  const hoy = deliveries.filter((p) => {
    const t = new Date(p.creadoEn || p.actualizadoEn).getTime();
    return Number.isFinite(t) && t >= dayMs;
  });
  const entregados = deliveries.filter((p) => p.estado === "Entregado");
  let ultimoEntregaMin = null;
  const recientes = entregados
    .map((p) => new Date(p.entregadoEn || p.actualizadoEn || p.creadoEn).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a);
  if (recientes.length) {
    ultimoEntregaMin = Math.max(1, Math.round((now - recientes[0]) / 60000));
  }
  const enCurso = deliveries.filter((p) => p.estado && !["Entregado", "Anulado"].includes(p.estado)).length;
  const pedidosReales = hoy.filter((p) => p.estado !== "Anulado").length;
  const pulso = 8 + Math.floor(hora * 1.35) + (Math.floor(now / 120000) % 3);
  return {
    pedidosHoy: Math.max(pedidosReales, pulso),
    ultimoEntregaMin: ultimoEntregaMin ?? 5 + (Math.floor(now / 90000) % 14),
    enCurso: Math.max(enCurso, 1 + (Math.floor(now / 150000) % 4)),
    rating: 4.9,
    etaPromedio: 28,
    cocinaAbierta: hora >= 11 && hora < 23,
  };
}

/** Garantiza la cuenta de cliente demo (acceso de evaluación) con su clave = celular. */
function ensureClienteDemo(store) {
  if (!Array.isArray(store.cuentas)) store.cuentas = [];
  const existe = store.cuentas.find((c) => String(c.correo).toLowerCase() === "cliente@sazon.com");
  if (existe) return false;
  const telOcupado = store.cuentas.some((c) => String(c.telefono ?? "").replace(/\D/g, "") === "999888777");
  store.cuentas.push({
    id: nextId(store.cuentas),
    nombre: "Mayra Cliente Demo",
    correo: "cliente@sazon.com",
    rol: "Cliente",
    estado: "Activo",
    telefono: telOcupado ? "" : "999888777",
    passwordHash: hashPassword("999888777"),
  });
  return true;
}

/** Crea pedidos de delivery de ejemplo para el cliente demo (solo si no tiene historial). */
function ensureDemoDeliveries(store) {
  ensurePedidosArray(store);
  const demo = (store.cuentas || []).find((c) => String(c.correo).toLowerCase() === "cliente@sazon.com");
  if (!demo) return false;
  const yaTiene = store.pedidos.some((p) => p.tipo === "delivery" && Number(p.clienteId) === Number(demo.id));
  if (yaTiene) return false;

  const precioDe = (id) => parsePrecioSoles((store.platos.find((x) => x.id === id) || {}).precio);
  const nombreDe = (id) => (store.platos.find((x) => x.id === id) || {}).nombre || `Plato ${id}`;
  const linea = (id, qty, notas = "") => ({ platoId: id, nombre: nombreDe(id), precioSoles: precioDe(id), qty, notas });
  const mkCodigo = () => `TR-DLV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const hace = (dias, horas = 0) => new Date(Date.now() - dias * 86400000 - horas * 3600000).toISOString();

  const base = [
    {
      sedeId: "olivos",
      items: [linea(1, 1), linea(8, 2)],
      direccion: { calle: "Av. Carlos Izaguirre 1020", distrito: "Los Olivos", referencia: "Edificio Las Palmeras, dpto 302" },
      paymentMethod: "qr",
      estado: "Entregado",
      diasAtras: 9,
    },
    {
      sedeId: "smp",
      items: [linea(9, 1), linea(5, 1), linea(12, 2)],
      direccion: { calle: "Av. Perú 2900", distrito: "San Martín de Porres", referencia: "Frente al grifo Primax" },
      paymentMethod: "card",
      estado: "Entregado",
      diasAtras: 3,
    },
    {
      sedeId: "olivos",
      items: [linea(3, 1), linea(15, 1)],
      direccion: { calle: "Jr. Manco Cápac 150", distrito: "Los Olivos", referencia: "Casa con reja negra" },
      paymentMethod: "cash",
      estado: "En_camino",
      diasAtras: 0,
    },
  ];

  for (const b of base) {
    const sede = (store.sedes || []).find((s) => s.id === b.sedeId);
    const zona = (store.zonasDelivery || []).find((z) => z.sedeId === b.sedeId) || {};
    const subtotal = b.items.reduce((s, i) => s + i.precioSoles * i.qty, 0);
    const deliverySoles = Number(zona.costoSoles) || 5;
    const total = subtotal + deliverySoles;
    const creado = hace(b.diasAtras, b.diasAtras === 0 ? 0 : 1);
    const entregado = b.estado === "Entregado";
    store.pedidos.push({
      id: nextId(store.pedidos),
      tipo: "delivery",
      sedeId: b.sedeId,
      sedeNombre: sede?.nombre || b.sedeId,
      repartidor: pickRepartidor(store, b.sedeId),
      clienteId: demo.id,
      clienteNombre: demo.nombre,
      items: b.items,
      direccion: b.direccion,
      celularContacto: String(demo.telefono || "999888777"),
      paymentMethod: b.paymentMethod,
      pagado: b.paymentMethod !== "cash" || entregado,
      cardLast4: b.paymentMethod === "card" ? "4821" : null,
      codigoPago: mkCodigo(),
      qrPayload: null,
      subtotalSoles: subtotal,
      deliverySoles,
      totalSoles: total,
      etaMin: Number(zona.minutosMin) || 25,
      etaMax: Number(zona.minutosMax) || 40,
      etaTexto: `${Number(zona.minutosMin) || 25}–${Number(zona.minutosMax) || 40} min`,
      estado: b.estado,
      creadoEn: creado,
      pagadoEn: b.paymentMethod !== "cash" ? creado : entregado ? creado : null,
      entregadoEn: entregado ? creado : null,
    });
  }
  return true;
}

/** Elige un repartidor activo de la sede (rotación simple por carga del día). */
function pickRepartidor(store, sedeId) {
  const candidatos = (store.repartidores || []).filter((r) => r.sedeId === sedeId && r.activo !== false);
  if (!candidatos.length) return null;
  const idx = Math.floor(Math.random() * candidatos.length);
  const r = candidatos[idx];
  return { id: r.id, nombre: r.nombre, vehiculo: r.vehiculo, placa: r.placa };
}

function platoPublico(p) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    categoria: p.categoria,
    imagen: p.imagen,
    disponible: p.disponible !== false,
  };
}

const geoThrottleByIp = new Map();

function geoThrottle(ip, kind) {
  const key = `${ip}:${kind}`;
  const now = Date.now();
  const last = geoThrottleByIp.get(key) || 0;
  if (now - last < 900) return true;
  geoThrottleByIp.set(key, now);
  return false;
}

function direccionDesdeNominatimPlace(data) {
  const a = data?.address || {};
  const road = a.road || a.pedestrian || a.residential || a.path || "";
  const num = a.house_number || "";
  let calle = [road, num].filter(Boolean).join(" ").trim();
  if (!calle && data?.display_name) {
    calle = String(data.display_name).split(",").slice(0, 2).join(", ").trim();
  }
  const distrito =
    a.city_district ||
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.state ||
    "";
  const lat = Number(data?.lat);
  const lng = Number(data?.lon);
  return {
    calle: calle.slice(0, 160),
    distrito: String(distrito).slice(0, 80),
    etiqueta: String(data?.display_name || "").slice(0, 220),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

async function nominatimFetchJson(urlStr) {
  const res = await fetch(urlStr, {
    headers: {
      "User-Agent": "TresRegiones/1.0 (geocoding; +https://www.openstreetmap.org/copyright)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Geocoding HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const method = req.method || "GET";
  const url = req.url || "/";
  res.setHeader("X-Request-Id", requestId);
  securityHeaders(res);
  cors(res);
  if (isRateLimited(req)) {
    json(res, 429, { error: "Demasiadas solicitudes. Intenta nuevamente en unos segundos." });
    console.warn(`[${requestId}] 429 ${method} ${url} ip=${requestIp(req)}`);
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname } = parsePath(req.url || "/");

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      const staticOn = await distReady();
      let datastoreOk = false;
      try {
        await readStore();
        datastoreOk = true;
      } catch {
        datastoreOk = false;
      }
      const nodeEnv = process.env.NODE_ENV || "development";
      json(res, 200, {
        ok: true,
        service: "tres-regiones",
        version: APP_VERSION,
        port: PORT,
        static: staticOn,
        datastore: datastoreOk,
        env: nodeEnv,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/version") {
      json(res, 200, { service: "tres-regiones", version: APP_VERSION });
      return;
    }

    if (req.method === "GET" && pathname === "/api/platos") {
      const store = await readStore();
      json(res, 200, { data: store.platos.map(platoPublico) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/platos") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const nombre = normalizarTexto(body.nombre);
      const categoria = normalizarTexto(body.categoria);
      const precio = normalizarTexto(body.precio);
      if (nombre.length < 2) {
        json(res, 422, { error: "Nombre del plato obligatorio." });
        return;
      }
      if (!CATEGORIAS_PLATO.has(categoria)) {
        json(res, 422, { error: "Categoría no válida." });
        return;
      }
      if (parsePrecioSoles(precio) <= 0) {
        json(res, 422, { error: "Precio inválido (ej. S/ 28.00)." });
        return;
      }
      const store = await readStore();
      const plato = {
        id: nextId(store.platos),
        nombre: nombre.slice(0, 120),
        descripcion: normalizarTexto(body.descripcion).slice(0, 400),
        precio: precio.slice(0, 24),
        categoria,
        imagen: normalizarTexto(body.imagen).slice(0, 500) || "",
        disponible: body.disponible !== false,
      };
      store.platos.push(plato);
      await writeStore(store);
      json(res, 201, { data: platoPublico(plato) });
      return;
    }

    const platoIdPath = pathname.match(/^\/api\/platos\/(\d+)$/);
    if (platoIdPath && req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const id = Number(platoIdPath[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      const idx = store.platos.findIndex((p) => p.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Plato no encontrado." });
        return;
      }
      const cur = store.platos[idx];
      if (body.nombre !== undefined) cur.nombre = normalizarTexto(body.nombre).slice(0, 120);
      if (body.descripcion !== undefined) cur.descripcion = normalizarTexto(body.descripcion).slice(0, 400);
      if (body.precio !== undefined) {
        const pr = normalizarTexto(body.precio);
        if (parsePrecioSoles(pr) <= 0) {
          json(res, 422, { error: "Precio inválido." });
          return;
        }
        cur.precio = pr.slice(0, 24);
      }
      if (body.categoria !== undefined) {
        const cat = normalizarTexto(body.categoria);
        if (!CATEGORIAS_PLATO.has(cat)) {
          json(res, 422, { error: "Categoría no válida." });
          return;
        }
        cur.categoria = cat;
      }
      if (body.imagen !== undefined) cur.imagen = normalizarTexto(body.imagen).slice(0, 500);
      if (body.disponible !== undefined) cur.disponible = Boolean(body.disponible);
      await writeStore(store);
      json(res, 200, { data: platoPublico(cur) });
      return;
    }

    if (platoIdPath && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = Number(platoIdPath[1]);
      const store = await readStore();
      const idx = store.platos.findIndex((p) => p.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Plato no encontrado." });
        return;
      }
      store.platos.splice(idx, 1);
      await writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/pedidos") {
      if (!requireAdmin(req, res)) return;
      const store = await readStore();
      ensurePedidosArray(store);
      const { searchParams } = parsePath(req.url || "/");
      const tipoFilter = normalizarTexto(searchParams.get("tipo"));
      const sedeFilter = normalizarTexto(searchParams.get("sedeId"));
      let data = store.pedidos.filter((p) => p.tipo === "mesa" || p.tipo === "delivery");
      if (tipoFilter === "mesa" || tipoFilter === "delivery") {
        data = data.filter((p) => p.tipo === tipoFilter);
      }
      if (sedeFilter) {
        data = data.filter((p) => (p.sedeId || null) === sedeFilter);
      }
      json(res, 200, { data });
      return;
    }

    const pedidoIdMatch = pathname.match(/^\/api\/pedidos\/(\d+)$/);
    if (pedidoIdMatch && req.method === "PATCH") {
      if (!requireMozoOrAdmin(req, res)) return;
      const id = Number(pedidoIdMatch[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      ensurePedidosArray(store);
      const idx = store.pedidos.findIndex((p) => Number(p.id) === id);
      if (idx === -1) {
        json(res, 404, { error: "Pedido no encontrado." });
        return;
      }
      const cur = store.pedidos[idx];
      const next = { ...cur };
      if (body.estado === undefined && body.notasOperacion === undefined) {
        json(res, 422, { error: "Indica estado o notas de operación." });
        return;
      }
      if (body.estado !== undefined) {
        const es = String(body.estado ?? "").trim();
        if (!ESTADOS_PEDIDO_ADMIN.has(es)) {
          json(res, 422, { error: "Estado de pedido no válido." });
          return;
        }
        next.estado = es;
      }
      if (body.notasOperacion !== undefined) {
        next.notasOperacion = normalizarTexto(body.notasOperacion ?? "").slice(0, 500);
      }
      store.pedidos[idx] = next;
      await writeStore(store);
      json(res, 200, { data: store.pedidos[idx] });
      return;
    }

    if (pedidoIdMatch && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = Number(pedidoIdMatch[1]);
      const store = await readStore();
      ensurePedidosArray(store);
      const idx = store.pedidos.findIndex((p) => Number(p.id) === id);
      if (idx === -1) {
        json(res, 404, { error: "Pedido no encontrado." });
        return;
      }
      store.pedidos.splice(idx, 1);
      await writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/reservas-publicas") {
      const store = await readStore();
      json(res, 200, { data: reservasResumen(store) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/cuentas") {
      if (!requireAdmin(req, res)) return;
      const store = await readStore();
      json(res, 200, { data: store.cuentas.map(cuentaSinSecret) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/cuentas") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const nombre = normalizarTexto(body.nombre);
      const correoVal = validarCorreo(body.correo);
      const correo = correoVal.value;
      const rol = normalizarTexto(body.rol);
      const estado = normalizarTexto(body.estado) || "Activo";
      const contrasena = String(body.contrasena ?? "");
      const telefonoDigits = String(body.telefono ?? "").replace(/\D/g, "").slice(0, 9);
      const telOk = /^[0-9]{9}$/.test(telefonoDigits);
      if (!nombre || !correo) {
        json(res, 422, { error: "Nombre y correo son obligatorios." });
        return;
      }
      if (nombre.length < 3 || nombre.length > 80) {
        json(res, 422, { error: "El nombre debe tener entre 3 y 80 caracteres." });
        return;
      }
      if (!correoVal.ok) {
        json(res, 422, { error: "El correo no tiene un formato válido." });
        return;
      }
      if (!ROLES_CUENTA.has(rol)) {
        json(res, 422, { error: "Rol no válido." });
        return;
      }
      const pinMozo = String(body.pin ?? "").replace(/\D/g, "");
      if (rol === "Mozo") {
        if (pinMozo.length < 4 || pinMozo.length > 6) {
          json(res, 422, { error: "El mozo requiere un PIN de 4 a 6 dígitos." });
          return;
        }
      }
      if (!ESTADOS_CUENTA.has(estado)) {
        json(res, 422, { error: "Estado no válido (Activo o Inactivo)." });
        return;
      }
      if (rol === "Cliente" && contrasena.length > 0 && contrasena.length < 6) {
        json(res, 422, { error: "La contraseña debe tener al menos 6 caracteres, o déjala vacía y usa el celular (9 dígitos)." });
        return;
      }
      if (rol === "Cliente" && contrasena.length === 0 && !telOk) {
        json(res, 422, {
          error:
            "Para cliente indica un celular peruano de 9 dígitos (será su clave en la web) o una contraseña de al menos 6 caracteres.",
        });
        return;
      }
      const store = await readStore();
      if (store.cuentas.some((c) => String(c.correo).toLowerCase() === correo)) {
        json(res, 409, { error: "Ya existe una cuenta con ese correo." });
        return;
      }
      if (telOk && store.cuentas.some((c) => String(c.telefono ?? "").replace(/\D/g, "") === telefonoDigits)) {
        json(res, 409, { error: "Ya existe una cuenta con ese número de celular." });
        return;
      }
      const nueva = {
        id: nextId(store.cuentas),
        nombre,
        correo,
        rol,
        estado,
      };
      if (telOk) {
        nueva.telefono = telefonoDigits;
      }
      if (contrasena.length >= 6) {
        nueva.passwordHash = hashPassword(contrasena);
      } else if (rol === "Cliente" && telOk) {
        nueva.passwordHash = hashPassword(telefonoDigits);
      }
      if (rol === "Mozo") {
        nueva.pin = pinMozo;
        nueva.turno = normalizarTexto(body.turno || "General").slice(0, 40);
        if (store.cuentas.some((c) => c.rol === "Mozo" && c.pin === pinMozo)) {
          json(res, 409, { error: "Ya existe un mozo con ese PIN." });
          return;
        }
      }
      store.cuentas.push(nueva);
      await writeStore(store);
      json(res, 201, { data: cuentaSinSecret(nueva) });
      return;
    }

    const cuentaIdPath = pathname.match(/^\/api\/cuentas\/(\d+)$/);
    if (req.method === "PATCH" && cuentaIdPath) {
      if (!requireAdmin(req, res)) return;
      const id = Number(cuentaIdPath[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      const idx = store.cuentas.findIndex((c) => c.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Cuenta no encontrada." });
        return;
      }
      const cur = store.cuentas[idx];
      const next = { ...cur };
      if (body.nombre !== undefined) {
        const n = normalizarTexto(body.nombre);
        if (n.length < 3 || n.length > 80) {
          json(res, 422, { error: "El nombre debe tener entre 3 y 80 caracteres." });
          return;
        }
        next.nombre = n;
      }
      if (body.correo !== undefined) {
        const cv = validarCorreo(body.correo);
        if (!cv.ok) {
          json(res, 422, { error: "El correo no tiene un formato válido." });
          return;
        }
        if (store.cuentas.some((c, i) => i !== idx && String(c.correo).toLowerCase() === cv.value)) {
          json(res, 409, { error: "Ya existe otra cuenta con ese correo." });
          return;
        }
        next.correo = cv.value;
      }
      if (body.rol !== undefined) {
        const r = normalizarTexto(body.rol);
        if (!ROLES_CUENTA.has(r)) {
          json(res, 422, { error: "Rol no válido." });
          return;
        }
        next.rol = r;
      }
      if (body.estado !== undefined) {
        const e = normalizarTexto(body.estado);
        if (!ESTADOS_CUENTA.has(e)) {
          json(res, 422, { error: "Estado no válido." });
          return;
        }
        next.estado = e;
      }
      if (body.telefono !== undefined && String(next.rol) === "Cliente") {
        const t = String(body.telefono ?? "").replace(/\D/g, "").slice(0, 9);
        if (t.length !== 9) {
          json(res, 422, { error: "El celular del cliente debe tener exactamente 9 dígitos (omite el campo si no lo cambias)." });
          return;
        }
        if (store.cuentas.some((c, i) => i !== idx && String(c.telefono ?? "").replace(/\D/g, "") === t)) {
          json(res, 409, { error: "Ya existe otra cuenta con ese número de celular." });
          return;
        }
        next.telefono = t;
        if (!(body.contrasena !== undefined && String(body.contrasena).length > 0)) {
          next.passwordHash = hashPassword(t);
        }
      }
      if (body.contrasena !== undefined && String(body.contrasena).length > 0) {
        const pw = String(body.contrasena);
        if (pw.length < 6) {
          json(res, 422, { error: "La contraseña debe tener al menos 6 caracteres." });
          return;
        }
        next.passwordHash = hashPassword(pw);
      }
      store.cuentas[idx] = next;
      await writeStore(store);
      json(res, 200, { data: cuentaSinSecret(next) });
      return;
    }

    if (req.method === "DELETE" && cuentaIdPath) {
      if (!requireAdmin(req, res)) return;
      const id = Number(cuentaIdPath[1]);
      const store = await readStore();
      const idx = store.cuentas.findIndex((c) => c.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Cuenta no encontrada." });
        return;
      }
      const admins = store.cuentas.filter((c) => c.rol === "Administrador");
      if (admins.length === 1 && store.cuentas[idx].rol === "Administrador") {
        json(res, 409, { error: "No se puede eliminar el único usuario con rol Administrador en cuentas." });
        return;
      }
      store.cuentas.splice(idx, 1);
      await writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/local") {
      const store = await readStore();
      json(res, 200, { data: store.local });
      return;
    }

    if (req.method === "GET" && pathname === "/api/reservas") {
      if (!requireAdmin(req, res)) return;
      const store = await readStore();
      json(res, 200, { data: store.reservas });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const nombre = normalizarTexto(body.nombre);
      const telefonoDigits = String(body.telefono ?? "").replace(/\D/g, "").slice(0, 9);
      const telOk = /^[0-9]{9}$/.test(telefonoDigits);
      const correoRaw = normalizarTexto(body.correo);
      let correo = "";
      if (correoRaw) {
        const correoVal = validarCorreo(correoRaw);
        if (!correoVal.ok) {
          json(res, 422, { error: "El correo no tiene un formato válido." });
          return;
        }
        correo = correoVal.value;
      }
      const aceptaMarketingWhatsapp = Boolean(body.aceptaMarketingWhatsapp);
      if (!nombre || !telOk) {
        json(res, 422, { error: "Nombre completo y celular peruano (9 dígitos) son obligatorios." });
        return;
      }
      if (nombre.length < 3 || nombre.length > 80) {
        json(res, 422, { error: "El nombre debe tener entre 3 y 80 caracteres." });
        return;
      }
      if (aceptaMarketingWhatsapp && !telOk) {
        json(res, 422, {
          error: "Si aceptas promociones por WhatsApp, indica un celular peruano de 9 dígitos.",
        });
        return;
      }
      const store = await readStore();
      if (store.cuentas.some((c) => String(c.telefono ?? "").replace(/\D/g, "") === telefonoDigits)) {
        json(res, 409, { error: "Ya existe una cuenta con ese número de celular." });
        return;
      }
      if (correo && store.cuentas.some((c) => String(c.correo || "").toLowerCase() === correo)) {
        json(res, 409, { error: "Ya existe una cuenta con ese correo." });
        return;
      }
      const nueva = {
        id: nextId(store.cuentas),
        nombre,
        correo,
        rol: "Cliente",
        estado: "Activo",
        telefono: telefonoDigits,
        passwordHash: hashPassword(telefonoDigits),
        ...(aceptaMarketingWhatsapp ? { aceptaMarketingWhatsapp: true } : {}),
      };
      store.cuentas.push(nueva);
      await writeStore(store);
      json(res, 201, { data: cuentaSinSecret(nueva) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const nombreIn = normalizarTexto(body.nombre);
      const contrasenaDigits = String(body.contrasena ?? "").replace(/\D/g, "").slice(0, 9);
      if (!nombreIn || !/^[0-9]{9}$/.test(contrasenaDigits)) {
        json(res, 422, { error: "Nombre como lo registraste y celular de 9 dígitos (tu contraseña) son obligatorios." });
        return;
      }
      const store = await readStore();
      const candidatos = store.cuentas.filter(
        (c) =>
          String(c.rol) === "Cliente" &&
          String(c.estado) === "Activo" &&
          String(c.telefono ?? "").replace(/\D/g, "") === contrasenaDigits,
      );
      const cuenta = candidatos.find((c) => normalizeNombreClave(c.nombre) === normalizeNombreClave(nombreIn));
      if (!cuenta || !cuenta.passwordHash || !verifyPassword(contrasenaDigits, cuenta.passwordHash)) {
        json(res, 401, { error: "Credenciales incorrectas." });
        return;
      }
      const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
      const token = signAccessToken(
        {
          sub: cuenta.id,
          role: "client",
          email: cuenta.correo || "",
          nombre: cuenta.nombre,
          telefono: String(cuenta.telefono ?? "").replace(/\D/g, ""),
          exp,
        },
        JWT_SECRET,
      );
      json(res, 200, {
        token,
        user: {
          id: cuenta.id,
          nombre: cuenta.nombre,
          correo: cuenta.correo || "",
          telefono: String(cuenta.telefono ?? "").replace(/\D/g, ""),
          rol: cuenta.rol,
        },
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/admin-login") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const usuario = normalizarUsuarioAdmin(body.usuario);
      const contrasena = String(body.contrasena ?? "");
      if (!usuario || !contrasena) {
        json(res, 422, { error: "Usuario y contraseña son obligatorios." });
        return;
      }
      if (usuario !== ADMIN_USER || !verifyPassword(contrasena, ADMIN_PASSWORD_HASH)) {
        json(res, 401, { error: "Credenciales incorrectas." });
        return;
      }
      const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
      const token = signAccessToken({ sub: "admin", role: "admin", user: usuario, exp }, JWT_SECRET);
      json(res, 200, { token, user: { usuario, rol: "Administrador" } });
      return;
    }

    if (req.method === "POST" && pathname === "/api/reservas") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const act = authPayload(req);
      const isAdmin = act?.role === "admin";
      if (!isAdmin && body.depositoPagado !== true) {
        json(res, 422, {
          error:
            "Para separar la mesa confirma el depósito de S/ 20. Si no asistes en la fecha acordada, pierdes la reserva y el depósito no se reembolsa.",
        });
        return;
      }
      const { cliente, telefono, fecha, hora, personas, zona, notas } = body;
      if (!cliente || !telefono || !fecha || !hora || !zona || personas == null) {
        json(res, 422, { error: "Faltan campos obligatorios (cliente, teléfono, fecha, hora, personas, zona)." });
        return;
      }
      const clienteNorm = normalizarTexto(cliente);
      if (clienteNorm.length < 3 || clienteNorm.length > 80) {
        json(res, 422, { error: "El nombre del cliente debe tener entre 3 y 80 caracteres." });
        return;
      }
      const telVal = validarTelefono(telefono);
      if (!telVal.ok) {
        json(res, 422, { error: "El teléfono debe tener 9 dígitos." });
        return;
      }
      const fechaVal = validarFechaISO(fecha);
      if (!fechaVal.ok) {
        json(res, 422, { error: "La fecha debe estar en formato YYYY-MM-DD." });
        return;
      }
      if (esFechaPasada(fechaVal.value)) {
        json(res, 422, { error: "No se permiten reservas para fechas pasadas." });
        return;
      }
      const horaVal = validarHora(hora);
      if (!horaVal.ok) {
        json(res, 422, { error: "La hora no pertenece a los turnos disponibles." });
        return;
      }
      const personasNum = Number(personas);
      if (!Number.isInteger(personasNum) || personasNum < 1 || personasNum > 8) {
        json(res, 422, { error: "La cantidad de personas debe ser un número entero entre 1 y 8." });
        return;
      }
      const zonaNorm = normalizarTexto(zona);
      const zonasValidas = new Set(["Salón principal", "Terraza"]);
      if (!zonasValidas.has(zonaNorm)) {
        json(res, 422, { error: "La zona no es válida." });
        return;
      }
      const store = await readStore();
      const payload = {
        cliente: clienteNorm,
        telefono: telVal.value,
        fecha: fechaVal.value,
        hora: horaVal.value,
        personas: personasNum,
        zona: zonaNorm,
        notas: notas != null ? normalizarTexto(notas).slice(0, 200) : "",
      };
      const duplicada = store.reservas.some(
        (r) =>
          !["Cancelada", "No show"].includes(r.estado) &&
          r.telefono === payload.telefono &&
          r.fecha === payload.fecha &&
          r.hora === payload.hora,
      );
      if (duplicada) {
        json(res, 409, {
          error: "Ya existe una reserva activa para ese cliente/teléfono en la misma fecha y hora.",
        });
        return;
      }
      const ocupadas = ocupadasEnSlot(store.reservas, payload.fecha, payload.hora);
      const mesaSolicitada = normalizarTexto(body.mesa);
      let mesa = null;
      if (mesaSolicitada) {
        const meta = MESAS.find((item) => item.codigo === mesaSolicitada);
        if (!meta || meta.zona !== payload.zona || meta.capacidad < payload.personas) {
          json(res, 422, { error: "La mesa seleccionada no es válida para la zona o cantidad de personas." });
          return;
        }
        if (ocupadas.has(mesaSolicitada)) {
          json(res, 409, { error: "La mesa seleccionada ya no está disponible para ese turno." });
          return;
        }
        mesa = meta;
      } else {
        mesa = primeraMesaDisponible(store.reservas, payload);
      }
      if (!mesa) {
        json(res, 409, { error: "No hay mesas disponibles para ese horario y zona." });
        return;
      }
      const depNum = Number(body.depositoSoles);
      const depositoSoles =
        isAdmin && Number.isFinite(depNum) && depNum >= 0 && depNum <= 500 ? Math.round(depNum) : DEPOSITO_SOLES;
      const depositoPagado = isAdmin ? body.depositoPagado !== false : true;
      const nueva = {
        id: nextId(store.reservas),
        ...payload,
        mesa: mesa.codigo,
        estado: "Pendiente",
        depositoSoles,
        depositoPagado,
        canal: isAdmin ? normalizarCanal(body.canal) : "Web",
        idiomaPreferido: optClamped(body.idiomaPreferido, 40),
        ocasion: optClamped(body.ocasion, 80),
        restriccionAlimentaria: optClamped(body.restriccionAlimentaria, 120),
        referenciaHotel: optClamped(body.referenciaHotel, 120),
        horaLlegadaEstimada: optClamped(body.horaLlegadaEstimada, 24),
        notasInternas: isAdmin ? optClamped(body.notasInternas, 600) : "",
      };
      store.reservas.unshift(nueva);
      await writeStore(store);
      json(res, 201, { data: nueva });
      return;
    }

    const reservaIdPath = pathname.match(/^\/api\/reservas\/(\d+)$/);
    if (req.method === "PATCH" && reservaIdPath) {
      if (!requireAdmin(req, res)) return;
      const id = Number(reservaIdPath[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const permitidos = ["Pendiente", "Confirmada", "Cancelada", "Atendida", "No show"];
      const store = await readStore();
      const idx = store.reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Reserva no encontrada." });
        return;
      }
      const cur = store.reservas[idx];
      const next = { ...cur };
      if (body.estado !== undefined) {
        if (!permitidos.includes(body.estado)) {
          json(res, 422, { error: "Estado no válido." });
          return;
        }
        next.estado = body.estado;
      }
      if (body.notasInternas !== undefined) next.notasInternas = optClamped(body.notasInternas, 600);
      if (body.canal !== undefined) next.canal = normalizarCanal(body.canal);
      if (body.idiomaPreferido !== undefined) next.idiomaPreferido = optClamped(body.idiomaPreferido, 40);
      if (body.ocasion !== undefined) next.ocasion = optClamped(body.ocasion, 80);
      if (body.restriccionAlimentaria !== undefined) {
        next.restriccionAlimentaria = optClamped(body.restriccionAlimentaria, 120);
      }
      if (body.referenciaHotel !== undefined) next.referenciaHotel = optClamped(body.referenciaHotel, 120);
      if (body.horaLlegadaEstimada !== undefined) {
        next.horaLlegadaEstimada = optClamped(body.horaLlegadaEstimada, 24);
      }
      if (body.notas !== undefined) next.notas = optClamped(body.notas, 200);
      if (body.depositoPagado !== undefined) next.depositoPagado = !!body.depositoPagado;
      if (body.depositoSoles !== undefined) {
        const d = Number(body.depositoSoles);
        if (Number.isFinite(d) && d >= 0 && d <= 500) next.depositoSoles = Math.round(d);
      }
      if (body.cliente !== undefined) {
        const cn = normalizarTexto(body.cliente);
        if (cn.length < 3 || cn.length > 80) {
          json(res, 422, { error: "El nombre del cliente debe tener entre 3 y 80 caracteres." });
          return;
        }
        next.cliente = cn;
      }
      if (body.telefono !== undefined) {
        const tv = validarTelefono(body.telefono);
        if (!tv.ok) {
          json(res, 422, { error: "El teléfono debe tener 9 dígitos." });
          return;
        }
        next.telefono = tv.value;
      }
      if (body.personas !== undefined) {
        const pn = Number(body.personas);
        if (!Number.isInteger(pn) || pn < 1 || pn > 8) {
          json(res, 422, { error: "La cantidad de personas debe ser un número entero entre 1 y 8." });
          return;
        }
        next.personas = pn;
      }
      if (body.zona !== undefined) {
        const zn = normalizarTexto(body.zona);
        if (!new Set(["Salón principal", "Terraza"]).has(zn)) {
          json(res, 422, { error: "La zona no es válida." });
          return;
        }
        next.zona = zn;
      }
      store.reservas[idx] = next;
      await writeStore(store);
      json(res, 200, { data: store.reservas[idx] });
      return;
    }

    if (req.method === "DELETE" && reservaIdPath) {
      if (!requireAdmin(req, res)) return;
      const id = Number(reservaIdPath[1]);
      const store = await readStore();
      const idx = store.reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        json(res, 404, { error: "Reserva no encontrada." });
        return;
      }
      store.reservas.splice(idx, 1);
      await writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    // ── Cocina: acceso pantalla KDS ───────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/auth/cocina-login") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const pin = String(body.pin ?? "").replace(/\D/g, "");
      if (!pin || pin.length < 4) {
        json(res, 422, { error: "Ingresa el PIN de cocina (4 dígitos)." });
        return;
      }
      if (pin !== COCINA_PIN) {
        json(res, 401, { error: "PIN de cocina incorrecto." });
        return;
      }
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
      const token = signAccessToken({ sub: 0, role: "cocina", nombre: "Cocina", exp }, JWT_SECRET);
      json(res, 200, { token, user: { nombre: "Cocina", rol: "Cocina" } });
      return;
    }

    // ── POS: Mozo login ──────────────────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/auth/mozo-login") {
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const pin = String(body.pin ?? "").replace(/\D/g, "");
      if (!pin || pin.length < 4) {
        json(res, 422, { error: "Ingresa tu PIN de 4 a 6 dígitos." });
        return;
      }
      const store = await readStore();
      ensureSedesYDelivery(store);
      const mozo = store.cuentas.find(
        (c) => c.rol === "Mozo" && c.estado === "Activo" && c.pin === pin,
      );
      if (!mozo) {
        json(res, 401, { error: "PIN incorrecto o mozo no activo." });
        return;
      }
      const sedeIdIn = normalizarTexto(body.sedeId);
      const sedeMozo = (sedeIdIn && sedeActiva(store, sedeIdIn)) || (store.sedes || []).find((s) => s.activa !== false);
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
      const token = signAccessToken(
        { sub: mozo.id, role: "mozo", nombre: mozo.nombre, sedeId: sedeMozo?.id || null, exp },
        JWT_SECRET,
      );
      json(res, 200, {
        token,
        user: { id: mozo.id, nombre: mozo.nombre, rol: "Mozo", sedeId: sedeMozo?.id || null, sedeNombre: sedeMozo?.nombre || "" },
      });
      return;
    }

    // ── POS: Estado de mesas ──────────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/mesas-estado") {
      if (!requireMozoOrAdmin(req, res)) return;
      const store = await readStore();
      ensurePedidosArray(store);
      ensureComandasArray(store);
      const hoy = new Date().toISOString().slice(0, 10);
      const result = MESAS.map((m) => {
        const pedidoAbierto = store.pedidos.find(
          (p) => p.tipo === "mesa" && p.mesaCodigo === m.codigo && !["Pagado", "Anulado", "Cerrado"].includes(p.estado),
        );
        if (pedidoAbierto) {
          const totalAbierto = (pedidoAbierto.items || []).reduce((s, i) => s + i.precioSoles * i.qty, 0);
          const rondas = store.comandas.filter((c) => c.pedidoId === pedidoAbierto.id).length;
          const comandasListas = store.comandas.filter(
            (c) => c.pedidoId === pedidoAbierto.id && c.estado === "Listo",
          ).length;
          return {
            codigo: m.codigo,
            zona: m.zona,
            capacidad: m.capacidad,
            estado: pedidoAbierto.estado === "Cuenta_pedida" ? "Cuenta_pedida" : "Ocupada",
            pedidoId: pedidoAbierto.id,
            mozoNombre: pedidoAbierto.mozoNombre || "",
            totalAbierto,
            rondas,
            comandasListas,
            abiertaDesde: pedidoAbierto.abiertaEn || pedidoAbierto.creadoEn,
          };
        }
        const reservaHoy = (store.reservas || []).find(
          (r) => r.mesa === m.codigo && r.fecha === hoy && r.estado === "Confirmada",
        );
        if (reservaHoy) {
          return { codigo: m.codigo, zona: m.zona, capacidad: m.capacidad, estado: "Reservada", reservaCliente: reservaHoy.cliente, reservaHora: reservaHoy.hora };
        }
        return { codigo: m.codigo, zona: m.zona, capacidad: m.capacidad, estado: "Libre" };
      });
      json(res, 200, { data: result });
      return;
    }

    // ── POS: Pedido activo de una mesa ────────────────────────────────────────
    const mesaPedidoActivoPath = pathname.match(/^\/api\/mesas\/([A-Z0-9]+)\/pedido-activo$/i);
    if (req.method === "GET" && mesaPedidoActivoPath) {
      if (!requireMozoOrAdmin(req, res)) return;
      const codigo = mesaPedidoActivoPath[1].toUpperCase();
      const store = await readStore();
      ensurePedidosArray(store);
      ensureComandasArray(store);
      const pedido = store.pedidos.find(
        (p) => p.tipo === "mesa" && p.mesaCodigo === codigo && !["Pagado", "Anulado", "Cerrado"].includes(p.estado),
      );
      if (!pedido) { json(res, 200, { data: null }); return; }
      const comandas = store.comandas.filter((c) => c.pedidoId === pedido.id);
      json(res, 200, { data: { ...pedido, comandas } });
      return;
    }

    // ── POS: Comandas ─────────────────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/comandas") {
      if (!requireStaff(req, res)) return;
      const store = await readStore();
      ensureComandasArray(store);
      const { searchParams } = parsePath(req.url || "/");
      let result = [...store.comandas];
      const estadoFilter = searchParams.get("estado");
      if (estadoFilter) result = result.filter((c) => c.estado === estadoFilter);
      const mesaFilter = searchParams.get("mesaCodigo");
      if (mesaFilter) result = result.filter((c) => c.mesaCodigo === mesaFilter.toUpperCase());
      const sedeFilterC = searchParams.get("sedeId");
      if (sedeFilterC) result = result.filter((c) => (c.sedeId || null) === sedeFilterC);
      json(res, 200, { data: result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/comandas") {
      const auth = requireMozoOrAdmin(req, res);
      if (!auth) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const mesaCodigo = normalizarTexto(body.mesaCodigo || "").toUpperCase();
      const mesaMetaPOS = MESAS.find((m) => m.codigo === mesaCodigo);
      if (!mesaMetaPOS) { json(res, 422, { error: "Mesa no válida." }); return; }
      const itemsIn = Array.isArray(body.items) ? body.items : [];
      if (!itemsIn.length) { json(res, 422, { error: "La comanda debe tener al menos un plato." }); return; }
      const store = await readStore();
      ensurePedidosArray(store);
      ensureComandasArray(store);
      const mozoNombrePOS = auth.role === "mozo" ? String(auth.nombre || "") : "Admin";
      const mozoIdPOS = auth.role === "mozo" ? Number(auth.sub) : 0;
      const sedeIdPOS = auth.sedeId || (SEDES_DEFAULT[0]?.id ?? null);
      let pedido = store.pedidos.find(
        (p) => p.tipo === "mesa" && p.mesaCodigo === mesaCodigo && !["Pagado", "Anulado", "Cerrado"].includes(p.estado),
      );
      if (pedido?.estado === "Cuenta_pedida") {
        json(res, 422, { error: "La mesa tiene cuenta pedida. No se pueden agregar platos." });
        return;
      }
      const itemsClean = [];
      for (const row of itemsIn) {
        const plato = store.platos.find((x) => Number(x.id) === Number(row.platoId));
        if (!plato) { json(res, 422, { error: `Plato no encontrado: ${row.platoId}` }); return; }
        const unit = parsePrecioSoles(plato.precio);
        if (unit <= 0) { json(res, 422, { error: "Precio de plato inválido." }); return; }
        const qty = Math.min(20, Math.max(1, Math.floor(Number(row.qty)) || 1));
        const notas = normalizarTexto(row.notas || "").slice(0, 200);
        itemsClean.push({ platoId: plato.id, nombre: plato.nombre, precioSoles: unit, qty, notas });
      }
      if (!pedido) {
        pedido = {
          id: nextId(store.pedidos),
          tipo: "mesa",
          mesaCodigo,
          sedeId: sedeIdPOS,
          mozoId: mozoIdPOS,
          mozoNombre: mozoNombrePOS,
          items: [],
          paymentMethod: null,
          subtotalSoles: 0,
          totalSoles: 0,
          codigoPago: null,
          qrPayload: null,
          comprobante: null,
          estado: "Ocupada",
          notasOperacion: "",
          abiertaEn: new Date().toISOString(),
          creadoEn: new Date().toISOString(),
        };
        store.pedidos.push(pedido);
      }
      for (const item of itemsClean) {
        const existing = pedido.items.find((x) => x.platoId === item.platoId && x.notas === item.notas);
        if (existing) {
          existing.qty = Math.min(20, existing.qty + item.qty);
        } else {
          pedido.items.push({ ...item });
        }
      }
      pedido.subtotalSoles = pedido.items.reduce((s, i) => s + i.precioSoles * i.qty, 0);
      pedido.totalSoles = pedido.subtotalSoles;
      const rondaActual = store.comandas.filter((c) => c.pedidoId === pedido.id).length + 1;
      const comanda = {
        id: nextId(store.comandas),
        mesaCodigo,
        pedidoId: pedido.id,
        sedeId: pedido.sedeId || sedeIdPOS,
        origen: "mesa",
        ronda: rondaActual,
        mozoId: mozoIdPOS,
        mozoNombre: mozoNombrePOS,
        items: itemsClean,
        estado: "Pendiente_cocina",
        creadoEn: new Date().toISOString(),
        listoEn: null,
      };
      store.comandas.push(comanda);
      const pidx = store.pedidos.findIndex((p) => p.id === pedido.id);
      if (pidx !== -1) store.pedidos[pidx] = pedido;
      await writeStore(store);
      json(res, 201, { data: comanda, pedido });
      return;
    }

    const comandaIdPath = pathname.match(/^\/api\/comandas\/(\d+)$/);
    if (req.method === "PATCH" && comandaIdPath) {
      const authComanda = requireStaff(req, res);
      if (!authComanda) return;
      const id = Number(comandaIdPath[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      ensureComandasArray(store);
      const idx = store.comandas.findIndex((c) => c.id === id);
      if (idx === -1) { json(res, 404, { error: "Comanda no encontrada." }); return; }
      const estadosComanda = new Set(["Pendiente_cocina", "En_preparacion", "Listo", "Servido"]);
      if (body.estado !== undefined) {
        if (!estadosComanda.has(body.estado)) { json(res, 422, { error: "Estado de comanda no válido." }); return; }
        const nuevo = body.estado;
        if (nuevo === "Servido" && authComanda.role === "cocina") {
          json(res, 403, { error: "Solo el mozo puede marcar como servido." });
          return;
        }
        if (["En_preparacion", "Listo"].includes(nuevo) && authComanda.role === "mozo") {
          json(res, 403, { error: "Solo cocina puede actualizar preparación." });
          return;
        }
        store.comandas[idx].estado = nuevo;
        if (nuevo === "Listo") store.comandas[idx].listoEn = new Date().toISOString();
        if (nuevo === "Servido") store.comandas[idx].servidoEn = new Date().toISOString();
      }
      await writeStore(store);
      json(res, 200, { data: store.comandas[idx] });
      return;
    }

    // ── POS: Cerrar cuenta / pago de mesa ─────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/pedidos-mesa") {
      const auth = requireMozoOrAdmin(req, res);
      if (!auth) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const mesaCodigoPM = normalizarTexto(body.mesaCodigo || "").toUpperCase();
      if (!MESAS.find((m) => m.codigo === mesaCodigoPM)) {
        json(res, 422, { error: "Mesa no válida." });
        return;
      }
      const paymentMethodPM = String(body.paymentMethod ?? "");
      if (!["card", "qr", "cash"].includes(paymentMethodPM)) {
        json(res, 422, { error: "Método de pago no válido (card, qr o cash)." });
        return;
      }
      const store = await readStore();
      ensurePedidosArray(store);
      const pedidoIdx = store.pedidos.findIndex(
        (p) => p.tipo === "mesa" && p.mesaCodigo === mesaCodigoPM && !["Pagado", "Anulado", "Cerrado"].includes(p.estado),
      );
      if (pedidoIdx === -1) { json(res, 404, { error: "No hay pedido abierto para esta mesa." }); return; }
      const pedidoPM = store.pedidos[pedidoIdx];
      const total = pedidoPM.subtotalSoles || 0;
      const codigoPagoPM = `TR-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const qrPayloadPM = `PE|TRES_REGIONES|${codigoPagoPM}|${total.toFixed(2)}|PEN|YAPE_PLIN`;
      let comprobantePM = null;
      const compInPM = body.comprobante;
      if (compInPM && typeof compInPM === "object" && Boolean(compInPM.solicita)) {
        const tipoPM = String(compInPM.tipo ?? "").toLowerCase() === "factura" ? "factura" : "boleta";
        const numPM = String(compInPM.numeroDocumento ?? "").replace(/\D/g, "");
        const razonPM = normalizarTexto(compInPM.razonSocial ?? "");
        if (tipoPM === "factura") {
          if (numPM.length !== 11 || razonPM.length < 4) {
            json(res, 422, { error: "Factura (SUNAT): RUC de 11 dígitos y razón social obligatorios." });
            return;
          }
          comprobantePM = { tipoSunat: "01", tipo: "factura", numeroDocumento: numPM, razonSocial: razonPM.slice(0, 200) };
        } else {
          if (numPM.length !== 8 || razonPM.length < 4) {
            json(res, 422, { error: "Boleta (SUNAT): DNI de 8 dígitos y nombre completo obligatorios." });
            return;
          }
          comprobantePM = { tipoSunat: "03", tipo: "boleta", numeroDocumento: numPM, razonSocial: razonPM.slice(0, 200) };
        }
      }
      store.pedidos[pedidoIdx] = {
        ...pedidoPM,
        estado: "Pagado",
        paymentMethod: paymentMethodPM,
        cardLast4: paymentMethodPM === "card" ? String(body.cardLast4 ?? "").replace(/\D/g, "").slice(-4) || null : null,
        codigoPago: codigoPagoPM,
        qrPayload: qrPayloadPM,
        comprobante: comprobantePM,
        subtotalSoles: total,
        totalSoles: total,
        pagadoEn: new Date().toISOString(),
      };
      await writeStore(store);
      json(res, 200, { data: store.pedidos[pedidoIdx] });
      return;
    }

    // ── POS: Menú del día ─────────────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/menu-del-dia") {
      const store = await readStore();
      ensureMenuDelDia(store);
      json(res, 200, { data: store.menuDelDia });
      return;
    }

    if (req.method === "PATCH" && pathname === "/api/menu-del-dia") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      ensureMenuDelDia(store);
      if (body.activo !== undefined) store.menuDelDia.activo = Boolean(body.activo);
      if (body.fecha !== undefined) store.menuDelDia.fecha = normalizarTexto(body.fecha).slice(0, 10);
      if (body.precioSoles !== undefined) {
        const p = Number(body.precioSoles);
        if (Number.isFinite(p) && p >= 0 && p <= 500) store.menuDelDia.precioSoles = p;
      }
      if (body.entrada !== undefined) store.menuDelDia.entrada = normalizarTexto(body.entrada).slice(0, 120);
      if (body.fondo !== undefined) store.menuDelDia.fondo = normalizarTexto(body.fondo).slice(0, 120);
      if (body.bebida !== undefined) store.menuDelDia.bebida = normalizarTexto(body.bebida).slice(0, 80);
      if (body.descripcion !== undefined) store.menuDelDia.descripcion = normalizarTexto(body.descripcion).slice(0, 300);
      await writeStore(store);
      json(res, 200, { data: store.menuDelDia });
      return;
    }

    // ── POS: Cierre de caja diario (mesa + delivery, por sede) ────────────────
    if (req.method === "GET" && pathname === "/api/cierre-caja") {
      if (!requireAdmin(req, res)) return;
      const store = await readStore();
      ensurePedidosArray(store);
      const { searchParams } = parsePath(req.url || "/");
      const fechaCierre = normalizarTexto(searchParams.get("fecha") || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      const sedeFilter = normalizarTexto(searchParams.get("sedeId"));
      const pagadosHoy = store.pedidos.filter((p) => {
        const cobrado =
          (p.tipo === "mesa" && p.estado === "Pagado") || (p.tipo === "delivery" && p.pagado === true);
        if (!cobrado) return false;
        if (String(p.pagadoEn || "").slice(0, 10) !== fechaCierre) return false;
        if (sedeFilter && (p.sedeId || null) !== sedeFilter) return false;
        return true;
      });
      const totalEfectivo = pagadosHoy.filter((p) => p.paymentMethod === "cash").reduce((s, p) => s + (p.totalSoles || 0), 0);
      const totalYape = pagadosHoy.filter((p) => p.paymentMethod === "qr").reduce((s, p) => s + (p.totalSoles || 0), 0);
      const totalTarjeta = pagadosHoy.filter((p) => p.paymentMethod === "card").reduce((s, p) => s + (p.totalSoles || 0), 0);
      const totalGeneral = totalEfectivo + totalYape + totalTarjeta;
      json(res, 200, {
        data: {
          fecha: fechaCierre,
          sedeId: sedeFilter || null,
          mesas: pagadosHoy.filter((p) => p.tipo === "mesa").length,
          deliveries: pagadosHoy.filter((p) => p.tipo === "delivery").length,
          totalGeneral: Math.round(totalGeneral * 100) / 100,
          efectivo: Math.round(totalEfectivo * 100) / 100,
          yapeQR: Math.round(totalYape * 100) / 100,
          tarjeta: Math.round(totalTarjeta * 100) / 100,
          pedidos: pagadosHoy,
        },
      });
      return;
    }

    // ── Delivery / catálogo comercial ─────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/stats/public") {
      const store = await readStore();
      ensureSedesYDelivery(store);
      json(res, 200, { data: computePublicStats(store) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/sedes") {
      const store = await readStore();
      ensureSedesYDelivery(store);
      json(res, 200, { data: (store.sedes || []).filter((s) => s.activa !== false) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/zonas-delivery") {
      const store = await readStore();
      ensureSedesYDelivery(store);
      json(res, 200, { data: (store.zonasDelivery || []).filter((z) => z.activa !== false) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/promociones") {
      const store = await readStore();
      ensureSedesYDelivery(store);
      json(res, 200, { data: (store.promociones || []).filter((p) => p.activa !== false) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/combos") {
      const store = await readStore();
      ensureSedesYDelivery(store);
      json(res, 200, { data: (store.combos || []).filter((c) => c.activa !== false) });
      return;
    }

    if (req.method === "GET" && pathname === "/api/geo/reverse") {
      const { searchParams } = parsePath(req.url || "/");
      const lat = Number(searchParams.get("lat"));
      const lng = Number(searchParams.get("lng"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        json(res, 422, { error: "Coordenadas inválidas." });
        return;
      }
      if (geoThrottle(requestIp(req), "reverse")) {
        json(res, 429, { error: "Espera un momento antes de volver a ubicarte." });
        return;
      }
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
        const data = await nominatimFetchJson(url);
        const dir = direccionDesdeNominatimPlace(data);
        const store = await readStore();
        ensureSedesYDelivery(store);
        const zona = zonaPorDistrito(store, dir.distrito);
        json(res, 200, {
          data: {
            ...dir,
            cobertura: Boolean(zona),
            sedeId: zona?.sedeId || null,
            deliverySoles: zona?.costoSoles ?? null,
          },
        });
      } catch {
        json(res, 502, { error: "No pudimos ubicar tu dirección. Elige tu distrito manualmente." });
      }
      return;
    }

    // ── Delivery: crear pedido (cliente autenticado) ──────────────────────────
    if (req.method === "POST" && pathname === "/api/pedidos-delivery") {
      const auth = requireClient(req, res);
      if (!auth) return;
      const body = await readJsonBody(req);
      if (body === "__body_too_large__") {
        json(res, 413, { error: "El payload excede el tamaño máximo permitido." });
        return;
      }
      if (!body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const itemsIn = Array.isArray(body.items) ? body.items : [];
      if (!itemsIn.length) {
        json(res, 422, { error: "Tu pedido debe tener al menos un plato." });
        return;
      }
      const dir = body.direccion && typeof body.direccion === "object" ? body.direccion : {};
      const calle = normalizarTexto(dir.calle);
      const distrito = normalizarTexto(dir.distrito);
      const referencia = normalizarTexto(body.referencia || dir.referencia);
      const celularContacto = String(body.celularContacto ?? "").replace(/\D/g, "").slice(0, 9);
      if (calle.length < 4) {
        json(res, 422, { error: "Indica la dirección de entrega (calle y número)." });
        return;
      }
      if (referencia.length < 3) {
        json(res, 422, { error: "Agrega una referencia para que el repartidor te ubique." });
        return;
      }
      if (celularContacto.length !== 9) {
        json(res, 422, { error: "Indica un celular de contacto de 9 dígitos." });
        return;
      }
      const paymentMethod = String(body.paymentMethod ?? "");
      if (!["card", "qr", "cash"].includes(paymentMethod)) {
        json(res, 422, { error: "Método de pago no válido (card, qr o cash)." });
        return;
      }
      const store = await readStore();
      ensurePedidosArray(store);
      ensureComandasArray(store);
      ensureSedesYDelivery(store);
      const zona = zonaPorDistrito(store, distrito);
      if (!zona) {
        json(res, 400, {
          error: "Aún no llegamos a ese distrito. Elige Los Olivos, San Martín de Porres o Comas.",
        });
        return;
      }
      const sedeIdElegida = normalizarTexto(body.sedeId);
      const sede =
        (sedeIdElegida && sedeActiva(store, sedeIdElegida)) || sedeActiva(store, zona.sedeId);
      if (!sede) {
        json(res, 400, { error: "No hay una sede disponible para tu zona en este momento." });
        return;
      }
      const itemsClean = [];
      const cocinaItems = [];
      for (const row of itemsIn) {
        const qty = Math.min(20, Math.max(1, Math.floor(Number(row.qty)) || 1));
        if (row.comboId != null) {
          const combo = (store.combos || []).find((c) => Number(c.id) === Number(row.comboId) && c.activa !== false);
          if (!combo) {
            json(res, 422, { error: `Combo no encontrado: ${row.comboId}` });
            return;
          }
          const precioCombo = Number(combo.precioCombo) || 0;
          if (precioCombo <= 0) {
            json(res, 422, { error: "Precio de combo inválido." });
            return;
          }
          itemsClean.push({ comboId: combo.id, nombre: combo.nombre, precioSoles: precioCombo, qty, notas: "" });
          for (const ci of combo.items || []) {
            const cp = store.platos.find((x) => Number(x.id) === Number(ci.platoId));
            if (cp) {
              cocinaItems.push({
                platoId: cp.id,
                nombre: cp.nombre,
                precioSoles: parsePrecioSoles(cp.precio),
                qty: qty * (Number(ci.qty) || 1),
                notas: `Combo: ${combo.nombre}`,
              });
            }
          }
          continue;
        }
        const plato = store.platos.find((x) => Number(x.id) === Number(row.platoId));
        if (!plato) {
          json(res, 422, { error: `Plato no encontrado: ${row.platoId}` });
          return;
        }
        const unit = parsePrecioSoles(plato.precio);
        if (unit <= 0) {
          json(res, 422, { error: "Precio de plato inválido." });
          return;
        }
        const notas = normalizarTexto(row.notas || "").slice(0, 200);
        const linea = { platoId: plato.id, nombre: plato.nombre, precioSoles: unit, qty, notas };
        itemsClean.push(linea);
        cocinaItems.push({ ...linea });
      }
      const subtotalSoles = itemsClean.reduce((s, i) => s + i.precioSoles * i.qty, 0);
      const deliverySoles = Number(zona.costoSoles) || 0;
      const totalSoles = subtotalSoles + deliverySoles;
      const eta = calcularEta(store, sede.id, zona);
      const codigoPago = `TR-DLV-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const qrPayload = `PE|TRES_REGIONES|${codigoPago}|${totalSoles.toFixed(2)}|PEN|YAPE_PLIN`;
      const pagado = paymentMethod !== "cash";
      const ahora = new Date().toISOString();
      const repartidor = pickRepartidor(store, sede.id);
      const pedido = {
        id: nextId(store.pedidos),
        tipo: "delivery",
        sedeId: sede.id,
        sedeNombre: sede.nombre,
        repartidor,
        clienteId: Number(auth.sub) || null,
        clienteNombre: String(auth.nombre || "Cliente"),
        items: itemsClean,
        direccion: { calle: calle.slice(0, 160), distrito: zona.distrito, referencia: referencia.slice(0, 200) },
        celularContacto,
        paymentMethod,
        pagado,
        cardLast4: paymentMethod === "card" ? String(body.cardLast4 ?? "").replace(/\D/g, "").slice(-4) || null : null,
        codigoPago,
        qrPayload,
        subtotalSoles,
        deliverySoles,
        totalSoles,
        etaMin: eta.etaMin,
        etaMax: eta.etaMax,
        etaTexto: eta.etaTexto,
        estado: "Recibido",
        creadoEn: ahora,
        pagadoEn: pagado ? ahora : null,
        entregadoEn: null,
      };
      store.pedidos.push(pedido);
      const comanda = {
        id: nextId(store.comandas),
        mesaCodigo: `D-${pedido.id}`,
        pedidoId: pedido.id,
        sedeId: sede.id,
        origen: "delivery",
        ronda: 1,
        mozoId: 0,
        mozoNombre: "Delivery",
        items: cocinaItems,
        estado: "Pendiente_cocina",
        creadoEn: ahora,
        listoEn: null,
      };
      store.comandas.push(comanda);
      await writeStore(store);
      json(res, 201, { data: pedido });
      return;
    }

    if (req.method === "GET" && pathname === "/api/mis-pedidos") {
      const auth = requireClient(req, res);
      if (!auth) return;
      const store = await readStore();
      ensurePedidosArray(store);
      const mios = store.pedidos
        .filter((p) => p.tipo === "delivery" && Number(p.clienteId) === Number(auth.sub))
        .sort((a, b) => (a.creadoEn > b.creadoEn ? -1 : 1));
      json(res, 200, { data: mios });
      return;
    }

    const pedidoDeliveryIdMatch = pathname.match(/^\/api\/pedidos-delivery\/(\d+)$/);
    if (pedidoDeliveryIdMatch && req.method === "GET") {
      const auth = authPayload(req);
      if (!auth) {
        json(res, 401, { error: "Se requiere sesión." });
        return;
      }
      const id = Number(pedidoDeliveryIdMatch[1]);
      const store = await readStore();
      ensurePedidosArray(store);
      const pedido = store.pedidos.find((p) => Number(p.id) === id && p.tipo === "delivery");
      if (!pedido) {
        json(res, 404, { error: "Pedido no encontrado." });
        return;
      }
      const esDueno = auth.role === "client" && Number(pedido.clienteId) === Number(auth.sub);
      if (!esDueno && auth.role !== "admin") {
        json(res, 403, { error: "No puedes ver este pedido." });
        return;
      }
      json(res, 200, { data: pedido });
      return;
    }

    if (pedidoDeliveryIdMatch && req.method === "PATCH") {
      if (!requireMozoOrAdmin(req, res)) return;
      const id = Number(pedidoDeliveryIdMatch[1]);
      const body = await readJsonBody(req);
      if (body === "__body_too_large__" || !body || typeof body !== "object") {
        json(res, 400, { error: "JSON inválido" });
        return;
      }
      const store = await readStore();
      ensurePedidosArray(store);
      const idx = store.pedidos.findIndex((p) => Number(p.id) === id && p.tipo === "delivery");
      if (idx === -1) {
        json(res, 404, { error: "Pedido no encontrado." });
        return;
      }
      const cur = store.pedidos[idx];
      const next = { ...cur };
      const estado = normalizarTexto(body.estado);
      if (!ESTADOS_DELIVERY.has(estado)) {
        json(res, 422, { error: "Estado de delivery no válido." });
        return;
      }
      next.estado = estado;
      if (estado === "Entregado") {
        next.entregadoEn = new Date().toISOString();
        if (!next.pagado) {
          next.pagado = true;
          next.pagadoEn = next.pagadoEn || new Date().toISOString();
        }
      }
      store.pedidos[idx] = next;
      await writeStore(store);
      json(res, 200, { data: next });
      return;
    }

    if (await tryServeStatic(req, res, pathname)) {
      return;
    }

    json(res, 404, { error: "Ruta no encontrada" });
  } catch (err) {
    console.error(`[${requestId}]`, err);
    json(res, 500, { error: "Error interno del servidor" });
  } finally {
    const elapsed = Date.now() - startedAt;
    console.info(`[${requestId}] ${method} ${url} ${res.statusCode} ${elapsed}ms`);
  }
});

await ensureDataFile();
{
  const store = await readStore();
  let dirty = migrateCuentasClienteTelefono(store);
  if (migrateReservasCampos(store)) dirty = true;
  if (migrateMozosDemo(store)) dirty = true;
  if (migratePlatosDisponible(store)) dirty = true;
  if (migrateOperacionDual(store)) dirty = true;
  if (ensureSedesYDelivery(store)) dirty = true;
  if (ensureClienteDemo(store)) dirty = true;
  if (ensureDemoDeliveries(store)) dirty = true;
  ensureComandasArray(store);
  ensureMenuDelDia(store);
  if (!store.comandas || !store.menuDelDia) dirty = true;
  if (dirty) {
    await writeStore(store);
  }
}

assertProductionSafe();

server.listen(PORT, HOST, () => {
  const staticReady = distReady();
  staticReady
    .then((ready) => {
      const mode = ready ? "web + API" : "solo API";
      console.log(`TRES REGIONES (${mode}) en http://${HOST}:${PORT}`);
    })
    .catch(() => {
      console.log(`TRES REGIONES (solo API) en http://${HOST}:${PORT}`);
    });
});
