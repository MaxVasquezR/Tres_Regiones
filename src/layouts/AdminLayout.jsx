import { Outlet, NavLink } from "react-router-dom";
import { cerrarSesion, haySesionAdmin, nombreParaMostrarAdmin, obtenerSesion } from "../session";
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { getAdminSede, setAdminSede } from "../data/adminSede";

const NAV = [
  { to: "/admin/operaciones", label: "Centro de operación" },
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/ventas", label: "Ventas sala" },
  { to: "/admin/cierre-caja", label: "Cierre de caja" },
  { to: "/admin/platos", label: "Carta · platos" },
  { to: "/admin/menu-del-dia", label: "Menú del día" },
  { to: "/admin/reservas", label: "Reservas" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/cuentas", label: "Cuentas" },
  { to: "/admin/perfil", label: "Perfil del local" },
];

export default function AdminLayout() {
  const [, setTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [sedeSel, setSedeSel] = useState(getAdminSede());
  const sesion = obtenerSesion();
  const adminOn = haySesionAdmin();

  useEffect(() => {
    if (!adminOn) return;
    apiGet("/api/sedes")
      .then((r) => setSedes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSedes([]));
  }, [adminOn]);

  const cambiarSede = (id) => {
    setSedeSel(id);
    setAdminSede(id);
  };

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
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          onClick={closeDrawer}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="sidebar__divider" />
      <NavLink to="/mozo/mesas" className="sidelink sidelink--external" onClick={closeDrawer}>
        Pantalla mozo
      </NavLink>
      <NavLink to="/cocina" className="sidelink sidelink--external" onClick={closeDrawer}>
        Pantalla cocina
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
          <p className="sidebar__subtitle">Gestión operativa</p>
          {adminOn ? <p className="sidebar__session">{nombreParaMostrarAdmin(sesion)}</p> : null}
        </div>
        {nav}
      </aside>

      <main className="admin__main">
        <div className="admin-mobile-toolbar">
          <button
            type="button"
            className="admin-mobile-toolbar__btn"
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="admin-mobile-toolbar__line" aria-hidden />
            <span className="admin-mobile-toolbar__line" aria-hidden />
            <span className="admin-mobile-toolbar__line" aria-hidden />
          </button>
          <span className="admin-mobile-toolbar__title">Administración</span>
        </div>

        <div className="admin__inner">
          {adminOn ? (
            <header className="admin-topbar admin-topbar--desktop-only">
              <span className="admin-topbar__hello">Hola, {nombreParaMostrarAdmin(sesion)}</span>
              {sedes.length > 0 && (
                <label className="admin-sede-picker">
                  <span>Sede</span>
                  <select
                    className="input input--compact"
                    value={sedeSel}
                    onChange={(e) => cambiarSede(e.target.value)}
                  >
                    <option value="">Todas las sedes</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.distrito}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </header>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
