import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet } from "../../api";
import { SESSION_KEY, haySesionCliente, nombreParaMostrarCliente, obtenerSesion } from "../../session";
import DemoAccessPanel from "../../components/DemoAccessPanel";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1529042410759-befb1204b952?auto=format&fit=crop&w=1800&q=80";

const platosLocal = [
  {
    id: 1,
    nombre: "Lomo saltado",
    descripcion: "Carne salteada con cebolla, tomate y papas doradas.",
    precio: "S/ 24.00",
    imagen: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    nombre: "Ají de gallina",
    descripcion: "Pollo deshilachado en crema de ají amarillo.",
    precio: "S/ 20.00",
    imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    nombre: "Arroz con pollo",
    descripcion: "Arroz verde con pollo y salsa criolla.",
    precio: "S/ 18.00",
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
  const [platos, setPlatos] = useState(platosLocal);
  const [platosLoading, setPlatosLoading] = useState(true);
  const [, setPlatosFuente] = useState("local");
  const [, setSesionTick] = useState(0);
  const location = useLocation();

  const logueado = haySesionCliente();
  const nombreCliente = nombreParaMostrarCliente(obtenerSesion());
  const highlights = [
    { label: "Experiencia presencial", value: "100%" },
    { label: "Ambientes en sala", value: "2" },
    { label: "Turnos diarios", value: "7" },
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
    <div className="home">
      <section className="hero hero--tourism" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="hero__overlay" />
        <div className="hero__content">
          <p className="eyebrow eyebrow--light">Restaurante turístico · Lima</p>
          <h1 className="hero__title">
            {logueado ? `Hola, ${nombreCliente}` : "TRES REGIONES"}
          </h1>
          <p className="hero__subtitle">
            {logueado ? (
              <>
                Gracias por volver. Revisa la carta de costa, sierra y selva, y reserva tu mesa con la misma experiencia
                que verán los viajeros en destino.
              </>
            ) : (
              <>
                Cocina peruana para viajeros: explora la carta, elige mesa y confirma tu visita presencial con una
                experiencia premium de reserva.
              </>
            )}
          </p>

          <div className="hero__actions">
            {logueado ? (
              <Link to="/reservar" className="btn btn--light">
                Reservar mesa
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--light" state={{ from: "/reservar" }}>
                  Reservar experiencia
                </Link>
                <Link to="/login" className="btn btn--ghost">
                  Acceso visitante
                </Link>
              </>
            )}
            <Link to="/admin/login" className="btn btn--ghost">
              Panel del local
            </Link>
          </div>

          <div className="hero__stats" aria-label="Indicadores del restaurante">
            {highlights.map((h) => (
              <article key={h.label} className="hero__stat">
                <span className="hero__stat-value">{h.value}</span>
                <span className="hero__stat-label">{h.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <DemoAccessPanel />

      <section className="menu-section">
        <div className="section-heading">
          <p className="eyebrow">Carta de viaje</p>
          <h2 className="section-title">{logueado ? `${nombreCliente}, platos sugeridos` : "Sabores que cuentan el Perú"}</h2>
          <p className="section-lead">
            Platos emblemáticos de costa, sierra y selva para inspirar la visita antes de reservar mesa en sala.
          </p>
        </div>

        {platosLoading ? (
          <SkeletonPlatos />
        ) : (
          <div className="menu-grid">
            {platos.map((plato) => (
              <article key={plato.id} className="menu-card lift">
                <img src={plato.imagen} alt={plato.nombre} className="menu-card__image" loading="lazy" />
                <div className="menu-card__body">
                  <h3>{plato.nombre}</h3>
                  {plato.categoria && <p className="menu-card__category">{plato.categoria}</p>}
                  <p className="menu-card__description">{plato.descripcion}</p>
                  <strong className="menu-card__price">{plato.precio}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
