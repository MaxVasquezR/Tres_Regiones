import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiGet } from "../../api";
import TrackingRouteMap from "../../components/TrackingRouteMap";

const PASOS = [
  { estado: "Recibido", label: "Recibido", icon: "📝" },
  { estado: "En_cocina", label: "En cocina", icon: "👨‍🍳" },
  { estado: "Listo", label: "Listo", icon: "📦" },
  { estado: "En_camino", label: "En camino", icon: "🐆" },
  { estado: "Entregado", label: "Entregado", icon: "✅" },
];

function indiceEstado(estado) {
  const i = PASOS.findIndex((p) => p.estado === estado);
  return i === -1 ? 0 : i;
}

const METODO_LABEL = { qr: "Yape / Plin", card: "Tarjeta", cash: "Efectivo al recibir" };

function minutosRestantes(pedido, now) {
  if (!pedido?.creadoEn) return null;
  const objetivo = new Date(pedido.creadoEn).getTime() + (Number(pedido.etaMax) || 40) * 60000;
  const diff = Math.round((objetivo - now) / 60000);
  return diff;
}

export default function SeguimientoPedido() {
  const { id } = useParams();
  const location = useLocation();
  const justCreated = Boolean(location.state?.justCreated);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await apiGet(`/api/pedidos-delivery/${id}`, { auth: true });
        if (!alive) return;
        setPedido(res.data);
        setError("");
      } catch (err) {
        if (alive) setError(err?.message || "No se pudo cargar el pedido.");
      }
    };
    void run();
    const poll = setInterval(run, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000 * 20);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [id]);

  if (error && !pedido) {
    return (
      <div className="container container--narrow cart-page">
        <div className="cart-empty card card--pad">
          <h1 className="section-title">No encontramos tu pedido</h1>
          <p className="section-lead">{error}</p>
          <Link to="/" className="btn btn--primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="container container--narrow" style={{ padding: 48 }}>
        <p className="muted">Cargando tu pedido…</p>
      </div>
    );
  }

  const anulado = pedido.estado === "Anulado";
  const entregado = pedido.estado === "Entregado";
  const idx = indiceEstado(pedido.estado);
  const progreso = Math.round((idx / (PASOS.length - 1)) * 100);
  const restan = minutosRestantes(pedido, now);
  const rider = pedido.repartidor;
  const mostrarRider = rider && ["Listo", "En_camino", "Entregado"].includes(pedido.estado);

  const contactarSede = () => {
    const msg = encodeURIComponent(
      `Hola, consulto por mi pedido ${pedido.codigoPago} de Tres Regiones (${pedido.sedeNombre}).`,
    );
    window.open(`https://wa.me/51${String(pedido.celularContacto || "").replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <div className="container container--narrow track-page">
      {justCreated && !anulado && (
        <div className="track-celebrate card card--pad" role="status">
          <p className="track-celebrate__icon" aria-hidden>🎉</p>
          <p className="track-celebrate__title">¡Pedido confirmado!</p>
          <p className="hint">Tu Guepardo ya salió de cocina. Sigue el recorrido en vivo.</p>
        </div>
      )}
      <div className={`track-hero card card--pad${entregado ? " track-hero--done" : ""}`}>
        <p className="eyebrow">Pedido {pedido.codigoPago}</p>
        <h1 className="section-title">
          {anulado ? "Pedido anulado" : entregado ? "¡Entregado! Buen provecho 🍽️" : "Tu Guepardo está en marcha 🐆"}
        </h1>
        {!anulado && !entregado && (
          <p className="track-hero__eta">
            {restan != null && restan > 0 ? (
              <>Llega en <strong>~{restan} min</strong></>
            ) : restan != null ? (
              <><strong>Llegando ahora</strong> · muy pronto en tu puerta</>
            ) : (
              <>Llegada estimada <strong>{pedido.etaTexto}</strong></>
            )}
          </p>
        )}
        {entregado && pedido.entregadoEn && (
          <p className="track-hero__eta">
            Entregado a las{" "}
            <strong>{new Date(pedido.entregadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</strong>
          </p>
        )}
        <p className="hint">{pedido.sedeNombre} · {pedido.direccion?.distrito}</p>
      </div>

      {!anulado && (
        <>
          <TrackingRouteMap
            progreso={progreso}
            distrito={pedido.direccion?.distrito}
            sedeNombre={pedido.sedeNombre}
          />
          <div className="track-progress" aria-hidden>
            <div className="track-progress__bar" style={{ width: `${progreso}%` }} />
            <span className="track-progress__rider" style={{ left: `calc(${progreso}% - 14px)` }}>🐆</span>
          </div>
          <ol className="track-steps">
            {PASOS.map((p, i) => (
              <li
                key={p.estado}
                className={`track-step${i < idx ? " track-step--done" : ""}${i === idx ? " track-step--active" : ""}`}
              >
                <span className="track-step__icon" aria-hidden>{p.icon}</span>
                <span className="track-step__label">{p.label}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {mostrarRider && (
        <div className="rider-card card card--pad">
          <div className="rider-card__avatar" aria-hidden>🛵</div>
          <div className="rider-card__info">
            <p className="rider-card__label">Tu repartidor Guepardo</p>
            <strong className="rider-card__name">{rider.nombre}</strong>
            <p className="rider-card__meta">{rider.vehiculo} · placa {rider.placa}</p>
          </div>
          <button type="button" className="btn btn--surface btn--sm" onClick={contactarSede}>
            Contactar
          </button>
        </div>
      )}

      <div className="card card--pad">
        <h3 className="cuenta-step__title">Detalle del pedido</h3>
        <div className="cuenta-items-list">
          {(pedido.items || []).map((it, i) => (
            <div key={i} className="cuenta-item-row">
              <span className="cuenta-item-row__qty">{it.qty}x</span>
              <span className="cuenta-item-row__nombre">{it.nombre}</span>
              <span className="cuenta-item-row__precio">S/ {(it.precioSoles * it.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="cart-summary__row"><span>Subtotal</span><strong>S/ {(pedido.subtotalSoles || 0).toFixed(2)}</strong></div>
        <div className="cart-summary__row"><span>Delivery</span><strong>S/ {(pedido.deliverySoles || 0).toFixed(2)}</strong></div>
        <div className="cart-summary__row cart-summary__row--total"><span>Total</span><strong>S/ {(pedido.totalSoles || 0).toFixed(2)}</strong></div>
        <p className="hint">
          Entrega en {pedido.direccion?.calle}, {pedido.direccion?.distrito}
          {pedido.direccion?.referencia ? ` · Ref: ${pedido.direccion.referencia}` : ""}
        </p>
        <p className="hint">Pago: {METODO_LABEL[pedido.paymentMethod] || pedido.paymentMethod} · {pedido.pagado ? "registrado" : "pendiente al recibir"}</p>

        {pedido.paymentMethod === "qr" && pedido.qrPayload && !pedido.pagado && (
          <div className="pago-qr-preview" style={{ marginTop: 12 }}>
            <QRCodeSVG value={pedido.qrPayload} size={160} level="M" includeMargin />
            <p className="hint" style={{ textAlign: "center", marginTop: 8 }}>QR Yape / Plin</p>
          </div>
        )}
      </div>

      <div className="track-actions">
        <Link to="/mis-pedidos" className="btn btn--outline-dark">Mis pedidos</Link>
        <Link to="/" className="btn btn--ghost">Volver al inicio</Link>
      </div>
    </div>
  );
}
