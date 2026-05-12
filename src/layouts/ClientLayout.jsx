import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cerrarSesion, haySesionCliente, nombreParaMostrarCliente, obtenerSesion } from "../session";
import { useState } from "react";
import { useReservations } from "../context/ReservationsContext";
import ClientFooter from "../components/ClientFooter";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function ClientLayout() {
  const { refresh } = useReservations();
  const [, setTick] = useState(0);
  const location = useLocation();
  const sesion = obtenerSesion();
  const logueado = haySesionCliente();
  const authRoute = AUTH_ROUTES.has(location.pathname);

  return (
    <div className="client-shell">
      {!authRoute && (
        <header className="topbar">
          <div className="topbar__inner container">
            <div className="brand">
              <span className="brand__mark" aria-hidden>
                TR
              </span>
              <div className="brand__copy">
                <span className="brand__name">TRES REGIONES</span>
                <span className="brand__tagline">Costa · Sierra · Selva</span>
              </div>
            </div>

            <div className="topbar__cluster">
              <nav className="nav" aria-label="Navegación principal">
                <NavLink to="/" end className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                  Inicio
                </NavLink>
                {!logueado && (
                  <NavLink to="/login" className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                    Acceso
                  </NavLink>
                )}
                {!logueado && (
                  <NavLink to="/register" className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                    Registro
                  </NavLink>
                )}
                {logueado && (
                  <NavLink to="/reservar" className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                    Reservar
                  </NavLink>
                )}
                <NavLink to="/admin/login" className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                  Personal
                </NavLink>
              </nav>
              {logueado && (
                <div className="topbar__user-actions">
                  <span className="topbar__hello" title={sesion?.correo ? `Cuenta: ${sesion.correo}` : undefined}>
                    Hola, {nombreParaMostrarCliente(sesion)}
                  </span>
                  <button
                    type="button"
                    className="navlink navlink--button"
                    onClick={() => {
                      cerrarSesion();
                      void refresh();
                      setTick((t) => t + 1);
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {!authRoute && logueado && (
        <div className="client-strip">
          <div className="container client-strip__inner">
            <span>
              Sesión activa · <strong>{nombreParaMostrarCliente(sesion)}</strong>
            </span>
            <span className="client-strip__hint">Tu mesa en Lima te espera cuando quieras reservar.</span>
          </div>
        </div>
      )}

      <main className={authRoute ? "client-main client-main--auth" : "client-main page"}>
        <div className={authRoute ? "client-main__auth" : "container"}>
          <Outlet />
        </div>
      </main>

      {!authRoute && <ClientFooter />}
    </div>
  );
}
