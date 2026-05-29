const KEY = "admin_sede_activa";
const EVENT = "admin-sede-change";

export function getAdminSede() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminSede(sedeId) {
  try {
    if (sedeId) localStorage.setItem(KEY, sedeId);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: sedeId || "" }));
}

export function subscribeAdminSede(handler) {
  const fn = (e) => handler(e.detail ?? getAdminSede());
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
