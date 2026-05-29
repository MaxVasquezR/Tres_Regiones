import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiGet, apiPost } from "../../api";

const STEPS = ["Resumen", "Comprobante", "Pago"];
const METODOS = [
  { id: "qr", label: "Yape / Plin QR", icon: "📱" },
  { id: "cash", label: "Efectivo", icon: "💵" },
  { id: "card", label: "Tarjeta", icon: "💳" },
];

export default function CerrarCuentaScreen() {
  const { codigo } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Comprobante
  const [solicitaComp, setSolicitaComp] = useState(false);
  const [tipoComp, setTipoComp] = useState("boleta");
  const [docComp, setDocComp] = useState("");
  const [razonComp, setRazonComp] = useState("");

  // Pago
  const [metodo, setMetodo] = useState("qr");
  const [cardLast4, setCardLast4] = useState("");
  const [paying, setPaying] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    async function loadPedido() {
      try {
        const res = await apiGet(`/api/mesas/${codigo}/pedido-activo`, { auth: true });
        if (!res.data) {
          setError("No hay pedido abierto en esta mesa.");
        } else {
          setPedido(res.data);
        }
      } catch (err) {
        setError(err?.message || "No se pudo cargar la cuenta.");
      } finally {
        setLoading(false);
      }
    }
    loadPedido();
  }, [codigo]);

  const total = pedido ? (pedido.items || []).reduce((s, i) => s + i.precioSoles * i.qty, 0) : 0;

  const validarComprobante = () => {
    if (!solicitaComp) return true;
    const doc = docComp.replace(/\D/g, "");
    const rz = razonComp.trim();
    if (tipoComp === "factura") {
      if (doc.length !== 11 || rz.length < 4) {
        setError("Factura: RUC de 11 dígitos y razón social (mín. 4 caracteres) son obligatorios.");
        return false;
      }
    } else {
      if (doc.length !== 8 || rz.length < 4) {
        setError("Boleta: DNI de 8 dígitos y nombre completo son obligatorios.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1 && !validarComprobante()) return;
    setStep((s) => s + 1);
  };

  const handlePagar = async () => {
    setError("");
    if (metodo === "card" && cardLast4.replace(/\D/g, "").length < 4) {
      setError("Ingresa los últimos 4 dígitos de la tarjeta.");
      return;
    }
    setPaying(true);
    try {
      const comprobantePayload = solicitaComp
        ? {
            solicita: true,
            tipo: tipoComp,
            numeroDocumento: docComp.replace(/\D/g, ""),
            razonSocial: razonComp.trim(),
          }
        : null;
      const res = await apiPost(
        "/api/pedidos-mesa",
        {
          mesaCodigo: codigo,
          paymentMethod: metodo,
          cardLast4: metodo === "card" ? cardLast4.replace(/\D/g, "").slice(-4) : undefined,
          comprobante: comprobantePayload,
        },
        { auth: true },
      );
      setResultado(res.data);
    } catch (err) {
      setError(err?.message || "No se pudo registrar el pago.");
    } finally {
      setPaying(false);
    }
  };

  const handleWhatsApp = () => {
    if (!resultado) return;
    const msg = encodeURIComponent(
      `*TRES REGIONES* — Gracias por su visita 🙏\n` +
      `Mesa ${codigo} · Código ${resultado.codigoPago}\n` +
      `Total pagado: S/ ${total.toFixed(2)}\n` +
      `Método: ${metodo === "qr" ? "Yape/Plin" : metodo === "cash" ? "Efectivo" : "Tarjeta"}\n` +
      `¡Esperamos verle pronto!`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (loading) return <div className="mozo-loading">Cargando cuenta…</div>;

  if (resultado) {
    return (
      <div className="cuenta-result">
        <div className="cuenta-result__icon">✓</div>
        <h2 className="cuenta-result__title">¡Cuenta cerrada!</h2>
        <p className="cuenta-result__code">Código: <strong>{resultado.codigoPago}</strong></p>
        <p className="cuenta-result__total">Total cobrado: <strong>S/ {total.toFixed(2)}</strong></p>
        {metodo === "qr" && resultado.qrPayload && (
          <div className="cuenta-result__qr">
            <p className="label" style={{ marginBottom: 8, textAlign: "center" }}>QR Yape / Plin</p>
            <QRCodeSVG value={resultado.qrPayload} size={200} level="M" includeMargin />
          </div>
        )}
        <div className="cuenta-result__actions">
          <button type="button" className="btn btn--surface" onClick={handleWhatsApp}>
            Enviar por WhatsApp
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate("/mozo/mesas")}
          >
            Volver a mesas
          </button>
        </div>
      </div>
    );
  }

  if (error && !pedido) {
    return (
      <div className="mozo-loading">
        <p className="error">{error}</p>
        <button type="button" className="btn btn--surface btn--sm" onClick={() => navigate(`/mozo/mesa/${codigo}/comanda`)}>
          Volver a comanda
        </button>
      </div>
    );
  }

  return (
    <div className="cerrar-cuenta-page">
      <div className="cerrar-cuenta-header">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/mozo/mesa/${codigo}/comanda`)}>
          ← Comanda
        </button>
        <h1 className="cerrar-cuenta-header__title">Cerrar cuenta · Mesa {codigo}</h1>
      </div>

      {/* Step indicator */}
      <div className="step-indicator" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-indicator__item${step === i ? " step-indicator__item--active" : step > i ? " step-indicator__item--done" : ""}`}>
            <span className="step-indicator__num">{step > i ? "✓" : i + 1}</span>
            <span className="step-indicator__label">{s}</span>
          </div>
        ))}
      </div>

      {error && <div className="error" style={{ margin: "0 0 12px" }}>{error}</div>}

      {/* Paso 0: Resumen */}
      {step === 0 && pedido && (
        <div className="cuenta-step">
          <h3 className="cuenta-step__title">Resumen de la mesa</h3>
          <div className="cuenta-items-list">
            {pedido.items.map((item, i) => (
              <div key={i} className="cuenta-item-row">
                <span className="cuenta-item-row__qty">{item.qty}x</span>
                <span className="cuenta-item-row__nombre">{item.nombre}</span>
                {item.notas && <span className="cuenta-item-row__notas">({item.notas})</span>}
                <span className="cuenta-item-row__precio">S/ {(item.precioSoles * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="cuenta-total-row">
            <strong>TOTAL</strong>
            <strong>S/ {total.toFixed(2)}</strong>
          </div>
          <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 20 }} onClick={handleNextStep}>
            Continuar
          </button>
        </div>
      )}

      {/* Paso 1: Comprobante */}
      {step === 1 && (
        <div className="cuenta-step">
          <h3 className="cuenta-step__title">Comprobante (SUNAT)</h3>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={solicitaComp}
                onChange={(e) => setSolicitaComp(e.target.checked)}
              />
              <span>El cliente solicita comprobante</span>
            </label>
          </div>
          {solicitaComp && (
            <>
              <div className="field">
                <label className="label">Tipo de comprobante</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" value="boleta" checked={tipoComp === "boleta"} onChange={() => setTipoComp("boleta")} />
                    Boleta (DNI)
                  </label>
                  <label className="radio-label">
                    <input type="radio" value="factura" checked={tipoComp === "factura"} onChange={() => setTipoComp("factura")} />
                    Factura (RUC)
                  </label>
                </div>
              </div>
              <div className="field">
                <label className="label">
                  {tipoComp === "factura" ? "RUC (11 dígitos)" : "DNI (8 dígitos)"}
                  <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={tipoComp === "factura" ? "20123456789" : "12345678"}
                  value={docComp}
                  onChange={(e) => setDocComp(e.target.value.replace(/\D/g, "").slice(0, tipoComp === "factura" ? 11 : 8))}
                  inputMode="numeric"
                />
              </div>
              <div className="field">
                <label className="label">
                  {tipoComp === "factura" ? "Razón social" : "Nombre completo del titular"}
                  <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={tipoComp === "factura" ? "Empresa SAC" : "Juan Pérez García"}
                  value={razonComp}
                  onChange={(e) => setRazonComp(e.target.value)}
                  maxLength={200}
                />
              </div>
            </>
          )}
          <div className="cuenta-step__actions">
            <button type="button" className="btn btn--outline-dark" onClick={() => { setStep(0); setError(""); }}>Atrás</button>
            <button type="button" className="btn btn--primary" onClick={handleNextStep}>Continuar</button>
          </div>
        </div>
      )}

      {/* Paso 2: Pago */}
      {step === 2 && (
        <div className="cuenta-step">
          <h3 className="cuenta-step__title">Método de pago · S/ {total.toFixed(2)}</h3>
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
            </div>
          )}

          {metodo === "qr" && (
            <div className="pago-qr-preview">
              <QRCodeSVG
                value={`PE|TRES_REGIONES|PREVIEW|${total.toFixed(2)}|PEN|YAPE_PLIN`}
                size={180}
                level="M"
                includeMargin
              />
              <p className="hint" style={{ textAlign: "center", marginTop: 8 }}>
                QR Yape / Plin — S/ {total.toFixed(2)}
              </p>
            </div>
          )}

          {metodo === "cash" && (
            <div className="pago-cash-msg">
              <p>El cliente paga en efectivo. Registra el cobro y da el vuelto.</p>
            </div>
          )}

          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

          <div className="cuenta-step__actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn--outline-dark" onClick={() => { setStep(1); setError(""); }}>Atrás</button>
            <button type="button" className="btn btn--primary" onClick={handlePagar} disabled={paying}>
              {paying ? "Procesando…" : "Confirmar pago"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
