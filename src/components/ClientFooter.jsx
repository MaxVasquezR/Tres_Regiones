import { Link } from "react-router-dom";

export default function ClientFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__brand">TRES REGIONES</p>
          <p className="site-footer__tagline">Restaurante turístico presencial · reservas, mesas y operación en un solo flujo.</p>
        </div>
        <div className="site-footer__links">
          <Link to="/">Inicio</Link>
          <Link to="/reservar">Reservar mesa</Link>
          <Link to="/admin/login">Panel del local</Link>
        </div>
        <p className="site-footer__demo">
          Accesos demo: visitante <strong>cliente@sazon.com</strong> / <strong>123456</strong> · administración{" "}
          <strong>admin</strong> / <strong>123456</strong>
        </p>
      </div>
    </footer>
  );
}
