import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { cerrarSesion, haySesionCliente, nombreParaMostrarCliente, obtenerSesion } from "../session";
import { useEffect, useState } from "react";
import { useReservations } from "../context/ReservationsContext";
import { useCart } from "../context/CartContext";
import ClientFooter from "../components/ClientFooter";
import ClientPrimaryNav from "../components/ClientPrimaryNav";
import ClientBrandLink from "../components/ClientBrandLink";
import { useGoHome } from "../hooks/useGoHome";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function ClientLayout() {
  const { refresh } = useReservations();
  const { count } = useCart();
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
  const goHome = useGoHome();

  return (
    <div className={`client-shell client-shell--brand-always${authRoute ? "" : " client-shell--app"}`}>
      <header className={`topbar topbar--persistent${authRoute ? " topbar--compact" : ""}`}>
        <div className="topbar__inner container container--wide">
          <ClientBrandLink />

          {!authRoute && (
            <>
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
                <ClientPrimaryNav logueado={logueado} mode="topbar" />
                {logueado && (
                  <div className="topbar__user-actions">
                    <span className="topbar__hello">Hola, {nombreParaMostrarCliente(sesion)}</span>
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
            </>
          )}
        </div>
      </header>

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
              <ClientPrimaryNav logueado={logueado} mode="sheet" onItemActivate={closeNav} />
            </div>
          </aside>
        </>
      ) : null}

      {!authRoute && (
        <div className="presale-strip presale-strip--pro" role="note">
          <div className="container container--wide presale-strip__inner">
            <span className="presale-strip__badge">⚡ Delivery Guepardo</span>
            <span className="presale-strip__meta">
              Los Olivos · San Martín de Porres · Comas. Delivery en ~28 min o reserva tu mesa.
            </span>
          </div>
        </div>
      )}

      {!authRoute && logueado && (
        <div className="guepardo-vip guepardo-vip--optional full-bleed" role="note">
          <div className="container container--wide guepardo-vip__inner">
            <span className="guepardo-vip__icon" aria-hidden>🐆</span>
            <p className="guepardo-vip__text">
              <strong>Guepardo VIP</strong> — Cada entrega a tiempo suma puntos. Sigue tus pedidos y acumula beneficios.
            </p>
            <Link to="/mis-pedidos" className="btn btn--surface btn--sm">
              Mis pedidos
            </Link>
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
            className={({ isActive }) =>
              `client-bottom-nav__item${isActive ? " client-bottom-nav__item--active" : ""}`
            }
            onClick={goHome}
          >
            <span className="client-bottom-nav__icon" aria-hidden>🍽️</span>
            <span className="client-bottom-nav__label">Carta</span>
          </NavLink>
          <NavLink
            to="/carrito"
            className={({ isActive }) =>
              `client-bottom-nav__item client-bottom-nav__item--cart${isActive ? " client-bottom-nav__item--active" : ""}`
            }
          >
            <span className="client-bottom-nav__icon" aria-hidden>🛒</span>
            <span className="client-bottom-nav__label">Carrito</span>
            {count > 0 && <span className="client-bottom-nav__badge">{count}</span>}
          </NavLink>
          <NavLink
            to="/reservar"
            className={({ isActive }) =>
              `client-bottom-nav__item${isActive ? " client-bottom-nav__item--active" : ""}`
            }
          >
            <span className="client-bottom-nav__icon" aria-hidden>📅</span>
            <span className="client-bottom-nav__label">Reservar</span>
          </NavLink>
          <button type="button" className="client-bottom-nav__item" onClick={() => setNavOpen(true)}>
            <span className="client-bottom-nav__icon" aria-hidden>☰</span>
            <span className="client-bottom-nav__label">Menú</span>
          </button>
        </nav>
      )}

      {!authRoute && <ClientFooter />}
    </div>
  );
}
