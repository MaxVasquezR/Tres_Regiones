import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPatch } from "../../api";
import { useReservations } from "../../context/ReservationsContext";
import { labelPedidoEstado, pedidoBadgeClass } from "../../data/adminPedidoEstados";
import { getAdminSede, subscribeAdminSede } from "../../data/adminSede";

function estadoReservaClass(estado) {
  if (estado === "Confirmada") return "badge badge--ok";
  if (estado === "Cancelada" || estado === "No show") return "badge badge--danger";
  return "badge badge--warn";
}

const FLUJO_DELIVERY = ["Recibido", "En_cocina", "Listo", "En_camino", "Entregado"];

function siguienteEstado(estado) {
  const i = FLUJO_DELIVERY.indexOf(estado);
  return i >= 0 && i < FLUJO_DELIVERY.length - 1 ? FLUJO_DELIVERY[i + 1] : null;
}

export default function CentroOperaciones() {
  const { reservas, ready, refresh, updateReservationStatus, deleteReservation } = useReservations();
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState("");
  const [busyReserva, setBusyReserva] = useState(null);
  const [busyDelivery, setBusyDelivery] = useState(null);
  const [sede, setSede] = useState(getAdminSede());

  useEffect(() => subscribeAdminSede(setSede), []);

  const cargar = useCallback(async () => {
    try {
      const q = sede ? `?sedeId=${sede}` : "";
      const [m, p] = await Promise.all([
        apiGet("/api/mesas-estado", { auth: true }).catch(() => ({ data: [] })),
        apiGet(`/api/pedidos${q}`, { auth: true }),
      ]);
      setMesas(m.data || []);
      setPedidos(p.data || []);
    } catch (e) {
      setMsg(e?.message || "Error al cargar operación.");
    }
  }, [sede]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 30000);
    return () => clearInterval(id);
  }, [cargar]);

  const deliveriesActivos = useMemo(
    () =>
      pedidos
        .filter((p) => p.tipo === "delivery" && !["Entregado", "Anulado"].includes(p.estado))
        .sort((a, b) => (a.creadoEn > b.creadoEn ? 1 : -1)),
    [pedidos],
  );

  const avanzarDelivery = async (p, estado) => {
    setBusyDelivery(p.id);
    setMsg("");
    try {
      await apiPatch(`/api/pedidos-delivery/${p.id}`, { estado }, { auth: true });
      await cargar();
    } catch (e) {
      setMsg(e?.message || "No se pudo actualizar el delivery.");
    } finally {
      setBusyDelivery(null);
    }
  };

  const reservasActivas = useMemo(() => {
    return [...reservas]
      .filter((r) => !["Cancelada"].includes(r.estado))
      .sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`))
      .slice(0, 20);
  }, [reservas]);

  const mesasActivas = mesas.filter((m) => ["Ocupada", "Cuenta_pedida"].includes(m.estado));

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
      <header className="admin-page-head">
        <div>
          <p className="eyebrow">Operación en vivo</p>
          <h1>Centro de operación</h1>
          <p className="admin-page-head__lead">
            Estado del salón y reservas en una sola vista. Ventas detalladas en{" "}
            <Link to="/admin/ventas">Ventas sala</Link>.
          </p>
        </div>
        <button type="button" className="btn btn--surface" onClick={() => void cargar()}>
          Actualizar
        </button>
      </header>

      {msg && <p className="error">{msg}</p>}

      <div className="admin-centro-ops__grid">
        <section className="card card--pad">
          <h2 className="section-title" style={{ fontSize: "1.1rem" }}>Salón ahora</h2>
          <div className="kpi-grid kpi-grid--compact" style={{ marginBottom: 16 }}>
            <article className="kpi-card kpi-card--ops">
              <p>Ocupadas</p>
              <strong>{mesasActivas.length}</strong>
            </article>
            <article className="kpi-card kpi-card--ops">
              <p>Libres</p>
              <strong>{mesas.filter((m) => m.estado === "Libre").length}</strong>
            </article>
            <article className="kpi-card kpi-card--ops">
              <p>Reservadas hoy</p>
              <strong>{mesas.filter((m) => m.estado === "Reservada").length}</strong>
            </article>
          </div>
          {mesasActivas.length === 0 ? (
            <p className="muted">No hay mesas ocupadas en este momento.</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Mesa</th>
                    <th>Estado</th>
                    <th>Mozo</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mesasActivas.map((m) => (
                    <tr key={m.codigo}>
                      <td><strong>{m.codigo}</strong></td>
                      <td><span className="badge badge--warn">{m.estado.replace("_", " ")}</span></td>
                      <td>{m.mozoNombre || "—"}</td>
                      <td>{m.totalAbierto ? `S/ ${m.totalAbierto.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/mozo/mesas" className="btn btn--outline-dark" style={{ marginTop: 12 }}>
            Abrir pantalla mozo
          </Link>
        </section>

        <section className="card card--pad">
          <h2 className="section-title" style={{ fontSize: "1.1rem" }}>Reservas próximas</h2>
          {!ready ? (
            <p className="muted">Cargando reservas…</p>
          ) : reservasActivas.length === 0 ? (
            <p className="muted">Sin reservas activas.</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Mesa</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reservasActivas.map((r) => (
                    <tr key={r.id}>
                      <td>{r.fecha}</td>
                      <td>{r.hora}</td>
                      <td>{r.cliente}</td>
                      <td>{r.mesa}</td>
                      <td><span className={estadoReservaClass(r.estado)}>{r.estado}</span></td>
                      <td className="ops-table__actions">
                        {r.estado === "Pendiente" && (
                          <button type="button" className="btn btn--ghost btn--sm" disabled={busyReserva === r.id} onClick={() => void setEstadoReserva(r.id, "Confirmada")}>
                            Confirmar
                          </button>
                        )}
                        <button type="button" className="btn btn--ghost btn--sm" disabled={busyReserva === r.id} onClick={() => void borrarReserva(r.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card card--pad" style={{ marginTop: 20 }}>
        <h2 className="section-title" style={{ fontSize: "1.1rem" }}>
          🐆 Delivery en curso {sede ? "" : "· todas las sedes"}
        </h2>
        {deliveriesActivos.length === 0 ? (
          <p className="muted">No hay pedidos de delivery activos.</p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Distrito</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>ETA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deliveriesActivos.map((p) => {
                  const next = siguienteEstado(p.estado);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.codigoPago}</strong></td>
                      <td>{p.clienteNombre}<br /><span className="ops-table__muted">{p.celularContacto}</span></td>
                      <td>{p.direccion?.distrito}</td>
                      <td>S/ {(Number(p.totalSoles) || 0).toFixed(2)}</td>
                      <td><span className="badge badge--info">{String(p.estado).replace(/_/g, " ")}</span></td>
                      <td className="ops-table__muted">{p.etaTexto}</td>
                      <td className="ops-table__actions">
                        {next && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={busyDelivery === p.id}
                            onClick={() => void avanzarDelivery(p, next)}
                          >
                            → {next.replace(/_/g, " ")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={busyDelivery === p.id}
                          onClick={() => void avanzarDelivery(p, "Anulado")}
                        >
                          Anular
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pedidos.filter((p) => p.tipo === "mesa" && p.estado === "Pagado").slice(0, 5).length > 0 && (
        <section className="card card--pad" style={{ marginTop: 20 }}>
          <h2 className="section-title" style={{ fontSize: "1.1rem" }}>Últimas cuentas cobradas</h2>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos
                  .filter((p) => p.estado === "Pagado")
                  .slice(0, 8)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.mesaCodigo}</td>
                      <td>S/ {(p.totalSoles || 0).toFixed(2)}</td>
                      <td><span className={pedidoBadgeClass(p.estado)}>{labelPedidoEstado(p.estado)}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
