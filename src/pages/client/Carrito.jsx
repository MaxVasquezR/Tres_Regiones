import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";

export default function Carrito() {
  const { items, subtotal, descuentoSoles, promo, applyPromo, clearPromo, setQty, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  const total = Math.max(0, subtotal - descuentoSoles);

  const aplicarCodigo = () => {
    const r = applyPromo(codigo);
    if (r.ok) {
      setPromoMsg(`✓ ${r.promo.label} aplicado`);
      setCodigo("");
    } else {
      setPromoMsg(r.error);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container container--narrow cart-page">
        <div className="cart-empty card card--pad">
          <div className="cart-empty__icon" aria-hidden>🐆</div>
          <h1 className="section-title">Tu carrito está vacío</h1>
          <p className="section-lead">Arma tu pedido con nuestros platos y combos. El Guepardo lo lleva volando.</p>
          <Link to="/" className="btn btn--primary">Ver la carta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container container--narrow cart-page cart-page--with-sticky">
      <header className="cart-page__head">
        <h1 className="section-title">Tu pedido</h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
          Vaciar
        </button>
      </header>

      <div className="cart-list">
        {items.map((it) => (
          <article key={it.key} className="cart-row card">
            {it.imagen ? <img src={it.imagen} alt="" className="cart-row__img" loading="lazy" /> : null}
            <div className="cart-row__body">
              <div className="cart-row__top">
                <h3 className="cart-row__name">
                  {it.tipo === "combo" ? "🍱 " : ""}
                  {it.nombre}
                </h3>
                <button
                  type="button"
                  className="cart-row__remove"
                  aria-label={`Quitar ${it.nombre}`}
                  onClick={() => removeItem(it.key)}
                >
                  ✕
                </button>
              </div>
              {it.notas ? <p className="cart-row__notas">{it.notas}</p> : null}
              <div className="cart-row__bottom">
                <div className="qty-stepper" role="group" aria-label={`Cantidad de ${it.nombre}`}>
                  <button type="button" onClick={() => setQty(it.key, it.qty - 1)} aria-label="Restar">−</button>
                  <span>{it.qty}</span>
                  <button type="button" onClick={() => setQty(it.key, it.qty + 1)} aria-label="Sumar">+</button>
                </div>
                <strong className="cart-row__price">S/ {(it.precioSoles * it.qty).toFixed(2)}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="cart-upsell card card--pad" aria-label="Sugerencias">
        <p className="cart-upsell__eyebrow">⚡ Completa en un toque</p>
        <h3 className="cart-upsell__title">¿Bebida o postre para tu Guepardo?</h3>
        <p className="hint">Los pedidos con bebida salen más rápido de cocina (combo listo).</p>
        <Link to="/#carta" className="btn btn--outline-dark btn--sm">
          Ver bebidas y postres
        </Link>
      </section>

      <div className="cart-summary card card--pad">
        <div className="cart-promo">
          <label className="label" htmlFor="promo-code">Código Guepardo</label>
          <div className="cart-promo__row">
            <input
              id="promo-code"
              type="text"
              className="input"
              placeholder="GUEPARDO, VELOZ28…"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
            <button type="button" className="btn btn--surface btn--sm" onClick={aplicarCodigo}>
              Aplicar
            </button>
          </div>
          {promoMsg && <p className={`cart-promo__msg${promo ? " cart-promo__msg--ok" : ""}`}>{promoMsg}</p>}
          {promo && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { clearPromo(); setPromoMsg(""); }}>
              Quitar {promo.label}
            </button>
          )}
        </div>
        <div className="cart-summary__row">
          <span>Subtotal</span>
          <strong>S/ {subtotal.toFixed(2)}</strong>
        </div>
        {descuentoSoles > 0 && (
          <div className="cart-summary__row cart-summary__row--discount">
            <span>Descuento {promo?.label}</span>
            <strong>− S/ {descuentoSoles.toFixed(2)}</strong>
          </div>
        )}
        <div className="cart-summary__row cart-summary__row--total">
          <span>Total estimado</span>
          <strong>S/ {total.toFixed(2)}</strong>
        </div>
        <p className="hint">El delivery se calcula según tu distrito en el checkout.</p>
        <button type="button" className="btn btn--primary btn--block cart-summary__cta-desktop" onClick={() => navigate("/checkout")}>
          Continuar al pago
        </button>
        <Link to="/" className="btn btn--ghost btn--block">Seguir pidiendo</Link>
      </div>

      <div className="checkout-sticky" aria-label="Resumen rápido">
        <div className="checkout-sticky__inner">
          <div>
            <span className="checkout-sticky__label">Total estimado</span>
            <strong className="checkout-sticky__total">S/ {total.toFixed(2)}</strong>
          </div>
          <button type="button" className="btn btn--sun" onClick={() => navigate("/checkout")}>
            Pagar ⚡
          </button>
        </div>
      </div>
    </div>
  );
}
