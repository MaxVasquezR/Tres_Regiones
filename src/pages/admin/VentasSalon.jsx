import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api";
import { labelPedidoEstado, pedidoBadgeClass, METODO_PAGO_LABEL } from "../../data/adminPedidoEstados";
import { getAdminSede, subscribeAdminSede } from "../../data/adminSede";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function esCobrado(p) {
  return p.tipo === "delivery" ? p.pagado === true : p.estado === "Pagado";
}

function esAbierto(p) {
  return p.tipo === "delivery"
    ? !["Entregado", "Anulado"].includes(p.estado)
    : !["Pagado", "Anulado", "Cerrado"].includes(p.estado);
}

export default function VentasSalon() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("hoy");
  const [tipo, setTipo] = useState("todo");
  const [sede, setSede] = useState(getAdminSede());

  useEffect(() => subscribeAdminSede(setSede), []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const q = sede ? `?sedeId=${sede}` : "";
      const json = await apiGet(`/api/pedidos${q}`, { auth: true });
      setPedidos(Array.isArray(json.data) ? json.data : []);
    } catch {
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [sede]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hoy = todayStr();
  const lista = useMemo(() => {
    let rows = [...pedidos];
    if (tipo !== "todo") rows = rows.filter((p) => p.tipo === tipo);
    if (filtro === "hoy") {
      rows = rows.filter(
        (p) => String(p.pagadoEn || p.creadoEn || "").slice(0, 10) === hoy || esAbierto(p),
      );
    } else if (filtro === "abiertas") {
      rows = rows.filter((p) => esAbierto(p));
    } else if (filtro === "cobradas") {
      rows = rows.filter((p) => esCobrado(p));
    }
    return rows.sort((a, b) => (b.creadoEn > a.creadoEn ? 1 : -1));
  }, [pedidos, filtro, tipo, hoy]);

  const totalCobradoHoy = pedidos
    .filter((p) => esCobrado(p) && String(p.pagadoEn || "").slice(0, 10) === hoy)
    .reduce((s, p) => s + (Number(p.totalSoles) || 0), 0);

  return (
    <div className="admin-ventas">
      <header className="admin-page-head">
        <div>
          <p className="eyebrow">Ventas · sala y delivery</p>
          <h1>Ventas</h1>
          <p className="admin-page-head__lead">
            Cuentas de mesa y pedidos de delivery{sede ? " de la sede seleccionada" : " de todas las sedes"}.
          </p>
        </div>
        <div className="admin-page-head__actions">
          <button type="button" className="btn btn--surface" onClick={() => void cargar()} disabled={loading}>
            Actualizar
          </button>
        </div>
      </header>

      <div className="kpi-grid kpi-grid--compact">
        <article className="kpi-card kpi-card--ops">
          <p>Cobrado hoy</p>
          <strong>S/ {totalCobradoHoy.toFixed(2)}</strong>
        </article>
        <article className="kpi-card kpi-card--ops">
          <p>En curso</p>
          <strong>{pedidos.filter((p) => esAbierto(p)).length}</strong>
        </article>
      </div>

      <div className="ops-toolbar">
        {[
          { id: "todo", label: "Todo" },
          { id: "mesa", label: "Sala" },
          { id: "delivery", label: "Delivery" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ops-chip${tipo === t.id ? " ops-chip--active" : ""}`}
            onClick={() => setTipo(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="ops-toolbar__sep" aria-hidden />
        {[
          { id: "hoy", label: "Hoy" },
          { id: "abiertas", label: "En curso" },
          { id: "cobradas", label: "Cobradas" },
          { id: "todas", label: "Todas" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ops-chip${filtro === t.id ? " ops-chip--active" : ""}`}
            onClick={() => setFiltro(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando ventas…</p>
      ) : lista.length === 0 ? (
        <p className="muted">Sin registros para este filtro.</p>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Origen</th>
                <th>Detalle</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.tipo === "delivery" ? "🐆 Delivery" : `Mesa ${p.mesaCodigo}`}</strong>
                  </td>
                  <td>{p.tipo === "delivery" ? `${p.direccion?.distrito || ""} · ${p.clienteNombre || ""}` : p.mozoNombre || "—"}</td>
                  <td>
                    <span className={pedidoBadgeClass(p.estado)}>
                      {p.tipo === "delivery" ? String(p.estado).replace(/_/g, " ") : labelPedidoEstado(p.estado)}
                    </span>
                  </td>
                  <td>S/ {(Number(p.totalSoles) || 0).toFixed(2)}</td>
                  <td>{p.paymentMethod ? METODO_PAGO_LABEL[p.paymentMethod] || p.paymentMethod : "—"}</td>
                  <td className="ops-table__muted">
                    {new Date(p.pagadoEn || p.creadoEn).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
