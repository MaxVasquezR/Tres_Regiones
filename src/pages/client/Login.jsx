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
          <p className="eyebrow eyebrow--light auth-gate-hero__eyebrow">SaaS · restaurante · Lima</p>
          <h1 className="auth-gate-hero__title">
            Llena mesas, cobra más rápido, controla sala desde un solo lugar.
          </h1>
          <p className="auth-gate-hero__lead">
            Plataforma pensada para dueños agresivos con la meta: convertir tráfico en tickets, tickets en recurrentes
            y operación en datos que se venden solos frente a inversionistas.
          </p>

          <div className="auth-gate-kpis" aria-label="Mensajes de valor">
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">1 flujo</span>
              <span className="auth-gate-kpis__label">Carta, carrito, reserva y confirmación alineados</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">0 fricción</span>
              <span className="auth-gate-kpis__label">Tu cliente entra con nombre + celular y ya compra o separa</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">∞ escala</span>
              <span className="auth-gate-kpis__label">Misma base para multi-local, delivery y pagos cuando actives</span>
            </article>
          </div>

          <ul className="auth-split__bullets auth-gate-hero__bullets">
            <li>Vitrina premium por regiones del Perú: impacto visual que vende la experiencia antes del primer plato.</li>
            <li>Panel operativo en paralelo: ocupación, pedidos y cuentas con la seriedad que exige una preventa.</li>
            <li>Listo para enchufar tarjeta, QR y comisiones cuando pases a producción: hoy minimuestra, mañana ingresos.</li>
          </ul>

          <div className="auth-gate-hero__links">
            <Link to="/register" className="btn btn--ghost">
              Crear cuenta nueva
            </Link>
            <Link to="/admin/login" className="btn btn--ghost btn--ghost-dim">
              Acceso personal del local
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
                  Completa el acceso para <strong>pagar tu pedido</strong> (tarjeta, QR o efectivo en minimuestra).
                </>
              ) : (
                <>
                  Estás en el <strong>flujo de pedido</strong>: al entrar pasas directo a reserva en sala (minimuestra).
                  Pagos QR/tarjeta y delivery +S/ 10 se conectarán en la versión comercial.
                </>
              )}
            </p>
          ) : null}
          <p className="eyebrow">Acceso visitante</p>
          <h2 className="auth__title">Entra y ejecuta</h2>
          <p className="auth__subtitle">Tu nombre registrado y tu celular (misma clave que al crear la cuenta).</p>

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
              {submitting ? "Ingresando…" : "Ingresar al producto"}
            </button>
          </form>

          <p className="demo-credential">
            Demo: nombre <strong>Mayra Cliente Demo</strong> · celular <strong>999888777</strong>
          </p>

          <p className="hint">
            ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
