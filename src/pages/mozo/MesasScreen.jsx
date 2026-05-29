import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../api";
import SalonFloorPlan from "../../components/SalonFloorPlan";

const ESTADO_BADGE = {
  Libre: { label: "Libre", cls: "badge badge--ok" },
  Ocupada: { label: "Ocupada", cls: "badge badge--danger" },
  Cuenta_pedida: { label: "Cuenta pedida", cls: "badge badge--warn" },
  Reservada: { label: "Reservada", cls: "badge badge--info" },
};

export default function MesasScreen() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMesas = useCallback(async () => {
    try {
      const json = await apiGet("/api/mesas-estado", { auth: true });
      setMesas(json.data || []);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      setError(err?.message || "No se pudo cargar el estado de las mesas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    const id = setInterval(fetchMesas, 20000);
    return () => clearInterval(id);
  }, [fetchMesas]);

  const handleSelectMesa = (codigo, estado) => {
    if (estado === "Libre" || estado === "Ocupada" || estado === "Cuenta_pedida") {
      navigate(`/mozo/mesa/${codigo}/comanda`);
    } else if (estado === "Reservada") {
      navigate(`/mozo/mesa/${codigo}/comanda`);
    }
  };

  const libres = mesas.filter((m) => m.estado === "Libre").length;
  const ocupadas = mesas.filter((m) => m.estado === "Ocupada" || m.estado === "Cuenta_pedida").length;
  const listas = mesas.reduce((s, m) => s + (m.comandasListas || 0), 0);

  return (
    <div className="mozo-mesas-page">
      <div className="mozo-mesas-header">
        <div>
          <h1 className="mozo-mesas-header__title">Mesas del salón</h1>
          <p className="mozo-mesas-header__sub">
            {libres} libre{libres !== 1 ? "s" : ""} · {ocupadas} ocupada{ocupadas !== 1 ? "s" : ""}
            {listas > 0 && (
              <span className="mozo-mesas-header__alert"> · {listas} listo{listas !== 1 ? "s" : ""} en cocina</span>
            )}
            {lastUpdate && (
              <span className="mozo-mesas-header__time">
                {" "}· act. {lastUpdate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn btn--surface btn--sm" onClick={fetchMesas}>
          Actualizar
        </button>
      </div>

      {error && <div className="error" style={{ margin: "0 16px 12px" }}>{error}</div>}

      {loading ? (
        <div className="mozo-mesas-loading">Cargando mesas…</div>
      ) : (
        <SalonFloorPlan
          variant="pos"
          mesasStatus={mesas}
          onSelectMesa={handleSelectMesa}
        />
      )}

      <div className="mozo-mesas-list">
        {mesas.map((m) => {
          const badge = ESTADO_BADGE[m.estado] || ESTADO_BADGE.Libre;
          return (
            <button
              key={m.codigo}
              type="button"
              className={`mozo-mesa-card mozo-mesa-card--${m.estado.toLowerCase().replace("_", "-")}`}
              onClick={() => handleSelectMesa(m.codigo, m.estado)}
            >
              <div className="mozo-mesa-card__code">{m.codigo}</div>
              <span className={badge.cls}>{badge.label}</span>
              {(m.comandasListas || 0) > 0 && (
                <div className="mozo-mesa-card__listo">{m.comandasListas} listo{m.comandasListas !== 1 ? "s" : ""}</div>
              )}
              {m.totalAbierto > 0 && (
                <div className="mozo-mesa-card__total">S/ {m.totalAbierto.toFixed(2)}</div>
              )}
              {m.mozoNombre && (
                <div className="mozo-mesa-card__mozo">{m.mozoNombre}</div>
              )}
              {m.reservaCliente && (
                <div className="mozo-mesa-card__mozo">{m.reservaCliente} · {m.reservaHora}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
