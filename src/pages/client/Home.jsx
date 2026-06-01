import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { scrollHomeTop } from "../../utils/scrollHomeTop";
import { apiGet } from "../../api";
import { SESSION_KEY, nombreParaMostrarCliente, obtenerSesion } from "../../session";
import PlatoModal from "../../components/PlatoModal";
import LivePulseStrip from "../../components/LivePulseStrip";
import { useCart } from "../../context/CartContext";

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=960&q=72",
    headline: ["Comida peruana", "más rápida del mundo"],
    sub: "Delivery Guepardo en ~28 minutos. Costa, sierra y selva, recién hecho, en tu puerta.",
  },
  {
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=960&q=72",
    headline: ["Combos que vuelan", "a tu mesa o tu casa"],
    sub: "Arma tu pedido en un clic y sigue al Guepardo en vivo hasta tu puerta.",
  },
  {
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=960&q=72",
    headline: ["Tres sedes", "en Lima Norte"],
    sub: "Los Olivos, San Martín de Porres y Comas. Pide a domicilio o reserva tu mesa.",
  },
];

const HIGHLIGHTS = [
  { icon: "⚡", value: "28", label: "Min. promedio" },
  { icon: "🐆", value: "3", label: "Sedes Lima Norte" },
  { icon: "⭐", value: "4.9", label: "Calificación" },
];

const CATEGORIAS = ["Todos", "Entradas", "Clásicos", "Norte", "Mar", "Especiales", "Postres"];

const CATEGORIA_COLOR = {
  Entradas: "var(--terracotta)",
  Clásicos: "var(--gold-600)",
  Norte: "var(--brand-700)",
  Mar: "var(--pacific)",
  Especiales: "var(--selva)",
  Postres: "#7c5cbf",
};

const RESENAS = [
  {
    texto:
      "La causa limeña fue una revelación. Ingredientes perfectamente balanceados y presentación de alta cocina. Volveré cada vez que visite Lima.",
    nombre: "Marco V.",
    origen: "Milano, Italia",
    iniciales: "MV",
  },
  {
    texto:
      "Nunca pensé que el ceviche peruano pudiera emocionarme tanto. El tiradito de pescado es simplemente una obra de arte gastronómica.",
    nombre: "Sarah K.",
    origen: "San Francisco, EE.UU.",
    iniciales: "SK",
  },
  {
    texto:
      "El seco de cordero me recordó a la cocina de mi abuela en Cajamarca. Gracias por preservar estas recetas con tanto respeto.",
    nombre: "Rosa M.",
    origen: "Lima, Perú",
    iniciales: "RM",
  },
];

const GALERIA = [
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80",
];

const platosLocal = [
  {
    id: 1,
    nombre: "Lomo saltado",
    descripcion: "Lomo fino de res salteado a fuego alto con cebolla morada, tomate y ají amarillo. Servido con papas fritas doradas y arroz blanco.",
    precio: "S/ 28.00",
    categoria: "Clásicos",
    imagen: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    nombre: "Ají de gallina",
    descripcion: "Pollo deshilachado en crema de ají amarillo con pan, pecanas y aceitunas. Acompañado de papas y arroz.",
    precio: "S/ 22.00",
    categoria: "Clásicos",
    imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    nombre: "Arroz con pato",
    descripcion: "Confit de pato norteño sobre arroz verde de cilantro y chicha de jora. Terminado con salsa criolla fresca.",
    precio: "S/ 32.00",
    categoria: "Norte",
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
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef(null);
  const [platos, setPlatos] = useState(platosLocal);
  const [platosLoading, setPlatosLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [modalPlato, setModalPlato] = useState(null);
  const [, setSesionTick] = useState(0);
  const [sedes, setSedes] = useState([]);
  const [combos, setCombos] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { addPlato, addCombo, setSede, sedeId, count } = useCart();

  const nombreCliente = nombreParaMostrarCliente(obtenerSesion());

  useEffect(() => {
    if (!location.state?.scrollToTop) return;
    requestAnimationFrame(() => scrollHomeTop("auto"));
    navigate("/", { replace: true, state: {} });
  }, [location.state?.scrollToTop, navigate]);

  const startSlideTimer = useCallback(() => {
    clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startSlideTimer();
    return () => clearInterval(slideTimer.current);
  }, [startSlideTimer]);

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
        } else if (!cancelled) {
          setPlatos(platosLocal);
        }
      } catch {
        if (!cancelled) setPlatos(platosLocal);
      } finally {
        if (!cancelled) setPlatosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          apiGet("/api/sedes").catch(() => ({ data: [] })),
          apiGet("/api/combos").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const sedesData = Array.isArray(s.data) ? s.data : [];
        setSedes(sedesData);
        setCombos(Array.isArray(c.data) ? c.data : []);
        if (!sedeId && sedesData[0]) setSede(sedesData[0].id);
      } catch {
        /* offline: secciones comerciales vacías */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sedeId, setSede]);

  useEffect(() => {
    if (platosLoading) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal--visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [platosLoading]);

  const platosFiltered = activeFilter === "Todos" ? platos : platos.filter((p) => p.categoria === activeFilter);

  const goToSlide = (i) => {
    setSlide(i);
    startSlideTimer();
  };

  return (
    <div className="home home--flow home--speed">
      {modalPlato && (
        <PlatoModal plato={modalPlato} onClose={() => setModalPlato(null)} onAdd={addPlato} />
      )}

      {/* ── HERO CAROUSEL ── */}
      <section id="inicio" className="immersive-hero full-bleed" aria-label="Bienvenida">
        <div className="hero-carousel" aria-hidden="true">
          {HERO_SLIDES.map((s, i) => (
            <div
              key={i}
              className={`hero-carousel__slide${i === slide ? " hero-carousel__slide--active" : ""}`}
              style={{ backgroundImage: `url(${s.image})` }}
            />
          ))}
          <div className="hero__overlay" />
        </div>
        <div className="immersive-hero__frame container container--wide">
          <div className="hero__content">
            <p className="eyebrow eyebrow--light">⚡ La cadena de comida peruana más rápida del mundo</p>
            <h1 className="hero__title">
              {HERO_SLIDES[slide].headline[0]}
              <br />
              <span className="hero__title--gold">{HERO_SLIDES[slide].headline[1]}</span>
            </h1>
            <p className="hero__subtitle">{HERO_SLIDES[slide].sub}</p>
            <div className="hero__actions">
              <a href="#carta" className="btn btn--sun">
                Pedir delivery ⚡
              </a>
              <Link to="/reservar" className="btn btn--outline-hero">
                Reservar mesa
              </Link>
            </div>
            <div className="hero__stats hero__stats--desktop" aria-label="Datos del restaurante">
              {HIGHLIGHTS.map((h) => (
                <article key={h.label} className="hero__stat">
                  <span className="hero__stat-icon" aria-hidden>
                    {h.icon}
                  </span>
                  <span className="hero__stat-value">{h.value}</span>
                  <span className="hero__stat-label">{h.label}</span>
                </article>
              ))}
            </div>
          </div>
          <div className="hero-carousel__dots" role="tablist" aria-label="Diapositiva del hero">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === slide}
                aria-label={`Diapositiva ${i + 1}`}
                className={`hero-carousel__dot${i === slide ? " hero-carousel__dot--active" : ""}`}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        </div>
      </section>

      <LivePulseStrip />

      {/* ── BARRA DELIVERY / SEDE ── */}
      {sedes.length > 0 && (
        <section className="delivery-bar full-bleed" aria-label="Sede de entrega">
          <div className="container container--wide delivery-bar__inner">
            <div className="delivery-bar__intro">
              <span className="delivery-bar__guepardo" aria-hidden>🐆</span>
              <div>
                <p className="delivery-bar__title">Delivery Guepardo</p>
                <p className="delivery-bar__sub">Elige tu sede más cercana en Lima Norte</p>
              </div>
            </div>
            <div className="delivery-bar__sedes" role="group" aria-label="Seleccionar sede">
              {sedes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sede-chip${sedeId === s.id ? " sede-chip--active" : ""}`}
                  onClick={() => setSede(s.id)}
                >
                  {s.distrito}
                </button>
              ))}
            </div>
            <a href="#carta" className="btn btn--primary btn--sm delivery-bar__cta">
              Pedir ahora ⚡
            </a>
          </div>
        </section>
      )}

      {/* ── CARTA / MENÚ (prioridad móvil) ── */}
      <section className="surface-band surface-band--mist home-carta" id="carta" aria-labelledby="menu-heading">
        <div className="container container--wide">
          <div className="menu-section">
            <div className="section-heading reveal">
              <p className="eyebrow">Carta · tres regiones</p>
              <h2 id="menu-heading" className="section-title section-title--gradient">
                {nombreCliente ? `${nombreCliente}, pide ya` : "Pide ya ⚡"}
              </h2>
              <p className="section-lead home-carta__lead">
                Toca + Agregar y listo. Delivery Guepardo en ~28 min.
              </p>
            </div>

            <div className="filter-pills reveal" role="group" aria-label="Filtrar por categoría">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill${activeFilter === cat ? " filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {platosLoading ? (
              <SkeletonPlatos />
            ) : platosFiltered.length === 0 ? (
              <p className="section-lead" style={{ textAlign: "center", paddingBlock: 32 }}>
                Sin platos en esta categoría.
              </p>
            ) : (
              <div className="menu-grid">
                {platosFiltered.map((plato) => (
                  <article key={plato.id} className="menu-card card lift reveal">
                    <div className="menu-card__img-wrap">
                      <img
                        src={plato.imagen}
                        alt={plato.nombre}
                        className="menu-card__image"
                        loading="lazy"
                        decoding="async"
                        onClick={() => setModalPlato(plato)}
                        style={{ cursor: "pointer" }}
                      />
                      {plato.categoria && (
                        <span
                          className="menu-card__badge"
                          style={{ background: CATEGORIA_COLOR[plato.categoria] || "var(--brand-700)" }}
                        >
                          {plato.categoria}
                        </span>
                      )}
                    </div>
                    <div className="menu-card__body">
                      <h3
                        className="menu-card__name"
                        onClick={() => setModalPlato(plato)}
                        style={{ cursor: "pointer" }}
                      >
                        {plato.nombre}
                      </h3>
                      <p className="menu-card__description">{plato.descripcion}</p>
                      <strong className="menu-card__price">{plato.precio}</strong>
                      <div className="menu-card__actions menu-card__actions--split">
                        <button
                          type="button"
                          className="btn btn--outline-dark menu-card__btn"
                          onClick={() => setModalPlato(plato)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary menu-card__btn"
                          onClick={() => addPlato(plato, 1, "")}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── COMBOS ── */}
      {combos.length > 0 && (
        <section className="surface-band surface-band--mist reveal" id="combos" aria-labelledby="combos-heading">
          <div className="container container--wide">
            <div className="section-heading" style={{ marginBottom: "clamp(20px, 3vw, 32px)" }}>
              <p className="eyebrow">Combos para compartir</p>
              <h2 id="combos-heading" className="section-title section-title--gradient">
                Arma tu mesa en un clic
              </h2>
            </div>
            <div className="combos-grid">
              {combos.map((c) => (
                <article key={c.id} className="combo-card card lift">
                  <div className="combo-card__img-wrap">
                    <img src={c.imagen} alt={c.nombre} className="combo-card__img" loading="lazy" />
                    {c.destacado ? <span className="combo-card__badge">★ Favorito</span> : null}
                  </div>
                  <div className="combo-card__body">
                    <h3 className="combo-card__name">{c.nombre}</h3>
                    <p className="combo-card__desc">{c.descripcion}</p>
                    <div className="combo-card__foot">
                      <strong className="combo-card__price">S/ {Number(c.precioCombo).toFixed(2)}</strong>
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => addCombo(c)}>
                        Agregar combo
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="home-deferred">
      {/* ── HISTORIA ── */}
      <section className="surface-band reveal" aria-labelledby="historia-heading">
        <div className="container container--wide historia-section">
          <div className="historia-section__text">
            <p className="eyebrow">Nuestra historia</p>
            <h2 id="historia-heading" className="section-title section-title--gradient">
              Donde el Perú se sirve en un plato
            </h2>
            <p className="section-lead" style={{ marginBottom: 16 }}>
              Fundada en San Borja por la familia Huanca, <strong>Tres Regiones</strong> nació de un viaje
              gastronómico por las tres cuencas del país: el océano Pacífico, los Andes y la Amazonía. Cada plato cuenta
              esa travesía.
            </p>
            <p className="section-lead">
              Trabajamos con productores locales de Puno, Piura y Loreto para traer ingredientes nativos que rara vez
              llegan a Lima: papas nativas, ajíes silvestres, hierbas amazónicas. Alta cocina con identidad y raíz.
            </p>
            <div className="historia-badges">
              <span className="trust-chip">8 años de trayectoria</span>
              <span className="trust-chip">Productores locales</span>
              <span className="trust-chip">Carta de piscos</span>
            </div>
          </div>
          <div className="historia-section__visual">
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=900&q=80"
              alt="Chef preparando un plato en la cocina"
              className="historia-section__img"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ── TRES REGIONES ── */}
      <section className="surface-band surface-band--mist" aria-labelledby="regiones-heading">
        <div className="container container--wide">
          <div className="section-heading reveal" style={{ marginBottom: "clamp(28px, 4vw, 44px)" }}>
            <p className="eyebrow">El concepto</p>
            <h2 id="regiones-heading" className="section-title section-title--gradient">
              Tres regiones, un menú
            </h2>
            <p className="section-lead" style={{ maxWidth: "56ch" }}>
              La geografía del Perú es la carta de TRES REGIONES. Cada sección del menú honra una cuenca.
            </p>
          </div>
          <div className="regiones-grid">
            <article className="region-card region-card--costa reveal">
              <div className="region-card__icon" aria-hidden>
                🌊
              </div>
              <h3 className="region-card__title">Costa</h3>
              <p className="region-card__sub">Pacífico · Lima · Piura</p>
              <p className="region-card__desc">
                Ceviche, tiradito, chupe de camarones. El mar peruano es uno de los más ricos del mundo: frío, profundo
                y generoso.
              </p>
              <div className="region-card__tags">
                <span>Corvina</span>
                <span>Camarones</span>
                <span>Ají limo</span>
              </div>
            </article>
            <article className="region-card region-card--sierra reveal">
              <div className="region-card__icon" aria-hidden>
                ⛰
              </div>
              <h3 className="region-card__title">Sierra</h3>
              <p className="region-card__sub">Andes · Cusco · Puno</p>
              <p className="region-card__desc">
                Seco, pachamanca, lomo saltado. La papa nativa en más de 3 000 variedades y el cuy como protagonistas
                andinos.
              </p>
              <div className="region-card__tags">
                <span>Papa nativa</span>
                <span>Cordero</span>
                <span>Huacatay</span>
              </div>
            </article>
            <article className="region-card region-card--selva reveal">
              <div className="region-card__icon" aria-hidden>
                🌿
              </div>
              <h3 className="region-card__title">Selva</h3>
              <p className="region-card__sub">Amazonía · Loreto · Ucayali</p>
              <p className="region-card__desc">
                Juane, tacacho, cocona y aguaje. La Amazonía peruana alberga la mayor biodiversidad gastronómica del
                continente.
              </p>
              <div className="region-card__tags">
                <span>Bijao</span>
                <span>Cecina</span>
                <span>Cocona</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── GALERÍA ── */}
      <section className="surface-band surface-band--paper reveal" aria-label="Galería de platos">
        <div className="container container--wide">
          <div className="section-heading" style={{ marginBottom: "clamp(24px, 4vw, 36px)" }}>
            <p className="eyebrow">Galería</p>
            <h2 className="section-title section-title--gradient">La experiencia en imágenes</h2>
          </div>
          <div className="galeria-mosaic">
            {GALERIA.map((src, i) => (
              <div key={i} className="galeria-mosaic__item reveal">
                <img src={src} alt="" loading="lazy" className="galeria-mosaic__img" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA RESERVAR ── */}
      <section className="cta-reservar-banner full-bleed reveal" aria-label="Reservar mesa">
        <div className="container container--wide cta-reservar-banner__inner">
          <div>
            <p className="eyebrow" style={{ color: "var(--gold-500)" }}>
              Experiencia completa
            </p>
            <h2 className="cta-reservar-banner__title">¿Listos para vivir los tres Perúes?</h2>
            <p style={{ color: "rgba(255,255,255,0.82)", maxWidth: "52ch", margin: 0 }}>
              Reserva tu mesa en sala o terraza. Depósito de separación con devolución garantizada ante cancelación con
              24 h de anticipación.
            </p>
          </div>
          <Link to="/reservar" className="btn btn--sun btn--lg">
            Reservar mesa
          </Link>
        </div>
      </section>

      {/* ── RESEÑAS ── */}
      <section className="surface-band surface-band--mist reveal" aria-labelledby="resenas-heading">
        <div className="container container--wide">
          <div className="section-heading" style={{ marginBottom: "clamp(24px, 4vw, 40px)" }}>
            <p className="eyebrow">Lo que dicen</p>
            <h2 id="resenas-heading" className="section-title section-title--gradient">
              Experiencias de nuestros comensales
            </h2>
          </div>
          <div className="resenas-grid">
            {RESENAS.map((r, i) => (
              <article key={i} className="resena-card card card--pad reveal">
                <div className="resena-card__stars" aria-label="5 de 5 estrellas">
                  ★★★★★
                </div>
                <p className="resena-card__text">"{r.texto}"</p>
                <footer className="resena-card__footer">
                  <div className="resena-card__avatar" aria-hidden>
                    {r.iniciales}
                  </div>
                  <div>
                    <strong className="resena-card__nombre">{r.nombre}</strong>
                    <span className="resena-card__origen">{r.origen}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>
      </div>

      {count > 0 && (
        <button
          type="button"
          className="cart-fab"
          onClick={() => navigate("/carrito")}
          aria-label={`Ver carrito, ${count} productos`}
        >
          🛒
          <span className="cart-fab__count">{count}</span>
          <span className="cart-fab__label">Ver pedido</span>
        </button>
      )}
    </div>
  );
}
