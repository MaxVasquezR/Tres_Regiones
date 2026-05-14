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
          <p className="eyebrow eyebrow--light auth-gate-hero__eyebrow">Restaurante · Lima</p>
          <h1 className="auth-gate-hero__title">
            Mesas ocupadas, pedidos claros y cobros registrados en un solo flujo.
          </h1>
          <p className="auth-gate-hero__lead">
            Carta en línea, carrito con delivery, reservas en sala y panel del local: una base lista para operar y
            para conectar pasarela de pago cuando el negocio lo defina.
          </p>

          <div className="auth-gate-kpis" aria-label="Mensajes de valor">
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">1 flujo</span>
              <span className="auth-gate-kpis__label">Carta, pedido, reserva y confirmación alineados</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">Rápido</span>
              <span className="auth-gate-kpis__label">El cliente entra con nombre y celular y sigue al pedido o reserva</span>
            </article>
            <article className="auth-gate-kpis__card">
              <span className="auth-gate-kpis__value">Escala</span>
              <span className="auth-gate-kpis__label">Misma base para varios locales, delivery y métodos de pago</span>
            </article>
          </div>

          <ul className="auth-split__bullets auth-gate-hero__bullets">
            <li>Vitrina por regiones del Perú: la experiencia se entiende antes del primer pedido.</li>
            <li>Panel operativo: ocupación, pedidos y cuentas con vista para gerencia y sala.</li>
            <li>Pagos con tarjeta, QR y efectivo se integran con la pasarela que el local elija.</li>
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
                  Completa el acceso para <strong>confirmar y pagar tu pedido</strong> (tarjeta, QR o efectivo).
                </>
              ) : (
                <>
                  Estás en el <strong>flujo de pedido o reserva</strong>: al entrar continúas hacia sala o checkout con
                  los mismos datos de contacto.
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
            Acceso de evaluación: <strong>Mayra Cliente Demo</strong> · celular <strong>999888777</strong> (como contraseña)
          </p>

          <p className="hint">
            ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
