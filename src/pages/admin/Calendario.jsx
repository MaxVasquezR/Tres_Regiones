import { useMemo, useState } from "react";
import { useReservations } from "../../context/ReservationsContext";

function formatMonth(date) {
  return date.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}

function monthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekDay = (first.getDay() + 6) % 7;
  const total = last.getDate();
  const cells = [];

  for (let i = 0; i < startWeekDay; i += 1) cells.push(null);
  for (let day = 1; day <= total; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

function keyDate(date) {
  return date.toISOString().slice(0, 10);
}

export default function Calendario() {
  const { reservas } = useReservations();
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const cells = useMemo(() => monthGrid(current), [current]);
  const reservasPorDia = useMemo(() => {
    const map = new Map();
    reservas.forEach((item) => {
      if (item.estado === "Cancelada") return;
      map.set(item.fecha, (map.get(item.fecha) || 0) + 1);
    });
    return map;
  }, [reservas]);
  const reservasSeleccionadas = useMemo(() => {
    if (!selectedDate) return [];
    return reservas
      .filter((r) => r.fecha === selectedDate)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [reservas, selectedDate]);

  const prevMonth = () =>
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 6, color: "var(--brand-700)" }}>Calendario</h1>
          <p>Agenda mensual de reservas</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={prevMonth}>Mes anterior</button>
          <button className="btn" onClick={nextMonth}>Mes siguiente</button>
        </div>
      </div>

      <div className="card card--pad" style={{ marginTop: 14 }}>
        <h3 style={{ textTransform: "capitalize", marginBottom: 12 }}>{formatMonth(current)}</h3>
        <div className="calendar-grid">
          {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((d) => (
            <div key={d} className="calendar-head">{d}</div>
          ))}
          {cells.map((date, idx) => {
            if (!date) return <div key={`e-${idx}`} className="calendar-cell calendar-cell--empty" />;
            const count = reservasPorDia.get(keyDate(date)) || 0;
            return (
              <button
                type="button"
                key={keyDate(date)}
                className="calendar-cell"
                style={{
                  cursor: "pointer",
                  borderColor: selectedDate === keyDate(date) ? "var(--brand-700)" : undefined,
                }}
                onClick={() => setSelectedDate(keyDate(date))}
              >
                <div className="calendar-day">{date.getDate()}</div>
                <div className={`badge ${count >= 4 ? "badge--warn" : "badge--ok"}`}>
                  {count} reservas
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card card--pad" style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 10 }}>
          {selectedDate ? `Detalle del ${selectedDate}` : "Selecciona un día del calendario"}
        </h3>
        {!selectedDate && <p>Haz click en un día para ver el detalle de turnos y estado.</p>}
        {selectedDate && reservasSeleccionadas.length === 0 && (
          <p>No hay reservas registradas para esta fecha.</p>
        )}
        {selectedDate && reservasSeleccionadas.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Mesa</th>
                  <th>Pax</th>
                  <th>Canal</th>
                  <th>Depósito</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservasSeleccionadas.map((r) => (
                  <tr key={r.id}>
                    <td>{r.hora}</td>
                    <td>
                      {r.cliente ?? "—"}
                      {r.referenciaHotel ? (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.referenciaHotel}</div>
                      ) : null}
                    </td>
                    <td>{r.mesa}</td>
                    <td>{r.personas}</td>
                    <td>{r.canal || "—"}</td>
                    <td style={{ fontSize: 12 }}>
                      {r.depositoPagado ? `S/${r.depositoSoles ?? 20}` : `S/${r.depositoSoles ?? 20} (pend.)`}
                    </td>
                    <td>{r.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}