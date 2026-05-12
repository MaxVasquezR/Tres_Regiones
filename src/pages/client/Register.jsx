import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiPost } from "../../api";

const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80";

export default function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !correo || !contrasena) {
      setError("Completa todos los campos");
      return;
    }
    if (nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await apiPost("/api/auth/register", {
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
      });
    } catch (err) {
      setError(err?.message || "No pudimos completar el registro. Revisa los datos e inténtalo de nuevo.");
      return;
    } finally {
      setSubmitting(false);
    }
    navigate("/confirmacion", { state: { flow: "registro" } });
  };

  return (
    <div className="auth-split">
      <section className="auth-split__story" style={{ backgroundImage: `url(${AUTH_IMAGE})` }}>
        <div className="auth-split__overlay" />
        <div className="auth-split__story-inner">
          <p className="eyebrow eyebrow--light">Registro de visitante</p>
          <h1>Guarda tu visita y reserva con anticipación</h1>
          <p>
            Crea una cuenta demo para simular el recorrido de un turista que llega a Lima, consulta la carta y separa
            mesa con depósito.
          </p>
          <Link to="/login" className="btn btn--ghost">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="auth-split__panel">
        <div className="card auth__card">
          <p className="eyebrow">Nuevo visitante</p>
          <h2 className="auth__title">Crear cuenta</h2>
          <p className="auth__subtitle">Regístrate para reservar y recibir confirmación de tu mesa.</p>

          <form onSubmit={handleSubmit} className="auth__form">
            <div className="field">
              <label className="label">
                Nombre completo<span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                aria-invalid={error ? "true" : "false"}
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
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
              {submitting ? "Enviando…" : "Registrarme"}
            </button>
          </form>

          <p className="hint">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
