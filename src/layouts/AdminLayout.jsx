import { Outlet, NavLink } from "react-router-dom";
import { cerrarSesion, haySesionAdmin, nombreParaMostrarAdmin, obtenerSesion } from "../session";
import { useState } from "react";

export default function AdminLayout() {
  const [, setTick] = useState(0);
  const sesion = obtenerSesion();

  return (
    <div className="admin">
      <aside className="sidebar">
        <h2 className="sidebar__title">TRES REGIONES</h2>
        <p className="sidebar__subtitle">Panel administrativo</p>

        <nav className="sidebar__nav">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/cuentas"
            className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          >
            Cuentas
          </NavLink>
          <NavLink
            to="/admin/reservas"
            className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          >
            Reservas
          </NavLink>
          <NavLink
            to="/admin/calendario"
            className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          >
            Calendario
          </NavLink>
          <NavLink
            to="/admin/perfil"
            className={({ isActive }) => `sidelink ${isActive ? "sidelink--active" : ""}`}
          >
            Perfil del local
          </NavLink>
          {haySesionAdmin() && (
            <button
              type="button"
              className="sidelink"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => {
                cerrarSesion();
                setTick((t) => t + 1);
                window.location.href = "/admin/login";
              }}
            >
              Cerrar sesión
            </button>
          )}
        </nav>
      </aside>

      <main className="admin__main">
        {haySesionAdmin() && (
          <header className="admin-topbar">
            <span
              className="admin-topbar__hello"
              title={sesion?.usuario ? `Usuario: ${sesion.usuario}` : undefined}
            >
              Hola, {nombreParaMostrarAdmin(sesion)}
            </span>
          </header>
        )}
        <Outlet />
      </main>
    </div>
  );
}
