import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiGet, apiPost } from "../../api";
import { useCart } from "../../context/CartContext";
import DeliveryMapPicker from "../../components/DeliveryMapPicker";
import DeliveryAddressEditor from "../../components/DeliveryAddressEditor";

const STEPS = [
  { id: "entrega", label: "Entrega", icon: "📍" },
  { id: "pago", label: "Pago", icon: "💳" },
];
const METODOS = [
  { id: "qr", label: "Yape / Plin", icon: "📱" },
  { id: "card", label: "Tarjeta", icon: "💳" },
  { id: "cash", label: "Efectivo al recibir", icon: "💵" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, descuentoSoles, promo, clear } = useCart();

  const [zonas, setZonas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [step, setStep] = useState(0);
  const [direccion, setDireccion] = useState({ calle: "", distrito: "", referencia: "", celularContacto: "" });
  const [sedeId, setSedeId] = useState(null);
  const [metodo, setMetodo] = useState("qr");
  const [cardLast4, setCardLast4] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [z, s] = await Promise.all([apiGet("/api/zonas-delivery"), apiGet("/api/sedes")]);
        setZonas(Array.isArray(z.data) ? z.data : []);
        setSedes(Array.isArray(s.data) ? s.data : []);
      } catch {
        setZonas([]);
      }
    })();
  }, []);

  const zonaSel = useMemo(
    () => zonas.find((z) => z.distrito === direccion.distrito) || null,
    [zonas, direccion.distrito],
  );
  const deliverySoles = zonaSel?.costoSoles ?? 0;
  const subtotalNeto = Math.max(0, subtotal - descuentoSoles);
  const total = subtotalNeto + deliverySoles;
  const sedeNombre = sedes.find((s) => s.id === (sedeId || zonaSel?.sedeId))?.nombre || "";

  const onLocation = (loc) => {
    setDireccion((prev) => ({
      ...prev,
      calle: loc.calle || prev.calle,
      distrito: loc.cobertura && loc.distrito ? loc.distrito : prev.distrito,
    }));
    if (loc.cobertura && loc.sedeId) setSedeId(loc.sedeId);
  };

  const validarEntrega = () => {
    if (direccion.calle.trim().length < 4) return "Indica tu dirección (calle y número).";
    if (!direccion.distrito) return "Selecciona tu distrito de entrega.";
    if (!zonaSel) return "Aún no llegamos a ese distrito. Elige Los Olivos, San Martín de Porres o Comas.";
    if (direccion.referencia.trim().length < 3) return "Agrega una referencia para ubicarte.";
    if (direccion.celularContacto.length !== 9) return "Indica un celular de contacto de 9 dígitos.";
    return "";
  };

  const continuar = () => {
    const e = validarEntrega();
    if (e) {
      setError(e);
      return;
    }
    setSedeId((prev) => prev || zonaSel?.sedeId || null);
    setError("");
    setStep(1);
  };

  const pagar = async () => {
    setError("");
    if (metodo === "card" && cardLast4.replace(/\D/g, "").length < 4) {
      setError("Ingresa los últimos 4 dígitos de la tarjeta.");
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        sedeId: sedeId || zonaSel?.sedeId || undefined,
        items: items.map((it) =>
          it.tipo === "combo"
            ? { comboId: it.comboId, qty: it.qty }
            : { platoId: it.platoId, qty: it.qty, notas: it.notas },
        ),
        direccion: { calle: direccion.calle.trim(), distrito: direccion.distrito },
        referencia: direccion.referencia.trim(),
        celularContacto: direccion.celularContacto,
        paymentMethod: metodo,
        cardLast4: metodo === "card" ? cardLast4.replace(/\D/g, "").slice(-4) : undefined,
      };
      const res = await apiPost("/api/pedidos-delivery", payload, { auth: true });
      clear();
      navigate(`/pedido/${res.data.id}`, { state: { justCreated: true } });
    } catch (err) {
      setError(err?.message || "No se pudo registrar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container container--narrow cart-page">
        <div className="cart-empty card card--pad">
          <div className="cart-empty__icon" aria-hidden>🐆</div>
          <h1 className="section-title">No hay nada que pagar</h1>
          <p className="section-lead">Agrega platos o combos a tu carrito para continuar.</p>
          <Link to="/" className="btn btn--primary">Ver la carta</Link>
        </div>
      </div>
    );
  }

  const stickyCta = step === 0 ? continuar : pagar;
  const stickyLabel = step === 0 ? "Continuar" : enviando ? "Enviando…" : `Pagar S/ ${total.toFixed(2)}`;

  return (
    <div className="container container--narrow checkout-page checkout-page--with-sticky">
      <header className="checkout-page__head">
        <Link to="/carrito" className="btn btn--ghost btn--sm">← Carrito</Link>
        <h1 className="section-title">Finalizar pedido</h1>
      </header>

      <div className="step-indicator" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`step-indicator__item${step === i ? " step-indicator__item--active" : step > i ? " step-indicator__item--done" : ""}`}
          >
            <span className="step-indicator__num">{step > i ? "✓" : s.icon}</span>
            <span className="step-indicator__label">{s.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {step === 0 && (
        <div className="checkout-grid">
          <div className="checkout-col">
            <h3 className="cuenta-step__title">¿Dónde lo entregamos?</h3>
            <DeliveryMapPicker onLocation={onLocation} />
            <DeliveryAddressEditor value={direccion} zonas={zonas} onChange={setDireccion} />
          </div>
          <aside className="checkout-aside card card--pad">
            <h4>Resumen</h4>
            <div className="cart-summary__row"><span>Subtotal</span><strong>S/ {subtotal.toFixed(2)}</strong></div>
            {descuentoSoles > 0 && (
              <div className="cart-summary__row cart-summary__row--discount">
                <span>{promo?.label || "Descuento"}</span>
                <strong>− S/ {descuentoSoles.toFixed(2)}</strong>
              </div>
            )}
            <div className="cart-summary__row">
              <span>Delivery {direccion.distrito ? `· ${direccion.distrito}` : ""}</span>
              <strong>{zonaSel ? `S/ ${deliverySoles.toFixed(2)}` : "—"}</strong>
            </div>
            {zonaSel && (
              <p className="checkout-eta">⚡ Llegada estimada {zonaSel.minutosMin}–{zonaSel.minutosMax} min</p>
            )}
            {sedeNombre && <p className="hint">Sale de {sedeNombre}</p>}
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <strong>S/ {total.toFixed(2)}</strong>
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={continuar}>
              Continuar al pago
            </button>
          </aside>
        </div>
      )}

      {step === 1 && (
        <div className="checkout-grid">
          <div className="checkout-col">
            <h3 className="cuenta-step__title">Método de pago</h3>
            <div className="pago-metodos">
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`pago-metodo-btn${metodo === m.id ? " pago-metodo-btn--active" : ""}`}
                  onClick={() => setMetodo(m.id)}
                >
                  <span className="pago-metodo-btn__icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {metodo === "card" && (
              <div className="field" style={{ marginTop: 16 }}>
                <label className="label">Últimos 4 dígitos de la tarjeta<span className="req">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="4521"
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  maxLength={4}
                />
                <p className="hint">Pago seguro simulado para tu pedido Guepardo.</p>
              </div>
            )}

            {metodo === "qr" && (
              <div className="pago-qr-preview">
                <QRCodeSVG value={`PE|TRES_REGIONES|CHECKOUT|${total.toFixed(2)}|PEN|YAPE_PLIN`} size={180} level="M" includeMargin />
                <p className="hint" style={{ textAlign: "center", marginTop: 8 }}>Escanea con Yape o Plin · S/ {total.toFixed(2)}</p>
              </div>
            )}

            {metodo === "cash" && (
              <div className="pago-cash-msg">
                <p>Pagas en efectivo al recibir tu pedido. Ten el monto exacto si es posible.</p>
              </div>
            )}

            <div className="cuenta-step__actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn--outline-dark" onClick={() => { setStep(0); setError(""); }}>
                Atrás
              </button>
              <button type="button" className="btn btn--primary" onClick={pagar} disabled={enviando}>
                {enviando ? "Enviando…" : `Pagar S/ ${total.toFixed(2)}`}
              </button>
            </div>
          </div>
          <aside className="checkout-aside card card--pad">
            <h4>Entrega</h4>
            <p className="hint">{direccion.calle}, {direccion.distrito}</p>
            <p className="hint">Ref: {direccion.referencia}</p>
            <p className="hint">Contacto: {direccion.celularContacto}</p>
            {descuentoSoles > 0 && (
              <div className="cart-summary__row cart-summary__row--discount">
                <span>Descuento</span>
                <strong>− S/ {descuentoSoles.toFixed(2)}</strong>
              </div>
            )}
            <div className="cart-summary__row cart-summary__row--total" style={{ marginTop: 12 }}>
              <span>Total</span>
              <strong>S/ {total.toFixed(2)}</strong>
            </div>
          </aside>
        </div>
      )}

      <div className="checkout-sticky" aria-label="Acción de pago">
        <div className="checkout-sticky__inner">
          <div>
            <span className="checkout-sticky__label">{STEPS[step].label}</span>
            <strong className="checkout-sticky__total">S/ {total.toFixed(2)}</strong>
          </div>
          <button
            type="button"
            className="btn btn--sun"
            onClick={stickyCta}
            disabled={enviando && step === 1}
          >
            {stickyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
