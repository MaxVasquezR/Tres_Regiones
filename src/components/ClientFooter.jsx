import { Link } from "react-router-dom";

export default function ClientFooter() {
  return (
    <footer className="site-footer">
      <div className="container container--wide site-footer__inner">
        <div>
          <p className="site-footer__brand">TRES REGIONES</p>
          <p className="site-footer__tagline">
            Reservas, pedidos a domicilio y panel operativo para restaurantes. Tres Regiones, cocina costa, sierra y
            selva.
          </p>
        </div>
            <div className="site-footer__links">
          <Link to="/">Inicio</Link>
          <Link to="/carrito">Carrito / delivery</Link>
          <Link to="/reservar">Reservar mesa</Link>
          <Link to="/admin/login">Panel del local</Link>
        </div>
      </div>
    </footer>
  );
}
