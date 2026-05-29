import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPatch, apiPost } from "../../api";
import { useTableOrder } from "../../context/TableOrderContext";
import { obtenerSesion } from "../../session";

const CATEGORIAS_ORDEN = ["Menú del día", "Entradas", "Clásicos", "Norte", "Mar", "Especiales", "Postres"];

export default function ComandaScreen() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { items, addItem, setQty, removeItem, clearComanda, subtotal, setMesa } = useTableOrder();

  const [platos, setPlatos] = useState([]);
  const [menuDelDia, setMenuDelDia] = useState(null);
  const [catActiva, setCatActiva] = useState("Entradas");
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal para plato seleccionado
  const [platoModal, setPlatoModal] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalNotas, setModalNotas] = useState("");

  const sesion = obtenerSesion();

  const fetchData = useCallback(async () => {
    try {
      const [platosRes, menuRes, pedidoRes] = await Promise.all([
        apiGet("/api/platos"),
        apiGet("/api/menu-del-dia"),
        apiGet(`/api/mesas/${codigo}/pedido-activo`, { auth: true }),
      ]);
      setPlatos(platosRes.data || []);
      setMenuDelDia(menuRes.data?.activo ? menuRes.data : null);
      setPedidoActivo(pedidoRes.data);
      if (pedidoRes.data?.items?.length && items.length === 0) {
        setMesa(codigo);
      }
    } catch (err) {
      setError(err?.message || "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, [codigo, items.length, setMesa]);

  useEffect(() => {
    setMesa(codigo);
    fetchData();
  }, [codigo, fetchData, setMesa]);

  const categorias = [
    ...(menuDelDia ? ["Menú del día"] : []),
    ...CATEGORIAS_ORDEN.filter((c) => c !== "Menú del día" && platos.some((p) => p.categoria === c)),
  ];

  const platosFiltrados = catActiva === "Menú del día"
    ? []
    : platos.filter((p) => p.categoria === catActiva && p.disponible !== false);

  const openModal = (plato) => {
    setPlatoModal(plato);
    setModalQty(1);
    setModalNotas("");
  };

  const handleAddToComanda = () => {
    if (!platoModal) return;
    addItem(platoModal, modalQty, modalNotas);
    setPlatoModal(null);
  };

  const handlePedirCuenta = async () => {
    if (!pedidoActivo?.id) return;
    setError("");
    try {
      await apiPatch(`/api/pedidos/${pedidoActivo.id}`, { estado: "Cuenta_pedida" }, { auth: true });
      await fetchData();
      setSuccess("Cuenta pedida — no se envían más platos.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err?.message || "No se pudo marcar cuenta pedida.");
    }
  };

  const handleMarcarServido = async (comandaId) => {
    try {
      await apiPatch(`/api/comandas/${comandaId}`, { estado: "Servido" }, { auth: true });
      await fetchData();
    } catch (err) {
      setError(err?.message || "No se pudo marcar como servido.");
    }
  };

  const handleSendComanda = async () => {
    if (pedidoActivo?.estado === "Cuenta_pedida") {
      setError("La mesa tiene cuenta pedida. No se pueden agregar platos.");
      return;
    }
    if (items.length === 0) { setError("Agrega al menos un plato antes de enviar."); return; }
    setSending(true);
    setError("");
    try {
      const payload = {
        mesaCodigo: codigo,
        items: items.map((x) => ({ platoId: x.platoId, qty: x.qty, notas: x.notas })),
      };
      const res = await apiPost("/api/comandas", payload, { auth: true });
      clearComanda();
      setPedidoActivo(res.pedido);
      setSuccess("¡Comanda enviada a cocina!");
      setTimeout(() => setSuccess(""), 3000);
      await fetchData();
    } catch (err) {
      setError(err?.message || "No se pudo enviar la comanda.");
    } finally {
      setSending(false);
    }
  };

  const totalPedido = (pedidoActivo?.items || []).reduce((s, i) => s + i.precioSoles * i.qty, 0);

  if (loading) return <div className="mozo-loading">Cargando…</div>;

  return (
    <div className="comanda-screen">
      {/* Header de mesa */}
      <div className="comanda-screen__header">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate("/mozo/mesas")}>
          ← Mesas
        </button>
        <div className="comanda-screen__mesa-info">
          <strong>Mesa {codigo}</strong>
          {pedidoActivo && (
            <span className="badge badge--warn" style={{ marginLeft: 8 }}>
              Ocupada · S/ {totalPedido.toFixed(2)}
            </span>
          )}
        </div>
        {pedidoActivo && (
          <>
            {pedidoActivo.estado !== "Cuenta_pedida" && (
              <button type="button" className="btn btn--surface btn--sm" onClick={() => void handlePedirCuenta()}>
                Pedir cuenta
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => navigate(`/mozo/mesa/${codigo}/cuenta`)}
            >
              Cerrar y cobrar
            </button>
          </>
        )}
      </div>

      <div className="comanda-screen__body">
        {/* Panel izquierdo: carta */}
        <div className="comanda-screen__carta">
          {/* Categorías */}
          <div className="comanda-screen__cats">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`comanda-cat-btn${catActiva === cat ? " comanda-cat-btn--active" : ""}`}
                onClick={() => setCatActiva(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menú del día especial */}
          {catActiva === "Menú del día" && menuDelDia && (
            <div className="menu-del-dia-card">
              <div className="menu-del-dia-card__badge">Menú del día</div>
              <div className="menu-del-dia-card__precio">S/ {menuDelDia.precioSoles?.toFixed(2)}</div>
              <div className="menu-del-dia-card__items">
                {menuDelDia.entrada && <span><strong>Entrada:</strong> {menuDelDia.entrada}</span>}
                {menuDelDia.fondo && <span><strong>Fondo:</strong> {menuDelDia.fondo}</span>}
                {menuDelDia.bebida && <span><strong>Bebida:</strong> {menuDelDia.bebida}</span>}
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const menúPlato = {
                    id: 9999,
                    nombre: `Menú del día (${menuDelDia.fondo || "fondo"})`,
                    precio: `S/ ${menuDelDia.precioSoles?.toFixed(2) || "0.00"}`,
                  };
                  addItem(menúPlato, 1, "");
                  setSuccess("Menú del día agregado");
                  setTimeout(() => setSuccess(""), 2000);
                }}
              >
                Agregar
              </button>
            </div>
          )}

          {/* Platos de la categoría */}
          <div className="comanda-platos-grid">
            {platosFiltrados.map((plato) => {
              const enComanda = items.find((x) => x.platoId === plato.id);
              return (
                <button
                  key={plato.id}
                  type="button"
                  className={`comanda-plato-card${enComanda ? " comanda-plato-card--selected" : ""}`}
                  onClick={() => openModal(plato)}
                >
                  <div className="comanda-plato-card__nombre">{plato.nombre}</div>
                  <div className="comanda-plato-card__precio">{plato.precio}</div>
                  {enComanda && (
                    <div className="comanda-plato-card__qty-badge">{enComanda.qty}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel derecho: comanda actual */}
        <div className="comanda-screen__orden">
          <h3 className="comanda-screen__orden-title">Comanda · Mesa {codigo}</h3>

          {/* Historial del pedido (rondas anteriores) */}
          {pedidoActivo?.estado === "Cuenta_pedida" && (
            <p className="comanda-cuenta-aviso">Cuenta pedida — cocina no recibe nuevos platos.</p>
          )}

          {(pedidoActivo?.comandas || []).filter((c) => c.estado === "Listo").length > 0 && (
            <div className="comanda-listos">
              <p className="comanda-historial__label">Listos en cocina:</p>
              {pedidoActivo.comandas
                .filter((c) => c.estado === "Listo")
                .map((c) => (
                  <div key={c.id} className="comanda-listos__row">
                    <span>Ronda {c.ronda} · {c.items?.map((i) => i.nombre).join(", ")}</span>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleMarcarServido(c.id)}>
                      Servido
                    </button>
                  </div>
                ))}
            </div>
          )}

          {pedidoActivo?.items?.length > 0 && (
            <div className="comanda-historial">
              <p className="comanda-historial__label">Ya ordenado:</p>
              {pedidoActivo.items.map((item, i) => (
                <div key={i} className="comanda-historial__item">
                  <span>{item.qty}x {item.nombre}</span>
                  <span>S/ {(item.precioSoles * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="comanda-historial__total">
                Total acumulado: <strong>S/ {totalPedido.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {/* Nueva ronda */}
          {items.length > 0 && (
            <div className="comanda-nueva-ronda">
              <p className="comanda-nueva-ronda__label">Nueva ronda:</p>
              {items.map((item) => (
                <div key={`${item.platoId}-${item.notas}`} className="comanda-item-row">
                  <div className="comanda-item-row__info">
                    <span className="comanda-item-row__nombre">{item.nombre}</span>
                    {item.notas && <span className="comanda-item-row__notas">{item.notas}</span>}
                  </div>
                  <div className="comanda-item-row__controls">
                    <button
                      type="button"
                      className="comanda-qty-btn"
                      onClick={() => setQty(item.platoId, item.notas, item.qty - 1)}
                    >-</button>
                    <span className="comanda-qty-num">{item.qty}</span>
                    <button
                      type="button"
                      className="comanda-qty-btn"
                      onClick={() => setQty(item.platoId, item.notas, item.qty + 1)}
                    >+</button>
                    <button
                      type="button"
                      className="comanda-remove-btn"
                      onClick={() => removeItem(item.platoId, item.notas)}
                    >✕</button>
                  </div>
                  <span className="comanda-item-row__precio">S/ {(item.precioSoles * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="comanda-nueva-ronda__subtotal">
                Esta ronda: <strong>S/ {subtotal.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {items.length === 0 && !pedidoActivo && (
            <p className="comanda-screen__empty">Selecciona platos de la carta para agregar.</p>
          )}

          {error && <div className="error" style={{ margin: "8px 0" }}>{error}</div>}
          {success && <div className="success-msg" style={{ margin: "8px 0" }}>{success}</div>}

          {items.length > 0 && (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={handleSendComanda}
              disabled={sending}
            >
              {sending ? "Enviando…" : "Enviar comanda a cocina"}
            </button>
          )}
        </div>
      </div>

      {/* Modal de plato */}
      {platoModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setPlatoModal(null)}>
          <div className="modal-box comanda-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setPlatoModal(null)} aria-label="Cerrar">✕</button>
            <h3 className="comanda-modal__nombre">{platoModal.nombre}</h3>
            <p className="comanda-modal__precio">{platoModal.precio}</p>
            {platoModal.descripcion && (
              <p className="comanda-modal__desc">{platoModal.descripcion}</p>
            )}
            <div className="comanda-modal__qty-row">
              <label className="label">Cantidad</label>
              <div className="comanda-modal__qty-controls">
                <button type="button" className="comanda-qty-btn" onClick={() => setModalQty((q) => Math.max(1, q - 1))}>-</button>
                <span className="comanda-qty-num">{modalQty}</span>
                <button type="button" className="comanda-qty-btn" onClick={() => setModalQty((q) => Math.min(20, q + 1))}>+</button>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">Notas (opcional)</label>
              <input
                type="text"
                className="input"
                placeholder="sin ají, término medio, etc."
                value={modalNotas}
                onChange={(e) => setModalNotas(e.target.value)}
                maxLength={200}
              />
            </div>
            <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={handleAddToComanda}>
              Agregar a comanda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
