import { Link, NavLink } from "react-router-dom";

export default function ClientPrimaryNav({ mode = "topbar", onItemActivate, logueado, countPlatos }) {
  const pick = () => {
    if (typeof onItemActivate === "function") onItemActivate();
  };
  const nl = (isActive) =>
    mode === "sheet"
      ? `navlink navlink--sheet${isActive ? " navlink--sheet-active" : ""}`
      : `navlink${isActive ? " navlink--active" : ""}`;

  return (
    <nav className={mode === "sheet" ? "nav nav--sheet" : "nav"} aria-label="Navegación principal">
      <NavLink to="/" end className={({ isActive }) => nl(isActive)} onClick={pick}>
        Inicio
      </NavLink>
      <Link to="/carrito" className={mode === "sheet" ? "navlink navlink--sheet" : "navlink"} onClick={pick}>
        Pedido{countPlatos ? ` (${countPlatos})` : ""}
      </Link>
      {!logueado ? (
        <Link to="/login" state={{ from: "/reservar" }} className={mode === "sheet" ? "navlink navlink--sheet navlink--sheet-cta" : "navlink navlink--cta"} onClick={pick}>
          Reservar
        </Link>
      ) : (
        <NavLink
          to="/reservar"
          className={({ isActive }) =>
            mode === "sheet"
              ? `navlink navlink--sheet navlink--sheet-cta${isActive ? " navlink--sheet-active" : ""}`
              : `navlink navlink--cta${isActive ? " navlink--active" : ""}`
          }
          onClick={pick}
        >
          Reservar
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
      <NavLink to="/admin/login" className={({ isActive }) => nl(isActive)} onClick={pick}>
        Personal
      </NavLink>
    </nav>
  );
}
