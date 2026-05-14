import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SalonMap from "../../components/SalonMap";
import SalonFloorPlan from "../../components/SalonFloorPlan";
import StepFlow from "../../components/StepFlow";
import { mesasDisponibles, mesasOcupadas, TURNOS, ZONAS } from "../../data/salon";
import { useReservations } from "../../context/ReservationsContext";

const STEPS = ["Turno", "Mesa", "Detalle", "Confirmación"];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservarMesa() {
  const navigate = useNavigate();
  const { reservas, createReservation, ready } = useReservations();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    cliente: "",
    telefono: "",
    fecha: getToday(),
    hora: "19:00",
    personas: 2,
    zona: "Salón principal",
    mesa: "",
    notas: "",
    idiomaPreferido: "",
    ocasion: "",
    restriccionAlimentaria: "",
    referenciaHotel: "",
    horaLlegadaEstimada: "",
    depositoPagado: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const disponibles = useMemo(
    () => mesasDisponibles(reservas, form),
    [reservas, form],
  );
  const ocupadas = useMemo(() => mesasOcupadas(reservas, form.fecha, form.hora), [reservas, form.fecha, form.hora]);

  useEffect(() => {
    if (!form.mesa) return;
    if (!disponibles.some((mesa) => mesa.codigo === form.mesa)) {
      setForm((prev) => ({ ...prev, mesa: "" }));
    }
  }, [disponibles, form.mesa]);

  const handleChange = (key, value) => {
    setError("");
    if (key === "notas" && String(value).length > 200) return;
    if (key === "restriccionAlimentaria" && String(value).length > 120) return;
    if (key === "referenciaHotel" && String(value).length > 120) return;
    if (key === "ocasion" && String(value).length > 80) return;
    if (key === "idiomaPreferido" && String(value).length > 40) return;
    if (key === "horaLlegadaEstimada" && String(value).length > 24) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validarTurno = () => {
    if (!form.cliente?.trim() || !String(form.telefono).trim() || !form.fecha || !form.hora) {
      return "Completa nombre, teléfono, fecha y hora.";
    }
    if (form.cliente.trim().length < 3) {
      return "El nombre del cliente debe tener al menos 3 caracteres.";
    }
    if (!/^[0-9]{9}$/.test(String(form.telefono).trim())) {
      return "El teléfono debe tener exactamente 9 dígitos.";
    }
    const personasNum = Number(form.personas);
    if (form.personas === "" || Number.isNaN(personasNum) || !Number.isInteger(personasNum) || personasNum < 1 || personasNum > 8) {
      return "La cantidad de personas debe ser un número entero entre 1 y 8.";
    }
    if (!disponibles.length) {
      return "No hay mesas disponibles para ese turno. Prueba otra hora o zona.";
    }
    return "";
  };

  const avanzar = () => {
    if (step === 0) {
      const turnoError = validarTurno();
      if (turnoError) {
        setError(turnoError);
        return;
      }
    }
    if (step === 1 && !form.mesa) {
      setError("Selecciona una mesa para continuar.");
      return;
    }
    setError("");
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const retroceder = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      avanzar();
      return;
    }
    if (!form.depositoPagado) {
      setError("Confirma el depósito de S/ 20 para separar la mesa.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const nueva = await createReservation({
        ...form,
        cliente: form.cliente.trim(),
        telefono: String(form.telefono).trim(),
        notas: String(form.notas ?? "").trim().slice(0, 200),
        personas: Number(form.personas),
        mesa: form.mesa,
        depositoPagado: true,
      });
      navigate("/confirmacion", { state: { flow: "reserva", reserva: nueva } });
    } catch (err) {
      setError(err?.message || "No se pudo guardar la reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="container container--wide">
        <div className="booking">
          <div className="booking-page__head booking__intro">
          <p className="eyebrow">Reserva en sala · minimuestra</p>
          <h1 className="section-title">Tu mesa en TRES REGIONES</h1>
          <p className="section-lead">
            Flujo profesional para turismo presencial en Lima: turno, mapa de sala y confirmación con política clara.
            Datos ampliados e integraciones en la versión comercial.
          </p>
        </div>

        <StepFlow steps={STEPS} current={step} />

        {!ready && (
          <p className="loading-inline booking__loading">Sincronizando disponibilidad de mesas…</p>
        )}

        <form className="booking__panel card card--pad" onSubmit={handleSubmit}>
          {step === 0 && (
          <section className="booking__section">
            <h2>1. Define tu visita</h2>
            <p>Indica cuándo llegas, cuántos comensales son y en qué ambiente prefieres sentarte.</p>
            <div className="booking__grid booking__grid--2">
              <div className="field">
                <label className="label">Nombre del visitante<span className="req">*</span></label>
                <input className="input" value={form.cliente} onChange={(e) => handleChange("cliente", e.target.value)} disabled={!ready} maxLength={80} />
              </div>
              <div className="field">
                <label className="label">Teléfono<span className="req">*</span></label>
                <input className="input" value={form.telefono} onChange={(e) => handleChange("telefono", e.target.value.replace(/\D/g, "").slice(0, 9))} disabled={!ready} inputMode="numeric" />
              </div>
            </div>
            <div className="booking__grid booking__grid--4">
              <div className="field">
                <label className="label">Fecha<span className="req">*</span></label>
                <input type="date" className="input" value={form.fecha} onChange={(e) => handleChange("fecha", e.target.value)} min={getToday()} disabled={!ready} />
              </div>
              <div className="field">
                <label className="label">Turno<span className="req">*</span></label>
                <select className="input" value={form.hora} onChange={(e) => handleChange("hora", e.target.value)} disabled={!ready}>
                  {TURNOS.map((hora) => (
                    <option key={hora} value={hora}>{hora}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Personas<span className="req">*</span></label>
                <input type="number" min={1} max={8} className="input" value={form.personas} onChange={(e) => handleChange("personas", e.target.value === "" ? "" : Number(e.target.value))} disabled={!ready} />
              </div>
              <div className="field">
                <label className="label">Ambiente<span className="req">*</span></label>
                <select className="input" value={form.zona} onChange={(e) => handleChange("zona", e.target.value)} disabled={!ready}>
                  {ZONAS.map((zona) => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="booking__section">
            <h2>2. Elige tu mesa</h2>
            <p>Visualiza la sala y selecciona la mesa que prefieres para tu experiencia presencial.</p>
            <SalonMap
              zona={form.zona}
              personas={form.personas}
              ocupadas={ocupadas}
              seleccionada={form.mesa}
              onSelect={(mesa) => handleChange("mesa", mesa)}
              disponibles={disponibles}
            />
          </section>
        )}

        {step === 2 && (
          <section className="booking__section">
            <h2>3. Personaliza la visita</h2>
            <p>Comparte preferencias de viaje, alergias y detalles que el equipo debe conocer antes de recibirte.</p>
            <div className="booking__grid booking__grid--2">
              <div className="field">
                <label className="label">Idioma preferido</label>
                <input className="input" value={form.idiomaPreferido} onChange={(e) => handleChange("idiomaPreferido", e.target.value)} disabled={!ready} maxLength={40} />
              </div>
              <div className="field">
                <label className="label">Ocasión</label>
                <input className="input" value={form.ocasion} onChange={(e) => handleChange("ocasion", e.target.value)} disabled={!ready} maxLength={80} />
              </div>
              <div className="field">
                <label className="label">Hotel o referencia</label>
                <input className="input" value={form.referenciaHotel} onChange={(e) => handleChange("referenciaHotel", e.target.value)} disabled={!ready} maxLength={120} />
              </div>
              <div className="field">
                <label className="label">Llegada estimada</label>
                <input className="input" value={form.horaLlegadaEstimada} onChange={(e) => handleChange("horaLlegadaEstimada", e.target.value)} disabled={!ready} maxLength={24} />
              </div>
            </div>
            <div className="field">
              <label className="label">Restricciones alimentarias / alergias</label>
              <textarea className="input" rows={2} value={form.restriccionAlimentaria} onChange={(e) => handleChange("restriccionAlimentaria", e.target.value)} disabled={!ready} maxLength={120} />
            </div>
            <div className="field">
              <label className="label">Notas para el anfitrión</label>
              <textarea className="input" rows={3} value={form.notas} onChange={(e) => handleChange("notas", e.target.value)} disabled={!ready} maxLength={200} />
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="booking__section">
            <h2>4. Confirma tu separación</h2>
            <div className="booking__summary">
              <p><strong>{form.cliente}</strong> · {form.telefono}</p>
              <p>{form.fecha} · {form.hora} · {form.personas} personas</p>
              <p>Mesa <strong>{form.mesa}</strong> · {form.zona}</p>
              {form.ocasion && <p>Ocasión: {form.ocasion}</p>}
              {form.referenciaHotel && <p>Referencia: {form.referenciaHotel}</p>}
            </div>
            {form.mesa ? (
              <div className="booking__floor-wow card card--pad">
                <SalonFloorPlan
                  key={`${form.mesa}-${form.zona}`}
                  mesaDestacada={form.mesa}
                  zonaDefault={form.zona}
                  titulo="Así queda tu mesa en el plano"
                  subtitulo="Mismo esquema que recibirás en la confirmación. Ideal para enseñar en demo a socios e inversionistas."
                  variant="inline"
                />
              </div>
            ) : null}
            <div className="policy-card">
              <strong>Política presencial</strong>
              <ul>
                <li>Depósito de <strong>S/ 20</strong> para separar la mesa en sala.</li>
                <li>Si no asistes en la fecha y turno reservados, la mesa se libera y el depósito no se reembolsa.</li>
                <li>Reprogramaciones se coordinan con el restaurante desde el panel administrativo.</li>
              </ul>
            </div>
            <label className="policy-check">
              <input type="checkbox" checked={form.depositoPagado} onChange={(e) => handleChange("depositoPagado", e.target.checked)} disabled={!ready} />
              <span>Confirmo el depósito de S/ 20 y acepto la política de asistencia presencial.</span>
            </label>
          </section>
        )}

        {error && <div className="error">{error}</div>}

        <div className="booking__actions">
          {step > 0 && (
            <button type="button" className="btn btn--surface" onClick={retroceder} disabled={submitting}>
              Atrás
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={!ready || submitting}>
            {submitting ? "Guardando…" : step === STEPS.length - 1 ? "Confirmar reserva" : "Continuar"}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}
