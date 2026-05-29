import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiPost } from "../../api";
import { haySesionCliente } from "../../session";

const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=82";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!haySesionCliente()) return;
    navigate("/", { replace: true });
  }, [navigate]);

  const funnelPedido = location.state?.funnel === "pedido";
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [aceptaMarketingWhatsapp, setAceptaMarketingWhatsapp] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const tel = telefono.replace(/\D/g, "").slice(0, 9);
    if (!nombre.trim() || tel.length !== 9) {
      setError("Nombre completo y celular de 9 dígitos son obligatorios.");
      return;
    }
    if (nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    const mail = correo.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Si indicas correo, debe ser válido.");
      return;
    }
    if (aceptaMarketingWhatsapp && tel.length !== 9) {
      setError("Si aceptas WhatsApp, ingresa un celular peruano de 9 dígitos.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await apiPost("/api/auth/register", {
        nombre: nombre.trim(),
        telefono: tel,
        ...(mail ? { correo: mail } : {}),
        aceptaMarketingWhatsapp,
      });
    } catch (err) {
      setError(err?.message || "No pudimos completar el registro. Revisa los datos e inténtalo de nuevo.");
      return;
    } finally {
      setSubmitting(false);
    }
    navigate("/confirmacion", { state: { flow: "registro", funnel: funnelPedido ? "pedido" : undefined } });
  };

  return (
    <div className="auth-split">
      <section className="auth-split__story" style={{ backgroundImage: `url(${AUTH_IMAGE})` }}>
        <div className="auth-split__overlay" />
        <div className="auth-split__story-inner">
          <p className="eyebrow eyebrow--light">⚡ Crea tu cuenta</p>
          <h1>{funnelPedido ? "Un paso para pedir tu delivery Guepardo" : "Pide rápido y sigue tu pedido en vivo"}</h1>
          <p>
            {funnelPedido ? (
              <>
                Solo necesitamos tu <strong>nombre</strong> y <strong>celular</strong>: tu mismo número será tu clave
                para entrar y por ahí te ubica el repartidor. El correo es opcional.
              </>
            ) : (
              <>
                Regístrate en segundos con nombre y celular. Guarda tus direcciones, revisa tu historial y paga con
                Yape/Plin, tarjeta o efectivo.
              </>
            )}
          </p>
          <Link to="/login" className="btn btn--ghost" state={funnelPedido ? { funnel: "pedido", from: "/reservar" } : undefined}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="auth-split__panel">
        <div className="card auth__card">
          <p className="eyebrow">Nueva cuenta</p>
          <h2 className="auth__title">Crear cuenta</h2>
          <p className="auth__subtitle">
            {funnelPedido
              ? "Nombre y celular. Tu celular será tu clave para iniciar sesión."
              : "Te identificamos por tu nombre en tus pedidos y reservas."}
          </p>

          <div className="notice notice--spaced" role="note" style={{ marginBottom: 16 }}>
            <strong>Sin contraseña aparte.</strong> No hay segundo campo de clave: el mismo celular de 9 dígitos que
            ingreses aquí será la contraseña en &quot;Iniciar sesión&quot; (junto a tu nombre tal cual lo escribas).
          </div>

          <form onSubmit={handleSubmit} className="auth__form" autoComplete="on">
            <div className="field">
              <label className="label">
                Nombre completo<span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. María Elena Quispe"
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
                Celular Perú (9 dígitos)<span className="req">*</span>
              </label>
              <input
                type="tel"
                placeholder="Ej. 987654321"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value.replace(/\D/g, "").slice(0, 9));
                  if (error) setError("");
                }}
                className={`input ${error ? "input--error" : ""}`}
                inputMode="numeric"
                maxLength={9}
                autoComplete="tel-national"
              />
              <p className="hint" style={{ marginTop: 6 }}>
                Este número será tu <strong>contraseña</strong> al iniciar sesión (junto a tu nombre exacto).
              </p>
            </div>

            <div className="field">
              <label className="label">Correo (opcional)</label>
              <input
                type="email"
                placeholder="tu@correo.com — opcional"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError("");
                }}
                className="input"
                autoComplete="email"
              />
            </div>

            <div className="checkbox-field">
              <input
                type="checkbox"
                id="wa-promo"
                checked={aceptaMarketingWhatsapp}
                onChange={(e) => {
                  setAceptaMarketingWhatsapp(e.target.checked);
                  if (error) setError("");
                }}
              />
              <label htmlFor="wa-promo">
                Acepto recibir promociones y novedades por <strong>WhatsApp</strong> al número indicado. Puedo
                revocarlo cuando quiera.
              </label>
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Enviando…" : "Registrarme"}
            </button>
          </form>

          <p className="hint">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" state={funnelPedido ? { funnel: "pedido", from: "/reservar" } : undefined}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
