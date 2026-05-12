import http from "node:http";
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
const DATA_PATH = path.join(__dirname, "data.json");
const SEED_PATH = path.join(__dirname, "seed.json");

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
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES || 1024 * 64);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

const DEPOSITO_SOLES = 20;
const CANALES_VALIDOS = new Set(["Web", "Mostrador", "Teléfono", "Agencia", "OTAs", "Evento"]);
const ROLES_CUENTA = new Set(["Cliente", "Administrador"]);
const ESTADOS_CUENTA = new Set(["Activo", "Inactivo"]);

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

function migrateCuentasDemo(store) {
  let dirty = false;
  for (const c of store.cuentas) {
    if (c.passwordHash) continue;
    if (String(c.correo).toLowerCase() !== "cliente@sazon.com") continue;
    if (String(c.rol) !== "Cliente") continue;
    c.passwordHash = hashPasswordDeterministic("123456", `cliente:${String(c.correo).toLowerCase()}`);
    dirty = true;
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
      json(res, 200, { ok: true, service: "tres-regiones-api", port: PORT });
      return;
    }

    if (req.method === "GET" && pathname === "/api/platos") {
      const store = await readStore();
      json(res, 200, { data: store.platos });
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
        json(res, 422, { error: "La contraseña debe tener al menos 6 caracteres." });
        return;
      }
      const store = await readStore();
      if (store.cuentas.some((c) => String(c.correo).toLowerCase() === correo)) {
        json(res, 409, { error: "Ya existe una cuenta con ese correo." });
        return;
      }
      const nueva = {
        id: nextId(store.cuentas),
        nombre,
        correo,
        rol,
        estado,
      };
      if (contrasena.length >= 6) {
        nueva.passwordHash = hashPassword(contrasena);
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
      const correoVal = validarCorreo(body.correo);
      const correo = correoVal.value;
      const contrasena = String(body.contrasena ?? "");
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
      if (contrasena.length < 6) {
        json(res, 422, { error: "La contraseña debe tener al menos 6 caracteres." });
        return;
      }
      const store = await readStore();
      if (store.cuentas.some((c) => String(c.correo).toLowerCase() === correo)) {
        json(res, 409, { error: "Ya existe una cuenta con ese correo." });
        return;
      }
      const nueva = {
        id: nextId(store.cuentas),
        nombre,
        correo,
        rol: "Cliente",
        estado: "Activo",
        passwordHash: hashPassword(contrasena),
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
      const correoVal = validarCorreo(body.correo);
      const correo = correoVal.value;
      const contrasena = String(body.contrasena ?? "");
      if (!correoVal.ok || !contrasena) {
        json(res, 422, { error: "Correo y contraseña son obligatorios." });
        return;
      }
      const store = await readStore();
      const cuenta = store.cuentas.find((c) => String(c.correo).toLowerCase() === correo);
      if (!cuenta || cuenta.rol !== "Cliente" || cuenta.estado !== "Activo") {
        json(res, 401, { error: "Credenciales incorrectas." });
        return;
      }
      if (!cuenta.passwordHash || !verifyPassword(contrasena, cuenta.passwordHash)) {
        json(res, 401, { error: "Credenciales incorrectas." });
        return;
      }
      const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
      const token = signAccessToken(
        { sub: cuenta.id, role: "client", email: cuenta.correo, nombre: cuenta.nombre, exp },
        JWT_SECRET,
      );
      json(res, 200, {
        token,
        user: { id: cuenta.id, nombre: cuenta.nombre, correo: cuenta.correo, rol: cuenta.rol },
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
  let dirty = migrateCuentasDemo(store);
  if (migrateReservasCampos(store)) dirty = true;
  if (dirty) {
    await writeStore(store);
  }
}

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
