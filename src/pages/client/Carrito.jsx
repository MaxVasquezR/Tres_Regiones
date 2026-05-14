import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import DeliveryAddressEditor from "../../components/DeliveryAddressEditor";

export default function Carrito() {
  const navigate = useNavigate();
  const {
    items,
    delivery,
    setDelivery,
    direccion,
    setQty,
    removeLine,
    subtotalSoles,
    deliverySoles,
    totalSoles,
    deliveryFee,
  } = useCart();

  const canCheckout = items.length > 0 && (!delivery || (direccion.calle.trim().length >= 6 && direccion.distrito.trim().length >= 3));

  return (
    <div className="booking-page">
      <div className="container container--wide">
        <header className="booking-page__head booking__intro">
          <p className="eyebrow">Pedido a domicilio o recojo</p>
          <h1 className="section-title">Tu carrito</h1>
          <p className="section-lead">
            Selecciona platos desde la carta, activa delivery si aplica (+S/ {deliveryFee}) y completa la dirección. El
            pago con tarjeta real se conectará a Culqi, Niubiz o similar; aquí tienes el flujo completo de minimuestra.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="card card--pad cart-empty">
            <p className="section-lead cart-empty__lead">
              Aún no hay platos. Vuelve al inicio y pulsa <strong>Añadir</strong> en la carta.
            </p>
            <Link to="/#carta" className="btn btn--primary">
              Ir a la carta
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-layout__main">
              <div className="card card--pad">
                <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: 16 }}>
                  Platos
                </h2>
                <div className="table-wrap">
                  <table className="cart-table">
                    <thead>
                      <tr>
                        <th>Plato</th>
                        <th>P. unit.</th>
                        <th>Cant.</th>
                        <th>Subtotal</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.platoId}>
                          <td>
                            <div className="cart-table__plato">
                              {row.imagen ? (
                                <img src={row.imagen} alt="" className="cart-table__thumb" width={56} height={56} />
                              ) : null}
                              <span>{row.nombre}</span>
                            </div>
                          </td>
                          <td>S/ {row.precioSoles.toFixed(2)}</td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className="input cart-table__qty"
                              value={row.qty}
                              onChange={(e) => setQty(row.platoId, e.target.value)}
                            />
                          </td>
                          <td>
                            <strong>S/ {(row.precioSoles * row.qty).toFixed(2)}</strong>
                          </td>
                          <td>
                            <button type="button" className="btn btn--surface" onClick={() => removeLine(row.platoId)}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card card--pad cart-delivery">
                <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: 12 }}>
                  Entrega
                </h2>
                <label className="policy-check" style={{ marginTop: 0 }}>
                  <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
                  <span>
                    <strong>Delivery a domicilio</strong> (+S/ {deliveryFee}). Si no marcas, asumimos recojo en el
                    local (Av. Javier Prado — minimuestra).
                  </span>
                </label>

                {delivery ? (
                  <DeliveryAddressEditor />
                ) : null}
              </div>
            </div>

            <aside className="cart-layout__aside">
              <div className="card card--pad cart-summary">
                <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: 14 }}>
                  Resumen
                </h2>
                <dl className="cart-summary__lines">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>S/ {subtotalSoles.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Delivery</dt>
                    <dd>{delivery ? `S/ ${deliverySoles.toFixed(2)}` : "S/ 0.00"}</dd>
                  </div>
                  <div className="cart-summary__total">
                    <dt>Total</dt>
                    <dd>S/ {totalSoles.toFixed(2)}</dd>
                  </div>
                </dl>
                {!canCheckout && items.length > 0 && delivery ? (
                  <p className="error" style={{ marginTop: 12 }}>
                    Completa calle y distrito para delivery.
                  </p>
                ) : null}
                <div className="cart-summary__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!canCheckout}
                    onClick={() => navigate("/checkout")}
                  >
                    Ir a pago
                  </button>
                  <Link to="/#carta" className="btn btn--outline-dark">
                    Seguir comprando
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
