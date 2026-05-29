import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../api";

const ESTADO_META = {
  Recibido: { label: "Recibido", clase: "badge badge--info" },
  En_cocina: { label: "En cocina", clase: "badge badge--warn" },
  Listo: { label: "Listo", clase: "badge badge--warn" },
  En_camino: { label: "En camino", clase: "badge badge--warn" },
  Entregado: { label: "Entregado", clase: "badge badge--ok" },
  Anulado: { label: "Anulado", clase: "badge badge--danger" },
};

function fechaCorta(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGet("/api/mis-pedidos", { auth: true })
      .then((r) => {
        if (alive) setPedidos(Array.isArray(r.data) ? r.data : []);
      })
      .catch((e) => {
        if (alive) {
          setError(e?.message || "No pudimos cargar tus pedidos.");
          setPedidos([]);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container container--narrow cart-page">
      <header className="cart-page__head">
        <h1 className="section-title">Mis pedidos</h1>
        <Link to="/" className="btn btn--ghost btn--sm">Pedir de nuevo</Link>
      </header>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {pedidos === null ? (
        <p className="muted">Cargando tu historial…</p>
      ) : pedidos.length === 0 ? (
        <div className="cart-empty card card--pad">
          <div className="cart-empty__icon" aria-hidden>🐆</div>
          <h2 className="section-title">Aún no tienes pedidos</h2>
          <p className="section-lead">Cuando pidas delivery Guepardo, aquí verás el estado y el historial.</p>
          <Link to="/" className="btn btn--primary">Ver la carta</Link>
        </div>
      ) : (
        <div className="orders-list">
          {pedidos.map((p) => {
            const meta = ESTADO_META[p.estado] || { label: p.estado, clase: "badge" };
            const activo = !["Entregado", "Anulado"].includes(p.estado);
            const resumen = (p.items || [])
              .map((i) => `${i.qty}x ${i.nombre}`)
              .join(" · ");
            return (
              <article key={p.id} className="order-card card">
                <div className="order-card__head">
                  <div>
                    <strong className="order-card__code">{p.codigoPago}</strong>
                    <span className="order-card__date">{fechaCorta(p.creadoEn)}</span>
                  </div>
                  <span className={meta.clase}>{meta.label}</span>
                </div>
                <p className="order-card__items">{resumen}</p>
                <div className="order-card__foot">
                  <span className="order-card__meta">
                    {p.sedeNombre} · {p.direccion?.distrito}
                  </span>
                  <strong className="order-card__total">S/ {(Number(p.totalSoles) || 0).toFixed(2)}</strong>
                </div>
                <div className="order-card__actions">
                  <Link
                    to={`/pedido/${p.id}`}
                    className={`btn btn--sm ${activo ? "btn--primary" : "btn--outline-dark"}`}
                  >
                    {activo ? "Seguir pedido ⚡" : "Ver detalle"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
