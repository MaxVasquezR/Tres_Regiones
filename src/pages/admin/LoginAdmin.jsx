import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiPost } from "../../api";
import { iniciarSesionAdmin } from "../../session";
import { useReservations } from "../../context/ReservationsContext";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { refresh } = useReservations();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const u = usuario.trim();
    if (!u || !contrasena) {
      setError("Completa usuario y contraseña.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const json = await apiPost("/api/auth/admin-login", { usuario: u, contrasena });
      iniciarSesionAdmin({ token: json.token, user: json.user });
      await refresh();
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err?.message || "Usuario o contrasena incorrectos");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="standalone-page">
      <div className="split">
        <div className="split__left">
        <div className="split__badge">
          <span style={{ color: "var(--gold-600)", fontWeight: 900 }}>●</span>
          Acceso administrativo
        </div>
        <h1>TRES REGIONES</h1>
        <p style={{ marginTop: 10, maxWidth: 420, color: "rgba(255,255,255,0.86)" }}>
          Panel para gestionar cuentas, reservas y calendario del restaurante.
        </p>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/login" className="btn btn--ghost">
            Vista visitante (login)
          </Link>
          <a href="#login" className="btn btn--light">
            Iniciar sesión
          </a>
        </div>
      </div>

      <div className="split__right pattern-bg">
        <div id="login" className="card auth__card" style={{ maxWidth: 440 }}>
          <h2 className="auth__title">Administrador</h2>
          <p className="auth__subtitle">Ingresa con tus credenciales</p>

          <form onSubmit={handleSubmit} className="auth__form">
            <div className="field">
              <label className="label">
                Usuario<span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Ingrese su usuario"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
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
                placeholder="Ingrese su contrasena"
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

          <p className="hint">
            ¿Problemas para ingresar? <Link to="/login">Ir al acceso de clientes</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
