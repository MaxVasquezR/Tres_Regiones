import { Link, useLocation } from "react-router-dom";
import { haySesionCliente } from "../../session";
import SalonFloorPlan from "../../components/SalonFloorPlan";

export default function Confirmacion() {
  const location = useLocation();
  const puedeReservar = haySesionCliente();
  const flow = location.state?.flow === "reserva" ? "reserva" : "registro";
  const reserva = location.state?.reserva;

  return (
    <div className="confirmation-page">
      <div className="container container--wide">
        <div className="confirmation confirmation--celebrate">
          <div
            className={`confirmation__ticket card card--pad${flow === "reserva" && reserva?.mesa ? " confirmation__ticket--wide" : ""}`}
          >
            <p className="confirmation__burst" aria-hidden>✨</p>
            <p className="eyebrow">{flow === "reserva" ? "Reserva confirmada" : "Cuenta lista"}</p>
            <h1 className="section-title">
              {flow === "reserva" ? "Tu mesa quedó registrada" : "Bienvenido a TRES REGIONES"}
            </h1>

            {flow === "reserva" ? (
              <>
                <p className="section-lead">
                  El restaurante recibió tu separación con depósito de <strong>S/ 20</strong>. Presenta esta confirmación
                  al llegar al local. Servicio presencial en mesa.
                </p>
                {reserva && (
                  <div className="confirmation__summary">
                    <p><strong>{reserva.cliente}</strong> · {reserva.telefono}</p>
                    <p>{reserva.fecha} · {reserva.hora} · {reserva.personas} personas</p>
                    <p>Mesa <strong>{reserva.mesa}</strong> · {reserva.zona}</p>
                    <p>
                      Depósito <strong>S/ {reserva.depositoSoles ?? 20}</strong>{" "}
                      {reserva.depositoPagado ? "registrado" : "pendiente"}
                    </p>
                    {reserva.ocasion && <p>Ocasión: {reserva.ocasion}</p>}
                    {reserva.referenciaHotel && <p>Referencia: {reserva.referenciaHotel}</p>}
                  </div>
                )}
                {reserva?.mesa ? (
                  <div className="confirmation__floor">
                    <SalonFloorPlan
                      key={`${reserva.mesa}-${reserva.zona}-${reserva.fecha}-${reserva.hora}`}
                      mesaDestacada={reserva.mesa}
                      zonaDefault={reserva.zona}
                      titulo="Tu mesa en el plano del local"
                      subtitulo="Salón interior y terraza. El equipo recibe la misma referencia en panel."
                      variant="showcase"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="section-lead">
                  Tu cuenta está lista. Consulta la carta y reserva tu mesa cuando lo necesites.
                </p>
              </>
            )}

            <div className="confirmation__actions">
              {flow === "reserva" ? (
                <>
                  <Link to="/" className="btn btn--primary">
                    Ir al inicio
                  </Link>
                  {puedeReservar ? (
                    <Link to="/reservar" className="btn btn--outline-dark">
                      Nueva reserva
                    </Link>
                  ) : (
                    <Link to="/login" state={{ from: "/reservar" }} className="btn btn--outline-dark">
                      Iniciar sesión
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn btn--primary"
                    state={location.state?.funnel === "pedido" ? { funnel: "pedido", from: "/reservar" } : undefined}
                  >
                    Ir al login y continuar
                  </Link>
                  <Link to="/register" className="btn btn--outline-dark">
                    Registrar otra cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
