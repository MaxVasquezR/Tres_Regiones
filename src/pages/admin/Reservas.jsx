import { useEffect, useMemo, useState } from "react";
import { useReservations } from "../../context/ReservationsContext";

const CANALES = ["Web", "Mostrador", "Teléfono", "Agencia", "OTAs", "Evento"];

function estadoClass(estado) {
  if (estado === "Confirmada") return "badge badge--ok";
  if (estado === "Cancelada") return "badge badge--danger";
  if (estado === "Atendida") return "badge badge--ok";
  if (estado === "No show") return "badge badge--danger";
  return "badge badge--warn";
}

function depositoLabel(r) {
  const m = Number(r.depositoSoles ?? 20);
  if (r.depositoPagado) return `S/ ${m} · Cobrado`;
  return `S/ ${m} · Pendiente`;
}

export default function Reservas() {
  const {
    reservas,
    updateReservationStatus,
    updateReservationDetails,
    deleteReservation,
    ready,
  } = useReservations();
  const [filtro, setFiltro] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [detailMsg, setDetailMsg] = useState("");

  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const r = reservas.find((x) => x.id === selectedId);
    if (r) setDraft((prev) => (prev && prev.id === selectedId ? prev : { ...r }));
  }, [selectedId, reservas]);

  const cambiarEstado = async (id, estado) => {
    setListError("");
    setUpdatingId(id);
    try {
      await updateReservationStatus(id, estado);
    } catch (err) {
      setListError(err?.message || "No se pudo actualizar el estado.");
    } finally {
      setUpdatingId(null);
    }
  };

  const data = useMemo(() => {
    return reservas.filter((item) => {
      const byEstado = filtro === "Todos" ? true : item.estado === filtro;
      const q = busqueda.trim().toLowerCase();
      const byQ =
        !q ||
        String(item.cliente ?? "")
          .toLowerCase()
          .includes(q) ||
        String(item.telefono ?? "")
          .toLowerCase()
          .includes(q) ||
        String(item.mesa ?? "")
          .toLowerCase()
          .includes(q) ||
        String(item.referenciaHotel ?? "")
          .toLowerCase()
          .includes(q);
      return byEstado && byQ;
    });
  }, [reservas, filtro, busqueda]);

  const guardarDetalle = async () => {
    if (!draft) return;
    setDetailMsg("");
    setUpdatingId(draft.id);
    try {
      const patch = {
        estado: draft.estado,
        notasInternas: draft.notasInternas ?? "",
        canal: draft.canal,
        idiomaPreferido: draft.idiomaPreferido ?? "",
        ocasion: draft.ocasion ?? "",
        restriccionAlimentaria: draft.restriccionAlimentaria ?? "",
        referenciaHotel: draft.referenciaHotel ?? "",
        horaLlegadaEstimada: draft.horaLlegadaEstimada ?? "",
        notas: draft.notas ?? "",
        depositoPagado: !!draft.depositoPagado,
        depositoSoles: Number(draft.depositoSoles) || 20,
        cliente: draft.cliente,
        telefono: draft.telefono,
        personas: draft.personas,
        zona: draft.zona,
      };
      const actualizada = await updateReservationDetails(draft.id, patch);
      setDraft({ ...actualizada });
      setDetailMsg("Cambios guardados.");
    } catch (err) {
      setDetailMsg(err?.message || "No se pudo guardar.");
    } finally {
      setUpdatingId(null);
    }
  };

  const eliminarReserva = async () => {
    if (!draft || !window.confirm("¿Eliminar esta reserva del sistema? Esta acción no se puede deshacer.")) return;
    setDetailMsg("");
    setUpdatingId(draft.id);
    try {
      await deleteReservation(draft.id);
      setSelectedId(null);
      setDraft(null);
      setDetailMsg("");
    } catch (err) {
      setDetailMsg(err?.message || "No se pudo eliminar.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "16px", color: "var(--brand-700)" }}>Reservas</h1>
      <p style={{ marginBottom: 14 }}>
        Control total de la agenda: estados operativos, datos de turismo, depósitos y notas internas de sala.
      </p>

      {!ready && (
        <p className="loading-inline" style={{ marginBottom: 14 }}>
          Cargando reservas…
        </p>
      )}

      {listError && <div className="error" style={{ marginBottom: 14 }}>{listError}</div>}

      <div className="card card--pad" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Buscar cliente, teléfono, mesa, hotel…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select className="input" style={{ maxWidth: 180 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option>Todos</option>
            <option>Pendiente</option>
            <option>Confirmada</option>
            <option>Atendida</option>
            <option>No show</option>
            <option>Cancelada</option>
          </select>
        </div>
      </div>

      <div className="card card--pad">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Pax</th>
                <th>Mesa</th>
                <th>Canal</th>
                <th>Depósito</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((reserva) => (
                <tr key={reserva.id} style={{ background: selectedId === reserva.id ? "rgba(201, 162, 39, 0.08)" : undefined }}>
                  <td>{String(reserva.id).slice(-4)}</td>
                  <td>
                    <strong>{reserva.cliente}</strong>
                    <br />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{reserva.telefono}</span>
                  </td>
                  <td>{reserva.fecha}</td>
                  <td>{reserva.hora}</td>
                  <td>{reserva.personas}</td>
                  <td>{reserva.mesa}</td>
                  <td>{reserva.canal || "Web"}</td>
                  <td style={{ fontSize: 13 }}>{depositoLabel(reserva)}</td>
                  <td>
                    <span className={estadoClass(reserva.estado)}>{reserva.estado}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 8px", fontSize: 13 }}
                        disabled={!ready}
                        onClick={() => {
                          setSelectedId(reserva.id);
                          setDraft({ ...reserva });
                          setDetailMsg("");
                        }}
                      >
                        Gestionar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 8px", fontSize: 13 }}
                        disabled={!ready || updatingId === reserva.id}
                        onClick={() => cambiarEstado(reserva.id, "Confirmada")}
                      >
                        Conf.
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 8px", fontSize: 13 }}
                        disabled={!ready || updatingId === reserva.id}
                        onClick={() => cambiarEstado(reserva.id, "No show")}
                      >
                        No show
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 8px", fontSize: 13 }}
                        disabled={!ready || updatingId === reserva.id}
                        onClick={() => cambiarEstado(reserva.id, "Atendida")}
                      >
                        Atendida
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "6px 8px", fontSize: 13 }}
                        disabled={!ready || updatingId === reserva.id}
                        onClick={() => cambiarEstado(reserva.id, "Cancelada")}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <div className="card card--pad" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12, color: "var(--brand-700)" }}>Ficha de reserva · ID {draft.id}</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
            No show = mesa liberada; el depósito registrado no se reembolsa de forma automática. Usa notas internas para acuerdos con
            agencias u hoteles.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div className="field">
              <label className="label">Estado</label>
              <select
                className="input"
                value={draft.estado}
                onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value }))}
              >
                {["Pendiente", "Confirmada", "Cancelada", "Atendida", "No show"].map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Canal</label>
              <select
                className="input"
                value={draft.canal || "Web"}
                onChange={(e) => setDraft((d) => ({ ...d, canal: e.target.value }))}
              >
                {CANALES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Depósito (S/)</label>
              <input
                type="number"
                min={0}
                max={500}
                className="input"
                value={draft.depositoSoles ?? 20}
                onChange={(e) => setDraft((d) => ({ ...d, depositoSoles: Number(e.target.value) }))}
              />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.depositoPagado}
                  onChange={(e) => setDraft((d) => ({ ...d, depositoPagado: e.target.checked }))}
                />
                Depósito cobrado / registrado
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <div className="field">
              <label className="label">Cliente</label>
              <input className="input" value={draft.cliente} onChange={(e) => setDraft((d) => ({ ...d, cliente: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={draft.telefono}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) }))
                }
              />
            </div>
            <div className="field">
              <label className="label">Personas</label>
              <input
                type="number"
                min={1}
                max={8}
                className="input"
                value={draft.personas}
                onChange={(e) => setDraft((d) => ({ ...d, personas: Number(e.target.value) }))}
              />
            </div>
            <div className="field">
              <label className="label">Zona</label>
              <select
                className="input"
                value={draft.zona}
                onChange={(e) => setDraft((d) => ({ ...d, zona: e.target.value }))}
              >
                <option>Salón principal</option>
                <option>Terraza</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <div className="field">
              <label className="label">Idioma preferido</label>
              <input
                className="input"
                value={draft.idiomaPreferido ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, idiomaPreferido: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">Ocasión</label>
              <input className="input" value={draft.ocasion ?? ""} onChange={(e) => setDraft((d) => ({ ...d, ocasion: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Hotel / referencia</label>
              <input
                className="input"
                value={draft.referenciaHotel ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, referenciaHotel: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">Llegada estimada</label>
              <input
                className="input"
                value={draft.horaLlegadaEstimada ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, horaLlegadaEstimada: e.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Restricciones / alergias (vista cliente)</label>
            <textarea
              className="input"
              rows={2}
              value={draft.restriccionAlimentaria ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, restriccionAlimentaria: e.target.value }))}
            />
          </div>

          <div className="field">
            <label className="label">Notas del cliente</label>
            <textarea
              className="input"
              rows={2}
              value={draft.notas ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
            />
          </div>

          <div className="field">
            <label className="label">Notas internas (solo personal)</label>
            <textarea
              className="input"
              rows={3}
              value={draft.notasInternas ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notasInternas: e.target.value }))}
              placeholder="Acuerdos con agencia, facturación, incidencias en sala…"
            />
          </div>

          {detailMsg && (
            <p
              style={{
                fontSize: 14,
                marginBottom: 10,
                color:
                  detailMsg.includes("Error") || detailMsg.includes("No se") || detailMsg.includes("No se pudo")
                    ? "#b71c1c"
                    : "#166534",
              }}
            >
              {detailMsg}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn--primary" disabled={updatingId === draft.id} onClick={() => void guardarDetalle()}>
              {updatingId === draft.id ? "Guardando…" : "Guardar ficha"}
            </button>
            <button type="button" className="btn" disabled={updatingId === draft.id} onClick={() => void eliminarReserva()}>
              Eliminar reserva
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelectedId(null);
                setDraft(null);
                setDetailMsg("");
              }}
            >
              Cerrar ficha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
