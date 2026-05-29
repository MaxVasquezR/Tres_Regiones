import { useEffect, useState } from "react";

export default function PlatoModal({ plato, onClose, readOnly = false, onAdd }) {
  const [qty, setQty] = useState(1);
  const [notas, setNotas] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleAdd = () => {
    onAdd?.(plato, qty, notas.trim());
    setAdded(true);
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="plato-modal-overlay" role="dialog" aria-modal="true" aria-label={plato.nombre} onClick={onClose}>
      <div className="plato-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="plato-modal__close" aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
        {plato.imagen ? (
          <div className="plato-modal__img-wrap">
            <img src={plato.imagen} alt={plato.nombre} className="plato-modal__img" />
            {plato.categoria && <span className="plato-modal__cat-badge">{plato.categoria}</span>}
          </div>
        ) : null}
        <div className="plato-modal__body">
          <p className="eyebrow">{plato.categoria}</p>
          <h2 className="plato-modal__title">{plato.nombre}</h2>
          <p className="plato-modal__desc">{plato.descripcion}</p>
          <strong className="plato-modal__price">{plato.precio}</strong>

          {readOnly && (
            <p className="plato-modal__note">Consulta con su mozo para realizar el pedido en mesa.</p>
          )}

          {!readOnly && onAdd && (
            <div className="plato-modal__order">
              <div className="field">
                <label className="label">Indicaciones (opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. sin cebolla, término medio…"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="plato-modal__actions">
                <div className="qty-stepper" role="group" aria-label="Cantidad">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar">−</button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(30, q + 1))} aria-label="Sumar">+</button>
                </div>
                <button type="button" className="btn btn--primary plato-modal__add" onClick={handleAdd}>
                  {added ? "Agregado ✓" : "Agregar al carrito"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
