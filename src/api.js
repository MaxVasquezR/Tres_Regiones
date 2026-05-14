import { getAccessToken } from "./session";

export function apiUrl(pathname) {
  const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

function headersJson(auth) {
  const h = { "Content-Type": "application/json" };
  if (auth) {
    const t = getAccessToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export async function apiGet(pathname, { auth = false, signal } = {}) {
  let res;
  try {
    res = await fetch(apiUrl(pathname), { headers: auth ? headersJson(true) : {}, signal });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("El servicio no está disponible en este momento.");
    }
    throw new Error(body.error || `Error ${res.status}`);
  }
  return body;
}

export async function apiPost(pathname, payload, { auth = false } = {}) {
  let res;
  try {
    res = await fetch(apiUrl(pathname), {
      method: "POST",
      headers: headersJson(auth),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("El servicio no está disponible en este momento.");
    }
    throw new Error(body.error || `Error ${res.status}`);
  }
  return body;
}

export async function apiPatch(pathname, payload, { auth = false } = {}) {
  let res;
  try {
    res = await fetch(apiUrl(pathname), {
      method: "PATCH",
      headers: headersJson(auth),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("El servicio no está disponible en este momento.");
    }
    throw new Error(body.error || `Error ${res.status}`);
  }
  return body;
}

export async function apiDelete(pathname, { auth = false } = {}) {
  let res;
  try {
    res = await fetch(apiUrl(pathname), {
      method: "DELETE",
      headers: auth ? headersJson(true) : {},
    });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("El servicio no está disponible en este momento.");
    }
    throw new Error(body.error || `Error ${res.status}`);
  }
  return body;
}
