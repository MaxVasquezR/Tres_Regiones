import { useEffect, useState } from "react";
import { apiGet } from "../../api";

const localDefault = {
  nombre: "TRES REGIONES",
  telefono: "987 654 321",
  direccion: "Av. Principal 123, Lima",
  horario: "Lunes a domingo · 12:00 – 22:00",
  descripcion: "Restaurante de comida típica peruana con reservas en línea.",
  cocina: "Peruana",
  estadoLocal: "Abierto",
  capacidadAprox: "68 comensales",
  zonas: ["Salón principal", "Terraza", "Bar"],
};

export default function PerfilLocal() {
  const [data, setData] = useState(localDefault);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await apiGet("/api/local");
        if (!cancelled && json.data && typeof json.data === "object") setData({ ...localDefault, ...json.data });
      } catch {
        if (!cancelled) setData(localDefault);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 6, color: "var(--brand-700)" }}>Perfil del local</h1>
          <p>Información visible para el equipo y canales públicos del restaurante.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span
            className="card"
            style={{
              padding: "10px 12px",
              borderRadius: 999,
              background: "rgba(183, 28, 28, 0.06)",
              borderColor: "rgba(183, 28, 28, 0.14)",
            }}
          >
            Cocina: {data.cocina}
          </span>
          <span
            className="card"
            style={{
              padding: "10px 12px",
              borderRadius: 999,
              background: "rgba(201, 162, 39, 0.08)",
              borderColor: "rgba(201, 162, 39, 0.18)",
            }}
          >
            Estado: {String(data.estadoLocal || "").toLowerCase()}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div className="card card--pad">
          <h3 style={{ marginBottom: 12 }}>Datos del local</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <span className="label">Nombre</span>
              <div className="input" style={{ display: "flex", alignItems: "center" }}>
                {data.nombre}
              </div>
            </div>

            <div className="field">
              <span className="label">Teléfono</span>
              <div className="input" style={{ display: "flex", alignItems: "center" }}>
                {data.telefono}
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Dirección</span>
              <div className="input" style={{ display: "flex", alignItems: "center" }}>
                {data.direccion}
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Horario</span>
              <div className="input" style={{ display: "flex", alignItems: "center" }}>
                {data.horario}
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Descripción</span>
              <div className="input" style={{ display: "flex", alignItems: "center", minHeight: 48 }}>
                {data.descripcion}
              </div>
            </div>

            {data.capacidadAprox && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="label">Capacidad aproximada</span>
                <div className="input" style={{ display: "flex", alignItems: "center" }}>
                  {data.capacidadAprox}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" className="btn btn--primary" disabled>
              Editar perfil
            </button>
            <button type="button" className="btn" style={{ background: "#fff", borderColor: "var(--border)" }} disabled>
              Guardar cambios
            </button>
          </div>
        </div>

        <div className="card card--pad">
          <h3 style={{ marginBottom: 12 }}>Identidad</h3>
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(183, 28, 28, 0.10), rgba(201, 162, 39, 0.10))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, var(--brand-700), var(--brand-600))",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontWeight: 900,
                }}
              >
                SI
              </div>
              <div>
                <strong>{data.nombre}</strong>
                <p style={{ fontSize: 13 }}>Comida típica · Lima</p>
              </div>
            </div>
          </div>

          {Array.isArray(data.zonas) && data.zonas.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ marginBottom: 8 }}>Zonas</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.zonas.map((z) => (
                  <span key={z} className="badge badge--warn">
                    {z}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
