import { Outlet, NavLink } from "react-router-dom";
import { cerrarSesion, haySesionAdmin, nombreParaMostrarAdmin, obtenerSesion } from "../session";
import { useEffect, useState } from "react";

export default function AdminLayout() {
  const [, setTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sesion = obtenerSesion();
  const adminOn = haySesionAdmin();

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  const nav = (
    <nav className="sidebar__nav">
      <NavLink
        to="/admin/operaciones"
        className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
        onClick={closeDrawer}
      >
        Centro de operación
      </NavLink>
      <NavLink
        to="/admin/dashboard"
        className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
        onClick={closeDrawer}
      >
        Dashboard
      </NavLink>
      <NavLink to="/admin/cuentas" className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`} onClick={closeDrawer}>
        Cuentas
      </NavLink>
      <NavLink to="/admin/reservas" className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`} onClick={closeDrawer}>
        Reservas
      </NavLink>
      <NavLink to="/admin/calendario" className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`} onClick={closeDrawer}>
        Calendario
      </NavLink>
      <NavLink to="/admin/perfil" className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`} onClick={closeDrawer}>
        Perfil del local
      </NavLink>
      <NavLink to="/admin/pedidos" className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`} onClick={closeDrawer}>
        Pedidos web
      </NavLink>
      {adminOn && (
        <button
          type="button"
          className="sidelink sidelink--button"
          onClick={() => {
            cerrarSesion();
            setTick((t) => t + 1);
            closeDrawer();
            window.location.href = "/admin/login";
          }}
        >
          Cerrar sesión
        </button>
      )}
    </nav>
  );

  return (
    <div className={`admin${drawerOpen ? " admin--drawer-open" : ""}`}>
      {drawerOpen ? (
        <button type="button" className="admin__scrim" aria-label="Cerrar menú" onClick={closeDrawer} />
      ) : null}

      <aside className="sidebar" aria-label="Navegación administrativa">
        <div className="sidebar__brand-block">
          <h2 className="sidebar__title">TRES REGIONES</h2>
          <p className="sidebar__subtitle">Plataforma operativa</p>
          {adminOn ? (
            <p className="sidebar__session">Hola, {nombreParaMostrarAdmin(sesion)}</p>
          ) : null}
        </div>
        {nav}
      </aside>

      <main className="admin__main">
        <div className="admin-mobile-toolbar">
          <button
            type="button"
            className="admin-mobile-toolbar__btn"
            aria-label="Abrir menú del panel"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="admin-mobile-toolbar__line" aria-hidden />
            <span className="admin-mobile-toolbar__line" aria-hidden />
            <span className="admin-mobile-toolbar__line" aria-hidden />
          </button>
          <span className="admin-mobile-toolbar__title">Operación</span>
        </div>

        <div className="admin__inner">
          {adminOn ? (
            <header className="admin-topbar admin-topbar--desktop-only">
              <span className="admin-topbar__hello" title={sesion?.usuario ? `Usuario: ${sesion.usuario}` : undefined}>
                Hola, {nombreParaMostrarAdmin(sesion)}
              </span>
            </header>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
