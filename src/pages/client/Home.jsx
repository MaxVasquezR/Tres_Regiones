import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet } from "../../api";
import { useCart } from "../../context/CartContext";
import { SESSION_KEY, nombreParaMostrarCliente, obtenerSesion } from "../../session";
import DemoAccessPanel from "../../components/DemoAccessPanel";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2200&q=82";

const platosLocal = [
  {
    id: 1,
    nombre: "Lomo saltado",
    descripcion: "Carne salteada con cebolla, tomate y papas doradas.",
    precio: "S/ 24.00",
    categoria: "Costa",
    imagen: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    nombre: "Ají de gallina",
    descripcion: "Pollo deshilachado en crema de ají amarillo.",
    precio: "S/ 20.00",
    categoria: "Sierra",
    imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    nombre: "Arroz con pollo",
    descripcion: "Arroz verde con pollo y salsa criolla.",
    precio: "S/ 18.00",
    categoria: "Costa",
    imagen: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  },
];

function SkeletonPlatos() {
  return (
    <div className="skeleton-platos" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-plato">
          <div className="skeleton-plato__img" />
          <div className="skeleton-plato__body">
            <div className="skeleton-plato__line" style={{ width: "70%" }} />
            <div className="skeleton-plato__line skeleton-plato__line--short" />
            <div className="skeleton-plato__line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { addPlato, countPlatos } = useCart();
  const [platos, setPlatos] = useState(platosLocal);
  const [platosLoading, setPlatosLoading] = useState(true);
  const [, setPlatosFuente] = useState("local");
  const [, setSesionTick] = useState(0);
  const location = useLocation();

  const nombreCliente = nombreParaMostrarCliente(obtenerSesion());
  const highlights = [
    { label: "Servicio en sala", value: "100%" },
    { label: "Ambientes", value: "2" },
    { label: "Turnos / noche", value: "7" },
  ];

  useEffect(() => {
    setSesionTick((t) => t + 1);
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSION_KEY) setSesionTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlatosLoading(true);
      try {
        const json = await apiGet("/api/platos");
        if (!cancelled && Array.isArray(json.data) && json.data.length) {
          setPlatos(json.data);
          setPlatosFuente("api");
        } else if (!cancelled) {
          setPlatos(platosLocal);
          setPlatosFuente("local");
        }
      } catch {
        if (!cancelled) {
          setPlatos(platosLocal);
          setPlatosFuente("local");
        }
      } finally {
        if (!cancelled) setPlatosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home home--flow">
      <section className="immersive-hero full-bleed" aria-label="Bienvenida">
        <div className="immersive-hero__bg hero hero--tourism" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
          <div className="hero__overlay" aria-hidden />
          <div className="immersive-hero__frame container container--wide">
            <div className="hero__content">
              <p className="eyebrow eyebrow--light">Sesión activa</p>
              <h1 className="hero__title">Hola, {nombreCliente}</h1>
              <p className="hero__subtitle">
                Continúa tu pedido o reserva en sala. El equipo del local gestiona todo desde el panel operativo.
              </p>
              <div className="hero__actions">
                <Link to="/carrito" className="btn btn--light">
                  Carrito{countPlatos ? ` (${countPlatos})` : ""}
                </Link>
                <Link to="/reservar" className="btn btn--sun">
                  Ir a pedido / reserva
                </Link>
                <a href="#carta" className="btn btn--outline-hero">
                  Ver carta
                </a>
                <Link to="/admin/login" className="btn btn--ghost">
                  Panel del local
                </Link>
              </div>
              <div className="hero__stats" aria-label="Servicio">
                {highlights.map((h) => (
                  <article key={h.label} className="hero__stat">
                    <span className="hero__stat-value">{h.value}</span>
                    <span className="hero__stat-label">{h.label}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-band surface-band--paper">
        <div className="container container--wide">
          <DemoAccessPanel />
        </div>
      </section>

      <section className="surface-band surface-band--mist" id="carta">
        <div className="container container--wide">
          <div className="menu-section" aria-labelledby="menu-heading">
            <div className="section-heading">
              <p className="eyebrow">Carta · tres regiones</p>
              <h2 id="menu-heading" className="section-title">
                {nombreCliente}, nuestra carta
              </h2>
              <p className="section-lead">
                Platos representativos de costa, sierra y selva. Añade al carrito y define delivery o recojo antes de
                pagar.
              </p>
            </div>

            {platosLoading ? (
              <SkeletonPlatos />
            ) : (
              <div className="menu-grid">
                {platos.map((plato) => (
                  <article key={plato.id} className="menu-card card lift">
                    <img src={plato.imagen} alt={plato.nombre} className="menu-card__image" loading="lazy" />
                    <div className="menu-card__body">
                      <h3>{plato.nombre}</h3>
                      {plato.categoria && <p className="menu-card__category">{plato.categoria}</p>}
                      <p className="menu-card__description">{plato.descripcion}</p>
                      <strong className="menu-card__price">{plato.precio}</strong>
                      <div className="menu-card__actions">
                        <button type="button" className="btn btn--primary menu-card__btn" onClick={() => addPlato(plato)}>
                          Añadir
                        </button>
                        <Link to="/carrito" className="btn btn--outline-dark menu-card__btn">
                          Carrito
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
