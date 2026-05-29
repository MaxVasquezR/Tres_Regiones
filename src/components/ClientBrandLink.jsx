import { Link } from "react-router-dom";
import { useGoHome } from "../hooks/useGoHome";

/** Marca fija: vuelve a la primera pantalla de la carta (arriba del todo). */
export default function ClientBrandLink({ className = "" }) {
  const goHome = useGoHome();

  return (
    <Link
      to="/"
      className={`brand brand--home${className ? ` ${className}` : ""}`}
      aria-label="Tres Regiones — volver al inicio de la carta"
      onClick={goHome}
    >
      <span className="brand__mark" aria-hidden="true">
        TR
      </span>
      <div className="brand__copy">
        <span className="brand__name">TRES REGIONES</span>
        <span className="brand__tagline">⚡ Delivery Guepardo · Lima Norte</span>
      </div>
    </Link>
  );
}
