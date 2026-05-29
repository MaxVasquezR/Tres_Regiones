import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch } from "../../api";

const ESTADO_COLOR = {
  Pendiente_cocina: "#e53935",
  En_preparacion: "#f59e0b",
  Listo: "#4caf50",
  Servido: "#78909c",
};

const ESTADO_LABEL = {
  Pendiente_cocina: "Pendiente",
  En_preparacion: "En preparación",
  Listo: "Listo",
  Servido: "Servido",
};

function minutosDesde(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}

export default function CocinaScreen() {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchComandas = useCallback(async () => {
    try {
      const res = await apiGet("/api/comandas?estado=Pendiente_cocina", { auth: true });
      const enPrep = await apiGet("/api/comandas?estado=En_preparacion", { auth: true });
      const combinadas = [...(res.data || []), ...(enPrep.data || [])];
      combinadas.sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));
      setComandas(combinadas);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      setError(err?.message || "No se pudo cargar las comandas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComandas();
    const id = setInterval(fetchComandas, 15000);
    return () => clearInterval(id);
  }, [fetchComandas]);

  const cambiarEstado = async (comanda, nuevoEstado) => {
    try {
      await apiPatch(`/api/comandas/${comanda.id}`, { estado: nuevoEstado }, { auth: true });
      await fetchComandas();
    } catch (err) {
      setError(err?.message || "No se pudo actualizar la comanda.");
    }
  };

  return (
    <div className="cocina-screen">
      <header className="cocina-header">
        <div className="cocina-header__brand">
          <span className="cocina-header__mark">TR</span>
          <span className="cocina-header__title">COCINA · Tres Regiones</span>
        </div>
        <div className="cocina-header__right">
          <span className="cocina-header__count">
            {comandas.filter((c) => c.estado === "Pendiente_cocina").length} pendientes
          </span>
          {lastUpdate && (
            <span className="cocina-header__time">
              Act. {lastUpdate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button type="button" className="btn btn--surface btn--sm" onClick={fetchComandas}>
            Actualizar
          </button>
        </div>
      </header>

      {error && <div className="error" style={{ margin: "12px 16px" }}>{error}</div>}

      {loading ? (
        <div className="cocina-loading">Cargando comandas…</div>
      ) : comandas.length === 0 ? (
        <div className="cocina-empty">
          <p className="cocina-empty__icon">✓</p>
          <p className="cocina-empty__msg">Sin comandas pendientes</p>
          <p className="hint">La pantalla se actualiza cada 15 segundos.</p>
        </div>
      ) : (
        <div className="cocina-grid">
          {comandas.map((comanda) => {
            const mins = minutosDesde(comanda.creadoEn);
            const urgente = mins > 10 && comanda.estado === "Pendiente_cocina";
            return (
              <div
                key={comanda.id}
                className={`cocina-card${urgente ? " cocina-card--urgente" : ""}`}
                style={{ borderTop: `4px solid ${ESTADO_COLOR[comanda.estado] || "#888"}` }}
              >
                <div className="cocina-card__header">
                  <span className="cocina-card__mesa">
                    {comanda.origen === "delivery" ? `🐆 Delivery ${comanda.mesaCodigo}` : `Mesa ${comanda.mesaCodigo}`}
                  </span>
                  <span className="cocina-card__ronda">Ronda {comanda.ronda}</span>
                  <span className={`cocina-card__mins${urgente ? " cocina-card__mins--urgente" : ""}`}>
                    {mins}min
                  </span>
                </div>
                {comanda.mozoNombre && (
                  <p className="cocina-card__mozo">Mozo: {comanda.mozoNombre}</p>
                )}
                <div className="cocina-card__items">
                  {comanda.items.map((item, i) => (
                    <div key={i} className="cocina-card__item">
                      <span className="cocina-card__item-qty">{item.qty}x</span>
                      <div>
                        <span className="cocina-card__item-nombre">{item.nombre}</span>
                        {item.notas && (
                          <span className="cocina-card__item-notas"> — {item.notas}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cocina-card__estado">
                  <span style={{ color: ESTADO_COLOR[comanda.estado], fontWeight: 700 }}>
                    {ESTADO_LABEL[comanda.estado]}
                  </span>
                </div>
                <div className="cocina-card__actions">
                  {comanda.estado === "Pendiente_cocina" && (
                    <button
                      type="button"
                      className="btn btn--surface btn--sm"
                      onClick={() => cambiarEstado(comanda, "En_preparacion")}
                    >
                      En preparación
                    </button>
                  )}
                  {(comanda.estado === "Pendiente_cocina" || comanda.estado === "En_preparacion") && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => cambiarEstado(comanda, "Listo")}
                    >
                      ¡Listo!
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
