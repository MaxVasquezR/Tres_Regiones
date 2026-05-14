export const SESSION_KEY = "sazon_session_v2";

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function primerNombre(nombreCompleto) {
  const t = String(nombreCompleto || "").trim();
  if (!t) return "";
  const first = t.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function nombreFallbackDesdeCorreo(correo) {
  const c = String(correo || "").trim().toLowerCase();
  if (!c) return "Cliente";
  const local = c.split("@")[0] || "cliente";
  const raw = local.split(/[._-]/)[0] || local;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function iniciarSesionCliente({ token, user }) {
  const email = String(user?.correo || "").trim().toLowerCase();
  const fullName = String(user?.nombre || "").trim();
  const telefono = String(user?.telefono || "")
    .replace(/\D/g, "")
    .slice(0, 9);
  const nombre = primerNombre(fullName) || nombreFallbackDesdeCorreo(email) || (telefono ? `Cliente ${telefono.slice(-4)}` : "Cliente");
  saveSession({
    role: "client",
    token,
    correo: email,
    telefono,
    nombre,
    nombreCompleto: fullName || email,
    at: new Date().toISOString(),
  });
}

export function iniciarSesionAdmin({ token, user }) {
  saveSession({
    role: "admin",
    token,
    usuario: String(user?.usuario || "admin").trim() || "admin",
    at: new Date().toISOString(),
  });
}

export function nombreParaMostrarCliente(sesion) {
  if (!sesion || sesion.role !== "client") return "";
  if (sesion.nombre) return String(sesion.nombre);
  return nombreFallbackDesdeCorreo(sesion.correo);
}

export function nombreParaMostrarAdmin(sesion) {
  if (!sesion || sesion.role !== "admin") return "";
  const u = String(sesion.usuario || "admin").trim() || "admin";
  return u.charAt(0).toUpperCase() + u.slice(1).toLowerCase();
}

export function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
}

export function obtenerSesion() {
  return readSession();
}

export function getAccessToken() {
  const s = readSession();
  return s?.token && typeof s.token === "string" ? s.token : null;
}

export function haySesionCliente() {
  const s = readSession();
  return s?.role === "client" && !!s?.token;
}

export function haySesionAdmin() {
  const s = readSession();
  return s?.role === "admin" && !!s?.token;
}
