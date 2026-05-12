import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiPost } from "../../api";
import { iniciarSesionCliente } from "../../session";
import { useReservations } from "../../context/ReservationsContext";

const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=1600&q=80";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useReservations();
  const location = useLocation();
  const from = location.state?.from;
  const afterLogin = from === "/reservar" ? "/reservar" : "/";
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = correo.trim().toLowerCase();

    if (!email || !contrasena) {
      setError("Ingresa correo y contraseña.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("El correo no tiene un formato válido.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const json = await apiPost("/api/auth/login", { correo: email, contrasena });
      iniciarSesionCliente({ token: json.token, user: json.user });
      await refresh();
      navigate(afterLogin, { replace: true });
    } catch (err) {
      setError(err?.message || "Correo o contrasena incorrectos");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
      <section className="auth-split__story" style={{ backgroundImage: `url(${AUTH_IMAGE})` }}>
        <div className="auth-split__overlay" />
        <div className="auth-split__story-inner">
          <p className="eyebrow eyebrow--light">Lima · experiencia turística</p>
          <h1>Tu mesa en el Perú empieza aquí</h1>
          <p>
            Accede para ver la carta de tres regiones, guardar tu visita y reservar con la misma lógica que usará el
            restaurante con viajeros reales.
          </p>
          <ul className="auth-split__bullets">
            <li>Carta curada para turistas y locales</li>
            <li>Reserva con depósito y confirmación</li>
            <li>Panel operativo para el equipo del local</li>
          </ul>
          <Link to="/" className="btn btn--ghost">
            Volver al inicio
          </Link>
        </div>
      </section>

      <section className="auth-split__panel">
        <div className="card auth__card">
          <p className="eyebrow">Acceso visitante</p>
          <h2 className="auth__title">Bienvenido de vuelta</h2>
          <p className="auth__subtitle">Ingresa para explorar la carta y separar tu mesa.</p>

          <form onSubmit={handleSubmit} className="auth__form">
            <div className="field">
              <label className="label">
                Correo<span className="req">*</span>
              </label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                aria-invalid={error ? "true" : "false"}
              />
            </div>

            <div className="field">
              <label className="label">
                Contraseña<span className="req">*</span>
              </label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={contrasena}
                onChange={(e) => {
                  setContrasena(e.target.value);
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                aria-invalid={error ? "true" : "false"}
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="demo-credential">
            Demo: <strong>cliente@sazon.com</strong> / <strong>123456</strong>
          </p>

          <p className="hint">
            ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
