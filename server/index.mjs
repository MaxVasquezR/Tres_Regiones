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
const ROLES_CUENTA = new Set(["Cliente", "Administrador"]);
const ESTADOS_CUENTA = new Set(["Activo", "Inactivo"]);
const ESTADOS_PEDIDO_ADMIN = new Set([
  "Pendiente_caja",
  "Pagado_simulado_tarjeta",
  "Pendiente_confirmacion_QR",
  "Confirmado_cocina",
  "Listo_recojo",
  "En_reparto",
  "Entregado",
  "Cerrado",
  "Anulado",
]);

const MESAS = [
  { codigo: "M1", capacidad: 2, zona: "Salón principal" },
  { codigo: "M2", capacidad: 2, zona: "Salón principal" },
  { codigo: "M3", capacidad: 4, zona: "Salón principal" },
  { codigo: "M4", capacidad: 4, zona: "Salón principal" },
  { codigo: "M5", capacidad: 6, zona: "Terraza" },
  { codigo: "M6", capacidad: 6, zona: "Terraza" },
];

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

function ensurePedidosArray(store) {
  if (!Array.isArray(store.pedidos)) store.pedidos = [];
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
      json(res, 200, { data: store.platos });
      return;
    }

    if (req.method === "GET" && pathname === "/api/mis-pedidos") {
      const p = requireClient(req, res);
      if (!p) return;
      const store = await readStore();
      ensurePedidosArray(store);
      const mine = store.pedidos.filter((x) => Number(x.clienteId) === Number(p.sub));
      json(res, 200, { data: mine });
      return;
    }

    if (req.method === "GET" && pathname === "/api/geo/reverse") {
      const p = requireClient(req, res);
      if (!p) return;
      const ip = requestIp(req);
      if (geoThrottle(ip, "reverse")) {
        json(res, 429, { error: "Espera un momento entre lecturas de mapa." });
        return;
      }
      const { searchParams } = parsePath(req.url || "/");
      const lat = Number(searchParams.get("lat"));
      const lng = Number(searchParams.get("lng"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        json(res, 422, { error: "Coordenadas inválidas." });
        return;
      }
      try {
        const u = new URL("https://nominatim.openstreetmap.org/reverse");
        u.searchParams.set("format", "jsonv2");
        u.searchParams.set("lat", String(lat));
        u.searchParams.set("lon", String(lng));
        u.searchParams.set("accept-language", "es");
        const raw = await nominatimFetchJson(u.toString());
        json(res, 200, { data: direccionDesdeNominatimPlace(raw) });
      } catch (e) {
        json(res, 502, { error: e?.message || "No se pudo interpretar la ubicación." });
      }
      return;
    }

    if (req.method === "GET" && pathname === "/api/geo/search") {
      const p = requireClient(req, res);
      if (!p) return;
      const ip = requestIp(req);
      if (geoThrottle(ip, "search")) {
        json(res, 429, { error: "Espera un momento entre búsquedas de texto." });
        return;
      }
      const { searchParams } = parsePath(req.url || "/");
      const q = normalizarTexto(searchParams.get("q") || "");
      if (q.length < 3) {
        json(res, 422, { error: "Escribe al menos 3 caracteres para buscar." });
        return;
      }
      try {
        const u = new URL("https://nominatim.openstreetmap.org/search");
        u.searchParams.set("format", "jsonv2");
        u.searchParams.set("q", `${q}, Lima, Peru`);
        u.searchParams.set("limit", "8");
        u.searchParams.set("accept-language", "es");
        const arr = await nominatimFetchJson(u.toString());
        const list = Array.isArray(arr) ? arr : [];
        const results = list.map((raw) => {
          const m = direccionDesdeNominatimPlace(raw);
          return {
            lat: m.lat,
            lng: m.lng,
            label: m.etiqueta,
            calle: m.calle,
            distrito: m.distrito,
          };
        });
        json(res, 200, { data: { results } });
      } catch (e) {
        json(res, 502, { error: e?.message || "Búsqueda no disponible." });
      }
      return;
    }

    if (req.method === "GET" && pathname === "/api/pedidos") {
      if (!requireAdmin(req, res)) return;
      const store = await readStore();
      ensurePedidosArray(store);
      json(res, 200, { data: store.pedidos });
      return;
    }

    if (req.method === "POST" && pathname === "/api/pedidos") {
      const p = requireClient(req, res);
      if (!p) return;
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
        json(res, 422, { error: "Agrega al menos un plato al pedido." });
        return;
      }
      const delivery = Boolean(body.delivery);
      const direccionRaw = body.direccion && typeof body.direccion === "object" ? body.direccion : {};
      if (delivery) {
        const calle = normalizarTexto(direccionRaw.calle ?? "");
        const distrito = normalizarTexto(direccionRaw.distrito ?? "");
        if (calle.length < 6 || distrito.length < 3) {
          json(res, 422, {
            error: "Para delivery indica calle y número (mín. 6 caracteres) y distrito válidos.",
          });
          return;
        }
      }
      const paymentMethod = String(body.paymentMethod ?? "");
      if (!["card", "qr", "cash"].includes(paymentMethod)) {
        json(res, 422, { error: "Método de pago no válido (card, qr o cash)." });
        return;
      }
      const contactoNombre = normalizarTexto(body.contactoNombre ?? "");
      const contactoTelefono = String(body.contactoTelefono ?? "").replace(/\D/g, "").slice(0, 9);
      if (contactoNombre.length < 3 || !/^[0-9]{9}$/.test(contactoTelefono)) {
        json(res, 422, {
          error: "Indica nombre de contacto (mín. 3 caracteres) y celular peruano de 9 dígitos para coordinar el pedido.",
        });
        return;
      }
      let comprobante = null;
      const compIn = body.comprobante;
      if (compIn && typeof compIn === "object" && Boolean(compIn.solicita)) {
        const tipo = String(compIn.tipo ?? "").toLowerCase() === "factura" ? "factura" : "boleta";
        const num = String(compIn.numeroDocumento ?? "").replace(/\D/g, "");
        const razon = normalizarTexto(compIn.razonSocial ?? "");
        if (tipo === "factura") {
          if (num.length !== 11 || razon.length < 4) {
            json(res, 422, {
              error: "Factura (SUNAT): RUC de 11 dígitos y razón social o denominación del receptor son obligatorios.",
            });
            return;
          }
          comprobante = {
            tipoSunat: "01",
            tipo: "factura",
            numeroDocumento: num,
            razonSocial: razon.slice(0, 200),
          };
        } else {
          if (num.length !== 8 || razon.length < 4) {
            json(res, 422, {
              error: "Boleta (SUNAT): DNI de 8 dígitos y nombre completo del titular son obligatorios.",
            });
            return;
          }
          comprobante = {
            tipoSunat: "03",
            tipo: "boleta",
            numeroDocumento: num,
            razonSocial: razon.slice(0, 200),
          };
        }
      }
      const store = await readStore();
      ensurePedidosArray(store);
      const itemsClean = [];
      let subtotal = 0;
      for (const row of itemsIn) {
        const plato = store.platos.find((x) => Number(x.id) === Number(row.platoId));
        if (!plato) {
          json(res, 422, { error: `Plato no encontrado: ${row.platoId}` });
          return;
        }
        const unit = parsePrecioSoles(plato.precio);
        if (unit <= 0 || unit > 500) {
          json(res, 422, { error: "Precio de plato inválido en catálogo." });
          return;
        }
        const qty = Math.min(20, Math.max(1, Math.floor(Number(row.qty)) || 1));
        itemsClean.push({
          platoId: plato.id,
          nombre: plato.nombre,
          precioSoles: unit,
          qty,
        });
        subtotal += unit * qty;
      }
      const deliverySoles = delivery ? 10 : 0;
      const total = Math.round((subtotal + deliverySoles) * 100) / 100;
      const codigoPago = `TR-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const qrPayload = `PE|TRES_REGIONES|${codigoPago}|${total.toFixed(2)}|PEN|YAPE_PLIN`;
      let estado = "Pendiente_caja";
      if (paymentMethod === "card") estado = "Pagado_simulado_tarjeta";
      if (paymentMethod === "qr") estado = "Pendiente_confirmacion_QR";
      const pedido = {
        id: nextId(store.pedidos),
        clienteId: Number(p.sub),
        clienteNombre: String(p.nombre ?? ""),
        clienteCorreo: String(p.email ?? ""),
        clienteTelefonoCuenta: String(p.telefono ?? "").replace(/\D/g, "") || null,
        contactoNombre: contactoNombre.slice(0, 120),
        contactoTelefono,
        comprobante,
        items: itemsClean,
        delivery,
        direccion: delivery
          ? {
              calle: normalizarTexto(direccionRaw.calle ?? "").slice(0, 160),
              distrito: normalizarTexto(direccionRaw.distrito ?? "").slice(0, 80),
              urbanizacion: normalizarTexto(direccionRaw.urbanizacion ?? "").slice(0, 80),
              referencia: normalizarTexto(direccionRaw.referencia ?? "").slice(0, 200),
              etiqueta: normalizarTexto(direccionRaw.etiqueta ?? "").slice(0, 240),
              lat: Number.isFinite(Number(direccionRaw.lat)) ? Number(direccionRaw.lat) : null,
              lng: Number.isFinite(Number(direccionRaw.lng)) ? Number(direccionRaw.lng) : null,
              fuente: ["gps", "mapa", "manual"].includes(String(direccionRaw.fuente || "").toLowerCase())
                ? String(direccionRaw.fuente).toLowerCase()
                : null,
            }
          : null,
        paymentMethod,
        cardLast4: paymentMethod === "card" ? String(body.cardLast4 ?? "").replace(/\D/g, "").slice(-4) || null : null,
        subtotalSoles: subtotal,
        deliverySoles,
        totalSoles: total,
        codigoPago,
        qrPayload,
        estado,
        notasOperacion: "",
        creadoEn: new Date().toISOString(),
      };
      store.pedidos.push(pedido);
      await writeStore(store);
      json(res, 201, { data: pedido });
      return;
    }

    const pedidoIdMatch = pathname.match(/^\/api\/pedidos\/(\d+)$/);
    if (pedidoIdMatch && req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;
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
        json(res, 422, { error: "Rol no válido (Cliente o Administrador)." });
        return;
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
