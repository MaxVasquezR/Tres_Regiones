import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet, apiPatch } from "../../api";
import { useReservations } from "../../context/ReservationsContext";
import { labelPedidoEstado, PEDIDO_ESTADOS, pedidoBadgeClass } from "../../data/adminPedidoEstados";

function estadoReservaClass(estado) {
  if (estado === "Confirmada") return "badge badge--ok";
  if (estado === "Cancelada" || estado === "No show") return "badge badge--danger";
  return "badge badge--warn";
}

export default function CentroOperaciones() {
  const { reservas, ready, refresh, updateReservationStatus, deleteReservation } = useReservations();
  const [pedidos, setPedidos] = useState([]);
  const [loadingPed, setLoadingPed] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyPedido, setBusyPedido] = useState(null);
  const [busyReserva, setBusyReserva] = useState(null);

  const cargarPedidos = useCallback(async () => {
    setLoadingPed(true);
    try {
      const json = await apiGet("/api/pedidos", { auth: true });
      setPedidos(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setMsg(e?.message || "No se pudieron cargar pedidos.");
      setPedidos([]);
    } finally {
      setLoadingPed(false);
    }
  }, []);

  useEffect(() => {
    void cargarPedidos();
  }, [cargarPedidos]);

  const pedidosOrden = useMemo(() => {
    return [...pedidos].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 25);
  }, [pedidos]);

  const reservasActivas = useMemo(() => {
    return [...reservas]
      .filter((r) => !["Cancelada"].includes(r.estado))
      .sort((a, b) => {
        const fa = `${a.fecha}T${a.hora}:00`;
        const fb = `${b.fecha}T${b.hora}:00`;
        return fa.localeCompare(fb);
      })
      .slice(0, 20);
  }, [reservas]);

  const setEstadoPedido = async (id, estado) => {
    setMsg("");
    setBusyPedido(id);
    try {
      await apiPatch(`/api/pedidos/${id}`, { estado }, { auth: true });
      await cargarPedidos();
    } catch (e) {
      setMsg(e?.message || "No se pudo actualizar el pedido.");
    } finally {
      setBusyPedido(null);
    }
  };

  const eliminarPedido = async (id) => {
    if (!window.confirm("¿Eliminar este pedido del sistema? No se puede deshacer.")) return;
    setMsg("");
    setBusyPedido(id);
    try {
      await apiDelete(`/api/pedidos/${id}`, { auth: true });
      await cargarPedidos();
    } catch (e) {
      setMsg(e?.message || "No se pudo eliminar.");
    } finally {
      setBusyPedido(null);
    }
  };

  const setEstadoReserva = async (id, estado) => {
    setMsg("");
    setBusyReserva(id);
    try {
      await updateReservationStatus(id, estado);
      await refresh();
    } catch (e) {
      setMsg(e?.message || "No se pudo actualizar la reserva.");
    } finally {
      setBusyReserva(null);
    }
  };

  const borrarReserva = async (id) => {
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    setMsg("");
    setBusyReserva(id);
    try {
      await deleteReservation(id);
      await refresh();
    } catch (e) {
      setMsg(e?.message || "No se pudo eliminar.");
    } finally {
      setBusyReserva(null);
    }
  };

  return (
    <div className="admin-centro-ops">
      <header className="admin-centro-ops__head">
        <div>
          <p className="eyebrow">Operación en vivo</p>
          <h1 style={{ margin: "0 0 8px", color: "var(--brand-700)" }}>Centro de operación</h1>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 720 }}>
            Pedidos web (delivery y recojo) y reservas de sala en una sola vista. Un clic por acción; el detalle sigue
            en <Link to="/admin/pedidos">Pedidos web</Link> y <Link to="/admin/reservas">Reservas</Link>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn--surface" onClick={() => void cargarPedidos()} disabled={loadingPed}>
            Actualizar pedidos
          </button>
          <button type="button" className="btn btn--surface" onClick={() => void refresh()} disabled={!ready}>
            Actualizar reservas
          </button>
        </div>
      </header>

      {msg ? (
        <div className="error" style={{ marginBottom: 14 }}>
          {msg}
        </div>
      ) : null}

      <div className="admin-centro-ops__grid">
        <section className="card card--pad admin-centro-ops__panel">
          <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 12 }}>
            Pedidos
          </h2>
          {loadingPed ? <p className="loading-inline">Cargando…</p> : null}
          {!loadingPed && !pedidosOrden.length ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>Sin pedidos.</p>
          ) : null}
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="admin-centro-ops__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones rápidas</th>
                </tr>
              </thead>
              <tbody>
                {pedidosOrden.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <strong>{p.clienteNombre}</strong>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.contactoTelefono}</div>
                    </td>
                    <td>{p.delivery ? "Delivery" : "Recojo"}</td>
                    <td>S/ {Number(p.totalSoles).toFixed(2)}</td>
                    <td>
                      <span className={pedidoBadgeClass(p.estado)} style={{ fontSize: 11 }}>
                        {labelPedidoEstado(p.estado)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-centro-ops__actions">
                        <select
                          className="input admin-centro-ops__select"
                          value={p.estado}
                          disabled={busyPedido === p.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v !== p.estado) void setEstadoPedido(p.id, v);
                          }}
                        >
                          {!PEDIDO_ESTADOS.some((x) => x.value === p.estado) ? (
                            <option value={p.estado}>{p.estado}</option>
                          ) : null}
                          {PEDIDO_ESTADOS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <div className="admin-centro-ops__quick">
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            disabled={busyPedido === p.id}
                            onClick={() => void setEstadoPedido(p.id, "Confirmado_cocina")}
                          >
                            Cocina
                          </button>
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            disabled={busyPedido === p.id}
                            onClick={() => void setEstadoPedido(p.id, p.delivery ? "En_reparto" : "Listo_recojo")}
                          >
                            {p.delivery ? "Ruta" : "Listo"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            disabled={busyPedido === p.id}
                            onClick={() => void setEstadoPedido(p.id, "Entregado")}
                          >
                            Entregado
                          </button>
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            disabled={busyPedido === p.id}
                            onClick={() => void setEstadoPedido(p.id, "Cerrado")}
                          >
                            Cerrar
                          </button>
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            style={{ color: "#b71c1c" }}
                            disabled={busyPedido === p.id}
                            onClick={() => void setEstadoPedido(p.id, "Anulado")}
                          >
                            Anular
                          </button>
                          <button
                            type="button"
                            className="btn btn--surface btn--sm"
                            disabled={busyPedido === p.id}
                            onClick={() => void eliminarPedido(p.id)}
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card--pad admin-centro-ops__panel">
          <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 12 }}>
            Reservas (activas)
          </h2>
          {!ready ? <p className="loading-inline">Cargando…</p> : null}
          {ready && !reservasActivas.length ? <p style={{ color: "var(--muted)", margin: 0 }}>Sin reservas activas.</p> : null}
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="admin-centro-ops__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Mesa</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasActivas.map((r) => (
                  <tr key={r.id}>
                    <td>{String(r.id).slice(-4)}</td>
                    <td>
                      <strong>{r.cliente}</strong>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.telefono}</div>
                    </td>
                    <td>
                      {r.fecha} {r.hora}
                    </td>
                    <td>
                      {r.mesa} · {r.zona}
                    </td>
                    <td>
                      <span className={estadoReservaClass(r.estado)} style={{ fontSize: 11 }}>
                        {r.estado}
                      </span>
                    </td>
                    <td>
                      <div className="admin-centro-ops__quick">
                        <button
                          type="button"
                          className="btn btn--surface btn--sm"
                          disabled={busyReserva === r.id}
                          onClick={() => void setEstadoReserva(r.id, "Confirmada")}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="btn btn--surface btn--sm"
                          disabled={busyReserva === r.id}
                          onClick={() => void setEstadoReserva(r.id, "Atendida")}
                        >
                          Atendida
                        </button>
                        <button
                          type="button"
                          className="btn btn--surface btn--sm"
                          disabled={busyReserva === r.id}
                          onClick={() => void setEstadoReserva(r.id, "No show")}
                        >
                          No show
                        </button>
                        <button
                          type="button"
                          className="btn btn--surface btn--sm"
                          disabled={busyReserva === r.id}
                          onClick={() => void setEstadoReserva(r.id, "Cancelada")}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn--surface btn--sm"
                          style={{ color: "#b71c1c" }}
                          disabled={busyReserva === r.id}
                          onClick={() => void borrarReserva(r.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
