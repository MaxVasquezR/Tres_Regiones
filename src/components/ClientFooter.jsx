import { Link } from "react-router-dom";

export default function ClientFooter() {
  return (
    <footer className="site-footer">
      <div className="container container--wide site-footer__inner">
        <div>
          <p className="site-footer__brand">TRES REGIONES</p>
          <p className="site-footer__tagline">
            La cadena de comida peruana más rápida del mundo. Delivery Guepardo en Los Olivos, San Martín de Porres y
            Comas. Pedidos en ~28 min.
          </p>
        </div>
        <div className="site-footer__links">
          <Link to="/">Carta y delivery</Link>
          <Link to="/mis-pedidos">Mis pedidos</Link>
          <Link to="/reservar">Reservar mesa</Link>
          <Link to="/mozo/login">Acceso personal</Link>
          <Link to="/admin/login">Administración</Link>
        </div>
      </div>
    </footer>
  );
}
