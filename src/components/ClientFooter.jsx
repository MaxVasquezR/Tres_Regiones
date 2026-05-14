import { Link } from "react-router-dom";

export default function ClientFooter() {
  return (
    <footer className="site-footer">
      <div className="container container--wide site-footer__inner">
        <div>
          <p className="site-footer__brand">TRES REGIONES</p>
          <p className="site-footer__tagline">
            SaaS de reservas y operación para restaurante turístico peruano · minimuestra profesional para preventa.
          </p>
        </div>
            <div className="site-footer__links">
          <Link to="/">Inicio</Link>
          <Link to="/carrito">Carrito / delivery</Link>
          <Link to="/reservar">Reservar mesa</Link>
          <Link to="/admin/login">Panel del local</Link>
        </div>
        <p className="site-footer__demo">
          Demo visitante: nombre <strong>Mayra Cliente Demo</strong> · celular <strong>999888777</strong> (contraseña) ·
          administración <strong>admin</strong> / <strong>123456</strong>
        </p>
      </div>
    </footer>
  );
}
