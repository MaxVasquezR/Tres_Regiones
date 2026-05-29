import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../api";
import { METODO_PAGO_LABEL } from "../../data/adminPedidoEstados";
import { getAdminSede, subscribeAdminSede } from "../../data/adminSede";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CierreCaja() {
  const [fecha, setFecha] = useState(todayStr);
  const [sede, setSede] = useState(getAdminSede());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => subscribeAdminSede(setSede), []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = `?fecha=${fecha}${sede ? `&sedeId=${sede}` : ""}`;
      const json = await apiGet(`/api/cierre-caja${q}`, { auth: true });
      setData(json.data);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el cierre.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fecha, sede]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="admin-cierre">
      <header className="admin-page-head">
        <div>
          <p className="eyebrow">Fin de turno</p>
          <h1>Cierre de caja</h1>
          <p className="admin-page-head__lead">
            Ventas de sala y delivery cobradas por método de pago{sede ? " (sede seleccionada)" : " (todas las sedes)"}.
          </p>
        </div>
        <div className="admin-page-head__actions">
          <input
            type="date"
            className="input input--compact"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button type="button" className="btn btn--surface" onClick={() => void cargar()} disabled={loading}>
            Actualizar
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Calculando cierre…</p>
      ) : data ? (
        <>
          <div className="kpi-grid">
            <article className="kpi-card kpi-card--ops kpi-card--highlight">
              <p>Total del día</p>
              <strong>S/ {Number(data.totalGeneral).toFixed(2)}</strong>
              <span>{data.mesas} mesa{data.mesas !== 1 ? "s" : ""} · {data.deliveries ?? 0} delivery</span>
            </article>
            <article className="kpi-card kpi-card--ops">
              <p>Efectivo</p>
              <strong>S/ {Number(data.efectivo).toFixed(2)}</strong>
            </article>
            <article className="kpi-card kpi-card--ops">
              <p>Yape / Plin</p>
              <strong>S/ {Number(data.yapeQR).toFixed(2)}</strong>
            </article>
            <article className="kpi-card kpi-card--ops">
              <p>Tarjeta</p>
              <strong>S/ {Number(data.tarjeta).toFixed(2)}</strong>
            </article>
          </div>

          {data.pedidos?.length > 0 ? (
            <div className="ops-table-wrap" style={{ marginTop: 24 }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Atendió</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Hora cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pedidos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.tipo === "delivery" ? `🐆 ${p.direccion?.distrito || "Delivery"}` : p.mesaCodigo}</strong>
                      </td>
                      <td>{p.tipo === "delivery" ? p.clienteNombre || "—" : p.mozoNombre || "—"}</td>
                      <td>S/ {(Number(p.totalSoles) || 0).toFixed(2)}</td>
                      <td>{METODO_PAGO_LABEL[p.paymentMethod] || p.paymentMethod}</td>
                      <td className="ops-table__muted">
                        {p.pagadoEn
                          ? new Date(p.pagadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 20 }}>Sin ventas cobradas en esta fecha.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
