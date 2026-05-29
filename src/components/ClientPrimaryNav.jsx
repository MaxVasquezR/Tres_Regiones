import { NavLink } from "react-router-dom";
import { useGoHome } from "../hooks/useGoHome";

export default function ClientPrimaryNav({ mode = "topbar", onItemActivate, logueado }) {
  const goHome = useGoHome();
  const pick = () => {
    if (typeof onItemActivate === "function") onItemActivate();
  };
  const onCarta = (e) => {
    goHome(e);
    pick();
  };
  const nl = (isActive) =>
    mode === "sheet"
      ? `navlink navlink--sheet${isActive ? " navlink--sheet-active" : ""}`
      : `navlink${isActive ? " navlink--active" : ""}`;

  return (
    <nav className={mode === "sheet" ? "nav nav--sheet" : "nav"} aria-label="Navegación principal">
      <NavLink to="/" end className={({ isActive }) => nl(isActive)} onClick={onCarta}>
        Carta
      </NavLink>
      <NavLink to="/carrito" className={({ isActive }) => nl(isActive)} onClick={pick}>
        Carrito
      </NavLink>
      {logueado && (
        <NavLink to="/mis-pedidos" className={({ isActive }) => nl(isActive)} onClick={pick}>
          Mis pedidos
        </NavLink>
      )}
      {!logueado ? (
        <NavLink to="/login" state={{ from: "/reservar" }} className={({ isActive }) => nl(isActive)} onClick={pick}>
          Reservar mesa
        </NavLink>
      ) : (
        <NavLink to="/reservar" className={({ isActive }) => nl(isActive)} onClick={pick}>
          Reservar mesa
        </NavLink>
      )}
      {!logueado ? (
        <>
          <NavLink to="/login" className={({ isActive }) => nl(isActive)} onClick={pick}>
            Acceso
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => nl(isActive)} onClick={pick}>
            Registro
          </NavLink>
        </>
      ) : null}
      <NavLink to="/mozo/login" className={({ isActive }) => nl(isActive)} onClick={pick}>
        Personal
      </NavLink>
    </nav>
  );
}
