import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiPost } from "../../api";
import { useCart } from "../../context/CartContext";
import { obtenerSesion } from "../../session";
import DeliveryAddressEditor from "../../components/DeliveryAddressEditor";

const METHODS = [
  { id: "card", title: "Tarjeta", desc: "Visa, Mastercard u otras habilitadas por el local." },
  { id: "qr", title: "QR · Yape / Plin", desc: "Pago móvil con código de cobro generado para tu pedido." },
  { id: "cash", title: "Efectivo", desc: "Pago al repartidor o en caja al recoger. El local confirma en panel." },
];

function contactoInicialDesdeSesion() {
  const s = obtenerSesion();
  if (!s || s.role !== "client") return { nombre: "", telefono: "" };
  return {
    nombre: String(s.nombreCompleto || s.nombre || "").trim(),
    telefono: String(s.telefono || "")
      .replace(/\D/g, "")
      .slice(0, 9),
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, delivery, direccion, subtotalSoles, deliverySoles, totalSoles, clearCart } = useCart();
  const ini = contactoInicialDesdeSesion();
  const [contactoNombre, setContactoNombre] = useState(ini.nombre);
  const [contactoTelefono, setContactoTelefono] = useState(ini.telefono);
  const [solicitaComprobante, setSolicitaComprobante] = useState(false);
  const [tipoComprobante, setTipoComprobante] = useState("boleta");
  const [docComprobante, setDocComprobante] = useState("");
  const [razonComprobante, setRazonComprobante] = useState("");
  const [method, setMethod] = useState("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  if (items.length === 0 && !done) {
    return (
      <div className="booking-page">
        <div className="container container--wide">
          <div className="card card--pad cart-empty">
            <p className="section-lead cart-empty__lead">
              No hay productos para pagar. Arma tu carrito primero.
            </p>
            <Link to="/carrito" className="btn btn--primary">
              Ir al carrito
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="booking-page">
        <div className="container container--narrow">
          <div className="card card--pad checkout-result">
            <p className="eyebrow">Pedido registrado</p>
            <h1 className="section-title">Código: {done.codigoPago}</h1>
            <p className="section-lead">
              Total <strong>S/ {Number(done.totalSoles).toFixed(2)}</strong> · Estado: <strong>{done.estado}</strong>
            </p>
            {method === "qr" && done.qrPayload ? (
              <div className="checkout-qr">
                <p className="label" style={{ marginBottom: 8 }}>
                  Escanea con Yape / Plin
                </p>
                <div className="checkout-qr__box">
                  <QRCodeSVG value={done.qrPayload} size={200} level="M" includeMargin />
                </div>
                <p className="hint" style={{ marginTop: 12 }}>
                  Payload: <code className="checkout-code">{done.qrPayload}</code>
                </p>
              </div>
            ) : null}
            <div className="confirmation__actions" style={{ marginTop: 20 }}>
              <Link to="/" className="btn btn--primary">
                Volver al inicio
              </Link>
              <Link to="/#carta" className="btn btn--outline-dark">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const tel = contactoTelefono.replace(/\D/g, "").slice(0, 9);
    if (contactoNombre.trim().length < 3 || tel.length !== 9) {
      setError("Nombre de contacto (mín. 3 caracteres) y celular de 9 dígitos son obligatorios.");
      return;
    }
    if (solicitaComprobante) {
      const doc = docComprobante.replace(/\D/g, "");
      const rz = razonComprobante.trim();
      if (tipoComprobante === "factura") {
        if (doc.length !== 11 || rz.length < 4) {
          setError("Factura: RUC de 11 dígitos y razón social son obligatorios (requisito mínimo SUNAT).");
          return;
        }
      } else if (doc.length !== 8 || rz.length < 4) {
        setError("Boleta: DNI de 8 dígitos y nombre completo del titular son obligatorios.");
        return;
      }
    }
    if (method === "card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 15 || !cardName.trim() || !cardExpiry.trim() || !String(cardCvv).trim()) {
        setError("Completa número de tarjeta, titular, vencimiento y CVV para continuar.");
        return;
      }
    }
    if (delivery) {
      const calleT = direccion.calle.trim();
      const distT = direccion.distrito.trim();
      if (calleT.length < 6 || distT.length < 3) {
        setError("Para delivery completa calle y distrito (ubicación, mapa o texto) antes de pagar.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((x) => ({ platoId: x.platoId, qty: x.qty })),
        delivery,
        direccion: delivery ? direccion : null,
        paymentMethod: method,
        cardLast4: method === "card" ? cardNumber.replace(/\D/g, "").slice(-4) : undefined,
        contactoNombre: contactoNombre.trim(),
        contactoTelefono: tel,
        comprobante: solicitaComprobante
          ? {
              solicita: true,
              tipo: tipoComprobante,
              numeroDocumento: docComprobante.replace(/\D/g, ""),
              razonSocial: razonComprobante.trim(),
            }
          : { solicita: false },
      };
      const json = await apiPost("/api/pedidos", payload, { auth: true });
      clearCart();
      setDone(json.data);
    } catch (err) {
      setError(err?.message || "No se pudo registrar el pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="container container--wide">
        <header className="booking-page__head booking__intro">
          <p className="eyebrow">Pago y confirmación</p>
          <h1 className="section-title">Checkout</h1>
          <p className="section-lead">
            {delivery
              ? "Delivery activo: confirma o ajusta la dirección abajo, luego contacto y pago. Tiempo estimado de entrega ~1 h según tráfico y cocina."
              : "Recojo en local: datos de contacto obligatorios. Si pides comprobante SUNAT, completa DNI + nombre (boleta) o RUC + razón social (factura). Luego elige método de pago."}
          </p>
        </header>

        {delivery ? (
          <div className="checkout-delivery card card--pad">
            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 8 }}>
              Dirección de entrega
            </h2>
            <p className="hint" style={{ marginBottom: 14 }}>
              Misma dirección que en el carrito: GPS, mapa con pin o texto. El reparto usa calle, distrito y referencia.
            </p>
            <DeliveryAddressEditor />
          </div>
        ) : null}

        <div className="checkout-grid">
          <div className="card card--pad">
            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 14 }}>
              Tu orden
            </h2>
            <ul className="checkout-lines">
              {items.map((x) => (
                <li key={x.platoId}>
                  <span>
                    {x.qty}× {x.nombre}
                  </span>
                  <span>S/ {(x.precioSoles * x.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <dl className="cart-summary__lines" style={{ marginTop: 16 }}>
              <div>
                <dt>Subtotal</dt>
                <dd>S/ {subtotalSoles.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>S/ {deliverySoles.toFixed(2)}</dd>
              </div>
              <div className="cart-summary__total">
                <dt>Total</dt>
                <dd>S/ {totalSoles.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <form className="card card--pad checkout-pay" onSubmit={submit}>
            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 12 }}>
              Contacto del pedido
            </h2>
            <p className="hint" style={{ marginBottom: 14 }}>
              Obligatorio para llamadas y coordinación (delivery o dudas del local).
            </p>
            <div className="booking__grid booking__grid--2" style={{ marginBottom: 20 }}>
              <div className="field">
                <label className="label">
                  Nombre completo<span className="req">*</span>
                </label>
                <input
                  className="input"
                  value={contactoNombre}
                  onChange={(e) => setContactoNombre(e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                />
              </div>
              <div className="field">
                <label className="label">
                  Celular<span className="req">*</span>
                </label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={contactoTelefono}
                  onChange={(e) => setContactoTelefono(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  autoComplete="tel-national"
                  maxLength={9}
                />
              </div>
            </div>

            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 10 }}>
              Comprobante de pago (SUNAT)
            </h2>
            <div className="checkbox-field" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                id="sol-comp"
                checked={solicitaComprobante}
                onChange={(e) => {
                  setSolicitaComprobante(e.target.checked);
                  setError("");
                }}
              />
              <label htmlFor="sol-comp">
                Solicito <strong>comprobante electrónico</strong> (boleta con DNI o factura con RUC). Si marcas esta
                casilla, los datos del receptor son obligatorios.
              </label>
            </div>
            {solicitaComprobante ? (
              <div className="checkout-comprobante" style={{ marginBottom: 20 }}>
                <div className="pay-methods pay-methods--inline" role="radiogroup" aria-label="Tipo de comprobante">
                  <button
                    type="button"
                    className={`pay-method ${tipoComprobante === "boleta" ? "pay-method--active" : ""}`}
                    aria-pressed={tipoComprobante === "boleta"}
                    onClick={() => {
                      setTipoComprobante("boleta");
                      setDocComprobante("");
                      setError("");
                    }}
                  >
                    <strong>Boleta</strong>
                    <span>DNI (8 dígitos) + nombre completo</span>
                  </button>
                  <button
                    type="button"
                    className={`pay-method ${tipoComprobante === "factura" ? "pay-method--active" : ""}`}
                    aria-pressed={tipoComprobante === "factura"}
                    onClick={() => {
                      setTipoComprobante("factura");
                      setDocComprobante("");
                      setError("");
                    }}
                  >
                    <strong>Factura</strong>
                    <span>RUC (11 dígitos) + razón social</span>
                  </button>
                </div>
                <div className="booking__grid booking__grid--2" style={{ marginTop: 14 }}>
                  <div className="field">
                    <label className="label">{tipoComprobante === "factura" ? "RUC" : "DNI"}</label>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={docComprobante}
                      onChange={(e) =>
                        setDocComprobante(
                          e.target.value.replace(/\D/g, "").slice(0, tipoComprobante === "factura" ? 11 : 8),
                        )
                      }
                      maxLength={tipoComprobante === "factura" ? 11 : 8}
                    />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label className="label">
                      {tipoComprobante === "factura" ? "Razón social" : "Nombres y apellidos (titular)"}
                    </label>
                    <input
                      className="input"
                      value={razonComprobante}
                      onChange={(e) => setRazonComprobante(e.target.value.slice(0, 200))}
                      maxLength={200}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 16 }}>
              Método de pago
            </h2>
            <div className="pay-methods" role="tablist" aria-label="Método de pago">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={method === m.id}
                  className={`pay-method ${method === m.id ? "pay-method--active" : ""}`}
                  onClick={() => {
                    setMethod(m.id);
                    setError("");
                  }}
                >
                  <strong>{m.title}</strong>
                  <span>{m.desc}</span>
                </button>
              ))}
            </div>

            {method === "card" ? (
              <div className="booking__grid booking__grid--2" style={{ marginTop: 18 }}>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Titular de la tarjeta</label>
                  <input className="input" value={cardName} onChange={(e) => setCardName(e.target.value)} autoComplete="cc-name" />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Número de tarjeta</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="Número de tarjeta"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, "").slice(0, 19))}
                    autoComplete="cc-number"
                  />
                </div>
                <div className="field">
                  <label className="label">Vencimiento</label>
                  <input className="input" placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} autoComplete="cc-exp" />
                </div>
                <div className="field">
                  <label className="label">CVV</label>
                  <input className="input" type="password" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))} autoComplete="cc-csc" />
                </div>
                <p className="notice notice--spaced" style={{ gridColumn: "1 / -1" }}>
                  El cargo se registra en este entorno de piloto según la configuración del local. En producción, los
                  datos de tarjeta se tokenizan en la pasarela certificada (PCI DSS); no se almacenan en texto plano.
                </p>
              </div>
            ) : null}

            {method === "qr" ? (
              <p className="notice notice--spaced" style={{ marginTop: 16 }}>
                Tras confirmar verás el <strong>código de operación</strong> y el <strong>código QR</strong> para pagar
                con Yape o Plin.
              </p>
            ) : null}

            {method === "cash" ? (
              <p className="notice notice--spaced" style={{ marginTop: 16 }}>
                El pedido queda <strong>pendiente de cobro en caja o al rider</strong>. El administrador marca “cobrado”
                en el panel de pedidos.
              </p>
            ) : null}

            {error ? <div className="error" style={{ marginTop: 14 }}>{error}</div> : null}

            <div className="checkout-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? "Procesando…" : "Confirmar pago"}
              </button>
              <button type="button" className="btn btn--surface" onClick={() => navigate("/carrito")}>
                Volver al carrito
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
