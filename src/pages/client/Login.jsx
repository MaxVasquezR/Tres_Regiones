import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiPost } from "../../api";
import { iniciarSesionCliente, haySesionCliente } from "../../session";
import { useReservations } from "../../context/ReservationsContext";

const HERO_BG =
  "https://images.unsplash.com/photo-1552566626-52f22c687f97?auto=format&fit=crop&w=2400&q=85";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useReservations();
  const location = useLocation();
  const from = location.state?.from;
  const funnelPedido = location.state?.funnel === "pedido";
  const afterLogin = from && String(from).startsWith("/") ? from : "/";
  const [nombre, setNombre] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!haySesionCliente()) return;
    const target =
      from && String(from).startsWith("/") && from !== "/login" && from !== "/register" ? from : "/";
    navigate(target, { replace: true });
  }, [from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreTrim = nombre.trim();
    const cel = contrasena.replace(/\D/g, "").slice(0, 9);

    if (!nombreTrim || cel.length !== 9) {
      setError("Ingresa tu nombre como lo registraste y tu celular de 9 dígitos (tu contraseña).");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const json = await apiPost("/api/auth/login", { nombre: nombreTrim, contrasena: cel });
      iniciarSesionCliente({ token: json.token, user: json.user });
      await refresh();
      navigate(afterLogin, { replace: true });
    } catch (err) {
      setError(err?.message || "Nombre o celular incorrectos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split auth-split--gate">
      <section className="auth-split__story auth-gate-hero" aria-label="Propuesta comercial">
        <div className="auth-gate-hero__photo" style={{ backgroundImage: `url(${HERO_BG})` }} aria-hidden />
        <div className="auth-gate-hero__veil" aria-hidden />
        <div className="auth-gate-hero__glow" aria-hidden />
        <div className="auth-split__overlay auth-gate-hero__overlay-tone" />

        <div className="auth-split__story-inner auth-gate-hero__inner">
          <p className="eyebrow eyebrow--light auth-gate-hero__eyebrow">⚡ Tres Regiones · Lima Norte</p>
          <h1 className="auth-gate-hero__title">
            La comida peruana más rápida del mundo, en tu puerta.
          </h1>
          <p className="auth-gate-hero__lead">
            Ingresa con tu nombre y celular para pedir delivery Guepardo, seguir tu pedido en vivo y guardar tus
            direcciones favoritas.
          </p>

          <div className="auth-gate-kpis" aria-label="Por qué Tres Regiones">
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">~28 min</span>
              <span className="auth-gate-kpis__label">Tiempo promedio de entrega del Guepardo</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">3 sedes</span>
              <span className="auth-gate-kpis__label">Los Olivos, San Martín de Porres y Comas</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">Pago fácil</span>
              <span className="auth-gate-kpis__label">Yape/Plin, tarjeta o efectivo al recibir</span>
            </article>
          </div>

          <ul className="auth-split__bullets auth-gate-hero__bullets">
            <li>Sigue tu pedido en vivo: cocina, salida y Guepardo en camino con tu repartidor asignado.</li>
            <li>Combos y carta para pedir en un clic.</li>
            <li>¿Prefieres venir? También reservas tu mesa desde aquí.</li>
          </ul>

          <div className="auth-gate-hero__links">
            <Link to="/register" className="btn btn--ghost">
              Crear mi cuenta
            </Link>
            <Link to="/admin/login" className="btn btn--ghost btn--ghost-dim">
              Soy del equipo
            </Link>
          </div>
        </div>
      </section>

      <section className="auth-split__panel auth-split__panel--gate">
        <div className="card auth__card auth__card--gate">
          {funnelPedido || from === "/reservar" || from === "/checkout" ? (
            <p className="funnel-banner" role="status">
              {from === "/checkout" ? (
                <>
                  Inicia sesión para <strong>confirmar y pagar tu pedido</strong> (Yape/Plin, tarjeta o efectivo).
                </>
              ) : (
                <>
                  Inicia sesión y continúa con tu <strong>pedido o reserva</strong> usando los mismos datos.
                </>
              )}
            </p>
          ) : null}
          <p className="eyebrow">Iniciar sesión</p>
          <h2 className="auth__title">Hola de nuevo 👋</h2>
          <p className="auth__subtitle">Entra con tu nombre y tu celular (la misma clave de tu registro).</p>

          <form onSubmit={handleSubmit} className="auth__form">
            <div className="field">
              <label className="label">
                Nombre completo<span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Igual que al registrarte"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                aria-invalid={error ? "true" : "false"}
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label className="label">
                Celular (contraseña)<span className="req">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9 dígitos, ej. 987654321"
                value={contrasena}
                onChange={(e) => {
                  setContrasena(e.target.value.replace(/\D/g, "").slice(0, 9));
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                aria-invalid={error ? "true" : "false"}
                maxLength={9}
                autoComplete="tel-national"
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="hint">
            ¿Primera vez? <Link to="/register">Crea tu cuenta</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
