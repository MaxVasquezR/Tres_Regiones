import { Link, Outlet, NavLink, useLocation } from "react-router-dom";
import { cerrarSesion, haySesionCliente, nombreParaMostrarCliente, obtenerSesion } from "../session";
import { useState } from "react";
import { useReservations } from "../context/ReservationsContext";
import { useCart } from "../context/CartContext";
import ClientFooter from "../components/ClientFooter";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function ClientLayout() {
  const { refresh } = useReservations();
  const { countPlatos } = useCart();
  const [, setTick] = useState(0);
  const location = useLocation();
  const sesion = obtenerSesion();
  const logueado = haySesionCliente();
  const authRoute = AUTH_ROUTES.has(location.pathname);

  return (
    <div className="client-shell">
      {!authRoute && (
        <header className="topbar">
          <div className="topbar__inner container container--wide">
            <div className="brand">
              <span className="brand__mark" aria-hidden>
                TR
              </span>
              <div className="brand__copy">
                <span className="brand__name">TRES REGIONES</span>
                <span className="brand__tagline">Costa · Sierra · Selva · Lima</span>
              </div>
            </div>

            <div className="topbar__cluster">
              <nav className="nav" aria-label="Navegación principal">
                <NavLink to="/" end className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                  Inicio
                </NavLink>
                <Link to="/carrito" className="navlink">
                  Pedido{countPlatos ? ` (${countPlatos})` : ""}
                </Link>
                {!logueado && (
                  <Link to="/login" state={{ from: "/reservar" }} className="navlink navlink--cta">
                    Reservar
                  </Link>
                )}
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
                  <NavLink
                    to="/reservar"
                    className={({ isActive }) => `navlink navlink--cta ${isActive ? "navlink--active" : ""}`}
                  >
                    Reservar
                  </NavLink>
                )}
                <NavLink to="/admin/login" className={({ isActive }) => `navlink ${isActive ? "navlink--active" : ""}`}>
                  Personal
                </NavLink>
              </nav>
              {logueado && (
                <div className="topbar__user-actions">
                  <span className="topbar__hello" title={sesion?.correo ? `Correo: ${sesion.correo}` : sesion?.telefono ? `Celular: ${sesion.telefono}` : undefined}>
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

      {!authRoute && (
        <div className="presale-strip" role="note">
          <div className="container container--wide presale-strip__inner">
            <span className="presale-strip__badge">Minimuestra · preventa</span>
            {logueado ? (
              <span className="presale-strip__session">
                Sesión: <strong>{nombreParaMostrarCliente(sesion)}</strong>
              </span>
            ) : null}
            <span className="presale-strip__meta">
              Producto profesional en demostración: carta, flujo de reserva en sala y panel operativo con datos de
              ejemplo. La versión comercial incorporará catálogo e integraciones ampliadas.
            </span>
          </div>
        </div>
      )}

      <main className={authRoute ? "client-main client-main--auth" : "client-main page page--flush"}>
        {authRoute ? (
          <div className="client-main__auth">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {!authRoute && <ClientFooter />}
    </div>
  );
}
