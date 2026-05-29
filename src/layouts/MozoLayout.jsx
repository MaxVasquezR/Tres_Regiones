import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cerrarSesion, haySesionMozoOrAdmin, nombreParaMostrarMozo, obtenerSesion } from "../session";
import { useState, useEffect } from "react";

export default function MozoLayout() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const [hora, setHora] = useState(() => new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const id = setInterval(() => {
      setHora(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    cerrarSesion();
    navigate("/mozo/login");
  };

  return (
    <div className="mozo-shell">
      <header className="mozo-topbar">
        <div className="mozo-topbar__brand">
          <span className="mozo-topbar__mark">TR</span>
          <span className="mozo-topbar__name">TRES REGIONES</span>
        </div>
        <nav className="mozo-topbar__nav">
          <NavLink
            to="/mozo/mesas"
            className={({ isActive }) => `mozo-topbar__link${isActive ? " mozo-topbar__link--active" : ""}`}
          >
            Mesas
          </NavLink>
          <NavLink
            to="/cocina"
            className={({ isActive }) => `mozo-topbar__link${isActive ? " mozo-topbar__link--active" : ""}`}
          >
            Cocina
          </NavLink>
        </nav>
        <div className="mozo-topbar__right">
          <span className="mozo-topbar__time">{hora}</span>
          {sesion && (
            <span className="mozo-topbar__user">
              {nombreParaMostrarMozo(sesion)}
            </span>
          )}
          {haySesionMozoOrAdmin() && (
            <button type="button" className="mozo-topbar__logout" onClick={handleLogout}>
              Salir
            </button>
          )}
        </div>
      </header>
      <main className="mozo-main">
        <Outlet />
      </main>
    </div>
  );
}
