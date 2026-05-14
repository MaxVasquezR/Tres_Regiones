import { Link } from "react-router-dom";
import MetricBarChart from "../../components/charts/MetricBarChart";
import StatusDonutChart from "../../components/charts/StatusDonutChart";
import { useReservations } from "../../context/ReservationsContext";

const kpis = [
  { key: "reservasHoy", title: "Reservas hoy", detail: "Turnos activos en sala" },
  { key: "ocupacionHoy", title: "Ocupación hoy", detail: "Mesas comprometidas", suffix: "%" },
  { key: "depositosCobrados", title: "Depósitos", detail: "Separaciones cobradas", format: "soles" },
  { key: "noShows", title: "No show", detail: "Ausencias sin reembolso" },
];

export default function Dashboard() {
  const { dashboardStats, ready } = useReservations();
  const fecha = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__head">
        <div>
          <p className="eyebrow">Métricas en vivo</p>
          <h1>Operación unificada: sala, reservas y canales digitales</h1>
          <p>Ocupación, depósitos, estados y riesgo operativo en una sola línea de mando — pensado para restaurantes de alto flujo.</p>
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
              Confirma reservas, avanza pedidos delivery/recojo, anula o borra desde una sola pantalla.
            </p>
          </div>
          <Link to="/admin/operaciones" className="btn btn--primary">
            Abrir centro de operación
          </Link>
        </div>
      </section>

      <div className="kpi-grid">
        {kpis.map((item) => {
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

      <div className="dashboard-grid">
        <MetricBarChart
          title="Ocupación por turno"
          subtitle="Reservas activas del día según horario de llegada"
          items={ready ? dashboardStats.ocupacionPorTurno : []}
          maxValue={6}
        />
        <StatusDonutChart
          title="Estado del pipeline"
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

      <section className="card card--pad admin-dashboard__agenda">
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
