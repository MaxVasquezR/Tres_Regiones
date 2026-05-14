import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { cerrarSesion, haySesionCliente, nombreParaMostrarCliente, obtenerSesion } from "../session";
import { useEffect, useState } from "react";
import { useReservations } from "../context/ReservationsContext";
import { useCart } from "../context/CartContext";
import ClientFooter from "../components/ClientFooter";
import ClientPrimaryNav from "../components/ClientPrimaryNav";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function ClientLayout() {
  const { refresh } = useReservations();
  const { countPlatos } = useCart();
  const [, setTick] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const sesion = obtenerSesion();
  const logueado = haySesionCliente();
  const authRoute = AUTH_ROUTES.has(location.pathname);

  useEffect(() => {
    const id = requestAnimationFrame(() => setNavOpen(false));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  useEffect(() => {
    if (authRoute || !navOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen, authRoute]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className={`client-shell${authRoute ? "" : " client-shell--app"}`}>
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

            <button
              type="button"
              className="topbar__burger"
              aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((o) => !o)}
            >
              <span className="topbar__burger-line" aria-hidden />
              <span className="topbar__burger-line" aria-hidden />
              <span className="topbar__burger-line" aria-hidden />
            </button>

            <div className="topbar__cluster">
              <ClientPrimaryNav logueado={logueado} countPlatos={countPlatos} mode="topbar" />
              {logueado && (
                <div className="topbar__user-actions">
                  <span
                    className="topbar__hello"
                    title={
                      sesion?.correo ? `Correo: ${sesion.correo}` : sesion?.telefono ? `Celular: ${sesion.telefono}` : undefined
                    }
                  >
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

      {!authRoute && navOpen ? (
        <>
          <button type="button" className="topbar__scrim" aria-label="Cerrar menú" onClick={closeNav} />
          <aside className="topbar__sheet" aria-modal="true" role="dialog">
            <div className="topbar__sheet-head">
              <span className="topbar__sheet-title">Menú</span>
              <button type="button" className="btn btn--surface btn--sm" onClick={closeNav}>
                Cerrar
              </button>
            </div>
            <div className="topbar__sheet-body">
              <ClientPrimaryNav logueado={logueado} countPlatos={countPlatos} mode="sheet" onItemActivate={closeNav} />
              {logueado ? (
                <div className="topbar__sheet-user">
                  <p className="topbar__sheet-user-name">{nombreParaMostrarCliente(sesion)}</p>
                  <button
                    type="button"
                    className="btn btn--outline-dark btn--block"
                    onClick={() => {
                      cerrarSesion();
                      void refresh();
                      setTick((t) => t + 1);
                      closeNav();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}

      {!authRoute && (
        <div className="presale-strip" role="note">
          <div className="container container--wide presale-strip__inner">
            <span className="presale-strip__badge">
              <span className="presale-strip__badge-text presale-strip__badge-text--full">Tres Regiones · Lima</span>
              <span className="presale-strip__badge-text presale-strip__badge-text--compact" aria-hidden>
                Lima
              </span>
            </span>
            {logueado ? (
              <span className="presale-strip__session">
                Sesión: <strong>{nombreParaMostrarCliente(sesion)}</strong>
              </span>
            ) : null}
            <span className="presale-strip__meta">
              Software de operación: carta digital, delivery, reservas y panel gerencial en un solo entorno.
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

      {!authRoute && (
        <nav className="client-bottom-nav" aria-label="Acceso rápido">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `client-bottom-nav__item${isActive ? " client-bottom-nav__item--active" : ""}`}
            onClick={closeNav}
          >
            Inicio
          </NavLink>
          <Link to="/carrito" className="client-bottom-nav__item" onClick={closeNav}>
            Pedido{countPlatos ? ` (${countPlatos})` : ""}
          </Link>
          {logueado ? (
            <NavLink
              to="/reservar"
              className={({ isActive }) => `client-bottom-nav__item${isActive ? " client-bottom-nav__item--active" : ""}`}
              onClick={closeNav}
            >
              Reserva
            </NavLink>
          ) : (
            <Link to="/login" className="client-bottom-nav__item client-bottom-nav__item--accent" onClick={closeNav}>
              Entrar
            </Link>
          )}
          <button type="button" className="client-bottom-nav__item" onClick={() => setNavOpen(true)}>
            Menú
          </button>
        </nav>
      )}

      {!authRoute && <ClientFooter />}
    </div>
  );
}
