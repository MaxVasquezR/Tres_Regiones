import { Link, useLocation } from "react-router-dom";
import { haySesionCliente } from "../../session";

export default function Confirmacion() {
  const location = useLocation();
  const puedeReservar = haySesionCliente();
  const flow = location.state?.flow === "reserva" ? "reserva" : "registro";
  const reserva = location.state?.reserva;

  return (
    <div className="confirmation">
      <div className="confirmation__ticket card card--pad">
        <p className="eyebrow">{flow === "reserva" ? "Reserva presencial confirmada" : "Cuenta creada"}</p>
        <h1 className="section-title">{flow === "reserva" ? "Tu mesa quedó registrada" : "Bienvenido a TRES REGIONES"}</h1>

        {flow === "reserva" ? (
          <>
            <p className="section-lead">
              El restaurante recibió tu separación con depósito de <strong>S/ 20</strong>. Presenta esta confirmación al
              llegar al local; no aplica delivery ni recojo.
            </p>
            {reserva && (
              <div className="confirmation__summary">
                <p><strong>{reserva.cliente}</strong> · {reserva.telefono}</p>
                <p>{reserva.fecha} · {reserva.hora} · {reserva.personas} personas</p>
                <p>Mesa <strong>{reserva.mesa}</strong> · {reserva.zona}</p>
                <p>Depósito <strong>S/ {reserva.depositoSoles ?? 20}</strong> {reserva.depositoPagado ? "registrado" : "pendiente"}</p>
                {reserva.ocasion && <p>Ocasión: {reserva.ocasion}</p>}
                {reserva.referenciaHotel && <p>Referencia: {reserva.referenciaHotel}</p>}
              </div>
            )}
          </>
        ) : (
          <p className="section-lead">
            Tu cuenta quedó lista. Inicia sesión para reservar mesa, elegir ambiente y personalizar tu visita presencial.
          </p>
        )}

        <div className="confirmation__actions">
          {flow === "reserva" ? (
            <>
              <Link to="/" className="btn btn--primary">Volver al inicio</Link>
              {puedeReservar ? (
                <Link to="/reservar" className="btn">Nueva reserva</Link>
              ) : (
                <Link to="/login" state={{ from: "/reservar" }} className="btn">Iniciar sesión</Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--primary">Ir al login</Link>
              <Link to="/" className="btn">Volver al inicio</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
