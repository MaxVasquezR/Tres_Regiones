import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet, apiPatch } from "../../api";
import { PEDIDO_ESTADOS, labelPedidoEstado, pedidoBadgeClass } from "../../data/adminPedidoEstados";

function DireccionPedido({ d }) {
  if (!d) return "—";
  return (
    <>
      <span>
        {d.calle || "—"} · {d.distrito || "—"}
      </span>
      {Number.isFinite(d.lat) && Number.isFinite(d.lng) ? (
        <>
          {" "}
          <a
            href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=17/${d.lat}/${d.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mapa
          </a>
        </>
      ) : null}
      {d.fuente ? (
        <span style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 12 }}>Origen: {d.fuente}</span>
      ) : null}
      {d.etiqueta ? (
        <span style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 12 }} title={d.etiqueta}>
          Geo: {d.etiqueta.length > 120 ? `${d.etiqueta.slice(0, 120)}…` : d.etiqueta}
        </span>
      ) : null}
    </>
  );
}

function PedidoAcciones({ p, busy, onEstado, onEliminar }) {
  return (
    <div className="admin-pedido-actions">
      <select
        className="input admin-pedido-actions__select"
        value={p.estado}
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== p.estado) void onEstado(p.id, v);
        }}
      >
        {!PEDIDO_ESTADOS.some((x) => x.value === p.estado) ? <option value={p.estado}>{p.estado}</option> : null}
        {PEDIDO_ESTADOS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="admin-pedido-actions__row">
        <button type="button" className="btn btn--surface btn--sm" disabled={busy} onClick={() => void onEstado(p.id, "Confirmado_cocina")}>
          Cocina
        </button>
        <button
          type="button"
          className="btn btn--surface btn--sm"
          disabled={busy}
          onClick={() => void onEstado(p.id, p.delivery ? "En_reparto" : "Listo_recojo")}
        >
          {p.delivery ? "Ruta" : "Listo"}
        </button>
        <button type="button" className="btn btn--surface btn--sm" disabled={busy} onClick={() => void onEstado(p.id, "Entregado")}>
          Entregado
        </button>
        <button type="button" className="btn btn--surface btn--sm" disabled={busy} onClick={() => void onEstado(p.id, "Cerrado")}>
          Cerrar
        </button>
        <button type="button" className="btn btn--surface btn--sm" disabled={busy} onClick={() => void onEstado(p.id, "Anulado")}>
          Anular
        </button>
        <button type="button" className="btn btn--surface btn--sm" disabled={busy} onClick={() => void onEliminar(p.id)}>
          Borrar
        </button>
      </div>
    </div>
  );
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const json = await apiGet("/api/pedidos", { auth: true });
      if (Array.isArray(json.data)) setPedidos(json.data);
    } catch (err) {
      setMsg(err?.message || "No se pudieron cargar los pedidos.");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const setEstado = async (id, estado) => {
    setMsg("");
    setBusyId(id);
    try {
      await apiPatch(`/api/pedidos/${id}`, { estado }, { auth: true });
      await cargar();
    } catch (e) {
      setMsg(e?.message || "No se pudo actualizar el pedido.");
    } finally {
      setBusyId(null);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este pedido? No se puede deshacer.")) return;
    setMsg("");
    setBusyId(id);
    try {
      await apiDelete(`/api/pedidos/${id}`, { auth: true });
      await cargar();
    } catch (e) {
      setMsg(e?.message || "No se pudo eliminar.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <header style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", color: "var(--brand-700)" }}>Pedidos web</h1>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 640 }}>
            Delivery y recojo: cambia estado, cierra cobranza o anula desde aquí. Vista compacta en{" "}
            <Link to="/admin/operaciones">Centro de operación</Link>.
          </p>
        </div>
        <Link to="/admin/operaciones" className="btn btn--primary">
          Ir al centro de operación
        </Link>
      </header>
      {msg ? (
        <div className="card card--pad" style={{ marginBottom: 14, fontSize: 14 }}>
          {msg}
        </div>
      ) : null}
      {loading ? <p className="loading-inline">Cargando…</p> : null}
      <div className="card card--pad">
        {!pedidos.length ? (
          <p className="pedidos-empty" style={{ color: "var(--muted)", margin: 0 }}>
            Sin pedidos aún.
          </p>
        ) : (
          <>
            <div className="pedidos-table-wrap table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th>Delivery</th>
                    <th>Dirección</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Estado</th>
                    <th>Comprobante</th>
                    <th>Código</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        <strong>{p.clienteNombre}</strong>
                        <br />
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>
                          {p.contactoNombre ? (
                            <>
                              Pedido: {p.contactoNombre} · {p.contactoTelefono}
                              <br />
                            </>
                          ) : null}
                          {p.clienteCorreo ? <>Correo cuenta: {p.clienteCorreo}</> : null}
                          {p.clienteTelefonoCuenta ? (
                            <>
                              {p.clienteCorreo ? " · " : null}
                              Cel. cuenta: {p.clienteTelefonoCuenta}
                            </>
                          ) : null}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {Array.isArray(p.items) ? p.items.map((i) => `${i.qty}× ${i.nombre}`).join(" · ") : "—"}
                      </td>
                      <td>{p.delivery ? "Sí" : "No"}</td>
                      <td style={{ fontSize: 12, maxWidth: 220 }}>
                        {p.delivery && p.direccion ? <DireccionPedido d={p.direccion} /> : "—"}
                      </td>
                      <td>S/ {Number(p.totalSoles).toFixed(2)}</td>
                      <td style={{ textTransform: "uppercase", fontSize: 12 }}>{p.paymentMethod}</td>
                      <td>
                        <span className={pedidoBadgeClass(p.estado)} style={{ fontSize: 12 }} title={p.estado}>
                          {labelPedidoEstado(p.estado)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {p.comprobante?.tipo ? (
                          <>
                            {p.comprobante.tipo === "factura" ? "Factura" : "Boleta"} · {p.comprobante.numeroDocumento}
                            <br />
                            <span style={{ color: "var(--muted)" }}>{p.comprobante.razonSocial}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.codigoPago}</td>
                      <td style={{ minWidth: 200 }}>
                        <PedidoAcciones p={p} busy={busyId === p.id} onEstado={setEstado} onEliminar={eliminar} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pedidos-cards" aria-label="Pedidos en vista móvil">
              {pedidos.map((p) => (
                <article key={`m-${p.id}`} className="pedido-card card">
                  <header className="pedido-card__head">
                    <span className="pedido-card__id">#{p.id}</span>
                    <span className={pedidoBadgeClass(p.estado)} style={{ fontSize: 12 }}>
                      {labelPedidoEstado(p.estado)}
                    </span>
                  </header>
                  <h2 className="pedido-card__cliente">{p.clienteNombre}</h2>
                  {p.contactoNombre ? (
                    <p className="pedido-card__line">
                      Contacto pedido: {p.contactoNombre} · {p.contactoTelefono}
                    </p>
                  ) : null}
                  <p className="pedido-card__line pedido-card__items">
                    {Array.isArray(p.items) ? p.items.map((i) => `${i.qty}× ${i.nombre}`).join(" · ") : "—"}
                  </p>
                  <dl className="pedido-card__dl">
                    <div>
                      <dt>Total</dt>
                      <dd>S/ {Number(p.totalSoles).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Pago</dt>
                      <dd>{String(p.paymentMethod || "").toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt>Delivery</dt>
                      <dd>{p.delivery ? "Sí" : "No"}</dd>
                    </div>
                  </dl>
                  {p.delivery && p.direccion ? (
                    <div className="pedido-card__dir">
                      <strong>Entrega</strong>
                      <div className="pedido-card__line pedido-card__line--addr">
                        <DireccionPedido d={p.direccion} />
                      </div>
                    </div>
                  ) : null}
                  {p.comprobante?.tipo ? (
                    <p className="pedido-card__line">
                      <strong>{p.comprobante.tipo === "factura" ? "Factura" : "Boleta"}</strong> ·{" "}
                      {p.comprobante.numeroDocumento} — {p.comprobante.razonSocial}
                    </p>
                  ) : null}
                  <p className="pedido-card__code">{p.codigoPago}</p>
                  <div style={{ marginTop: 12 }}>
                    <PedidoAcciones p={p} busy={busyId === p.id} onEstado={setEstado} onEliminar={eliminar} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
