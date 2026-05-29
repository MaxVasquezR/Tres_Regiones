import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MetricBarChart from "../../components/charts/MetricBarChart";
import StatusDonutChart from "../../components/charts/StatusDonutChart";
import { useReservations } from "../../context/ReservationsContext";
import { apiGet } from "../../api";

import { labelPedidoEstado, pedidoBadgeClass, METODO_PAGO_LABEL } from "../../data/adminPedidoEstados";

const kpisReservas = [
  { key: "reservasHoy", title: "Reservas hoy", detail: "Turnos activos en sala" },
  { key: "ocupacionHoy", title: "Ocupación hoy", detail: "Mesas comprometidas", suffix: "%" },
  { key: "depositosCobrados", title: "Depósitos", detail: "Separaciones cobradas", format: "soles" },
  { key: "noShows", title: "No show", detail: "Ausencias sin reembolso" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { dashboardStats, ready } = useReservations();
  const [pedidos, setPedidos] = useState([]);
  const [pedidosReady, setPedidosReady] = useState(false);
  const [mesas, setMesas] = useState([]);
  const fecha = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/pedidos", { auth: true })
      .then((json) => {
        if (!cancelled && Array.isArray(json.data)) {
          setPedidos(json.data);
          setPedidosReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPedidosReady(true);
      });
    apiGet("/api/mesas-estado", { auth: true })
      .then((json) => { if (!cancelled && Array.isArray(json.data)) setMesas(json.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const hoy = todayStr();
  const mesasOcupadas = mesas.filter((m) => m.estado === "Ocupada" || m.estado === "Cuenta_pedida").length;
  const pedidosMesaHoy = pedidosReady
    ? pedidos.filter((p) => p.tipo === "mesa" && p.creadoEn?.slice(0, 10) === hoy)
    : [];
  const revenuesMesaHoy = pedidosMesaHoy
    .filter((p) => p.estado === "Pagado")
    .reduce((s, p) => s + (Number(p.totalSoles) || 0), 0);

  const deliveriesHoy = pedidosReady
    ? pedidos.filter((p) => p.tipo === "delivery" && p.creadoEn?.slice(0, 10) === hoy)
    : [];
  const revenueDeliveryHoy = deliveriesHoy
    .filter((p) => p.pagado)
    .reduce((s, p) => s + (Number(p.totalSoles) || 0), 0);
  const deliveriesActivos = deliveriesHoy.filter((p) => !["Entregado", "Anulado"].includes(p.estado)).length;

  const pedidosRecientes = [...pedidos]
    .filter((p) => p.tipo === "mesa")
    .sort((a, b) => (b.creadoEn > a.creadoEn ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__head">
        <div>
          <p className="eyebrow">Métricas en vivo</p>
          <h1>Operación del restaurante</h1>
          <p>
            Reservas, ocupación de mesas e ingresos de sala en tiempo real.
          </p>
        </div>
        <div className="admin-dashboard__badge">
          <span>●</span> {fecha}
        </div>
      </header>

      <section className="card card--pad admin-dashboard__cta-ops" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title" style={{ fontSize: "1.15rem", marginBottom: 6 }}>
              Control en pocos clics
            </h2>
            <p className="section-lead" style={{ margin: 0 }}>
              Confirma reservas y supervisa el salón desde una sola pantalla.
            </p>
          </div>
          <Link to="/admin/operaciones" className="btn btn--primary">
            Abrir centro de operación
          </Link>
        </div>
      </section>

      {/* KPIs de reservas */}
      <p className="eyebrow" style={{ marginBottom: 10 }}>Reservas</p>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {kpisReservas.map((item) => {
          const raw = ready ? dashboardStats[item.key] : null;
          const display =
            item.format === "soles" && raw != null
              ? `S/ ${Number(raw).toFixed(0)}`
              : ready
                ? `${raw ?? 0}${item.suffix ?? ""}`
                : "…";
          return (
            <article key={item.key} className="kpi-card lift">
              <p>{item.title}</p>
              <strong>{display}</strong>
              <span>{item.detail}</span>
            </article>
          );
        })}
      </div>

      {/* KPIs POS */}
      <p className="eyebrow" style={{ marginBottom: 10 }}>Sala · POS</p>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <article className="kpi-card lift">
          <p>Mesas ocupadas</p>
          <strong>{mesas.length ? mesasOcupadas : "…"}</strong>
          <span>En curso o con cuenta pedida</span>
        </article>
        <article className="kpi-card lift">
          <p>Mesas libres</p>
          <strong>{mesas.length ? mesas.filter((m) => m.estado === "Libre").length : "…"}</strong>
          <span>Disponibles ahora mismo</span>
        </article>
        <article className="kpi-card lift">
          <p>Revenue mesa hoy</p>
          <strong>{pedidosReady ? `S/ ${revenuesMesaHoy.toFixed(0)}` : "…"}</strong>
          <span>Cuentas pagadas en sala</span>
        </article>
        <article className="kpi-card lift">
          <p>Cuentas mesa hoy</p>
          <strong>{pedidosReady ? pedidosMesaHoy.length : "…"}</strong>
          <span>Servicios de mesa del día</span>
        </article>
      </div>

      {/* KPIs Delivery */}
      <p className="eyebrow" style={{ marginBottom: 10 }}>🐆 Delivery Guepardo</p>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <article className="kpi-card lift">
          <p>Pedidos delivery hoy</p>
          <strong>{pedidosReady ? deliveriesHoy.length : "…"}</strong>
          <span>Órdenes a domicilio del día</span>
        </article>
        <article className="kpi-card lift">
          <p>En reparto</p>
          <strong>{pedidosReady ? deliveriesActivos : "…"}</strong>
          <span>Pedidos en curso ahora</span>
        </article>
        <article className="kpi-card lift">
          <p>Revenue delivery hoy</p>
          <strong>{pedidosReady ? `S/ ${revenueDeliveryHoy.toFixed(0)}` : "…"}</strong>
          <span>Pedidos pagados a domicilio</span>
        </article>
        <article className="kpi-card lift">
          <p>Ticket promedio</p>
          <strong>
            {pedidosReady && deliveriesHoy.length
              ? `S/ ${(deliveriesHoy.reduce((s, p) => s + (Number(p.totalSoles) || 0), 0) / deliveriesHoy.length).toFixed(0)}`
              : "—"}
          </strong>
          <span>Por pedido de delivery</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <MetricBarChart
          title="Ocupación por turno"
          subtitle="Reservas activas del día según horario de llegada"
          items={ready ? dashboardStats.ocupacionPorTurno : []}
          maxValue={6}
        />
        <StatusDonutChart
          title="Estado del pipeline de reservas"
          subtitle="Distribución de reservas para leer la verdad del negocio"
          slices={ready ? dashboardStats.estados.filter((item) => item.value > 0) : []}
        />
      </div>

      <div className="dashboard-grid">
        <MetricBarChart
          title="Zonas en juego hoy"
          subtitle="Salón principal vs terraza"
          items={ready ? dashboardStats.zonas : []}
        />
        <MetricBarChart
          title="Canales de origen"
          subtitle="Web, agencias, OTAs y mostrador"
          items={ready ? dashboardStats.canales : []}
        />
      </div>

      {/* Tabla de pedidos recientes */}
      <section className="card card--pad admin-dashboard__agenda" style={{ marginTop: 20 }}>
        <div className="section-heading">
          <h2 className="section-title">Ventas de mesa recientes</h2>
          <p className="section-lead">Últimas cuentas cerradas en sala.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Mozo</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {pedidosReady && pedidosRecientes.length ? (
                pedidosRecientes.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.mesaCodigo}</strong></td>
                    <td>{p.mozoNombre || "—"}</td>
                    <td><strong>S/ {Number(p.totalSoles).toFixed(2)}</strong></td>
                    <td>{p.paymentMethod ? METODO_PAGO_LABEL[p.paymentMethod] || p.paymentMethod : "—"}</td>
                    <td><span className={pedidoBadgeClass(p.estado)}>{labelPedidoEstado(p.estado)}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {p.creadoEn ? new Date(p.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>{pedidosReady ? "Sin ventas de mesa." : "Cargando…"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link to="/admin/ventas" className="btn btn--outline-dark">
            Ver ventas sala
          </Link>
        </div>
      </section>

      {/* Tabla de próximas reservas */}
      <section className="card card--pad admin-dashboard__agenda" style={{ marginTop: 20 }}>
        <div className="section-heading">
          <h2 className="section-title">Próximas llegadas de hoy</h2>
          <p className="section-lead">Turnos que el equipo debe preparar en sala, con mesa y pax asignados.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Pax</th>
                <th>Mesa</th>
                <th>Zona</th>
                <th>Canal</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ready && dashboardStats.proximasHoy.length ? (
                dashboardStats.proximasHoy.map((reserva) => (
                  <tr key={reserva.id}>
                    <td>{reserva.hora}</td>
                    <td>{reserva.cliente}</td>
                    <td>{reserva.personas}</td>
                    <td>{reserva.mesa}</td>
                    <td>{reserva.zona}</td>
                    <td>{reserva.canal || "Web"}</td>
                    <td>{reserva.estado}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>Sin reservas activas para hoy en este momento.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
