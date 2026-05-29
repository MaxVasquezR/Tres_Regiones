import { useState, useEffect } from "react";
import { apiGet, apiPatch } from "../../api";

export default function MenuDelDia() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activo, setActivo] = useState(false);
  const [precioSoles, setPrecioSoles] = useState("");
  const [entrada, setEntrada] = useState("");
  const [fondo, setFondo] = useState("");
  const [bebida, setBebida] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet("/api/menu-del-dia");
        const m = res.data;
        setMenu(m);
        setActivo(Boolean(m.activo));
        setPrecioSoles(m.precioSoles?.toString() || "18");
        setEntrada(m.entrada || "");
        setFondo(m.fondo || "");
        setBebida(m.bebida || "");
        setDescripcion(m.descripcion || "");
      } catch (err) {
        setError(err?.message || "No se pudo cargar el menú del día.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const precio = Number(precioSoles);
    if (!Number.isFinite(precio) || precio <= 0) {
      setError("El precio debe ser un número positivo.");
      return;
    }
    if (activo && (!fondo.trim() || !entrada.trim())) {
      setError("Para activar el menú del día, indica al menos la entrada y el fondo.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiPatch(
        "/api/menu-del-dia",
        { activo, precioSoles: precio, entrada: entrada.trim(), fondo: fondo.trim(), bebida: bebida.trim(), descripcion: descripcion.trim() },
        { auth: true },
      );
      setMenu(res.data);
      setSuccess("Menú del día actualizado.");
    } catch (err) {
      setError(err?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-content"><p>Cargando…</p></div>;

  return (
    <div className="page-content">
      <div className="page-head">
        <h1 className="page-title">Menú del día</h1>
        <p className="page-subtitle">
          El menú del día aparece como primera categoría en la pantalla del mozo, destacado con precio fijo.
        </p>
      </div>

      <div className="card card--pad" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSave}>
          <div className="field">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <span>Activar menú del día hoy</span>
            </label>
          </div>

          <div className="field">
            <label className="label">Precio del menú (S/)<span className="req">*</span></label>
            <input
              type="number"
              className="input"
              min="1"
              max="200"
              step="0.5"
              value={precioSoles}
              onChange={(e) => setPrecioSoles(e.target.value)}
              placeholder="18.00"
            />
          </div>

          <div className="field">
            <label className="label">Entrada<span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Causa limeña, sopa criolla…"
              maxLength={120}
            />
          </div>

          <div className="field">
            <label className="label">Fondo (plato principal)<span className="req">*</span></label>
            <input
              type="text"
              className="input"
              value={fondo}
              onChange={(e) => setFondo(e.target.value)}
              placeholder="Ají de gallina, lomo saltado…"
              maxLength={120}
            />
          </div>

          <div className="field">
            <label className="label">Bebida</label>
            <input
              type="text"
              className="input"
              value={bebida}
              onChange={(e) => setBebida(e.target.value)}
              placeholder="Chicha morada, refresco…"
              maxLength={80}
            />
          </div>

          <div className="field">
            <label className="label">Nota adicional (opcional)</label>
            <input
              type="text"
              className="input"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Incluye postre, hasta las 3pm…"
              maxLength={300}
            />
          </div>

          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="success-msg" style={{ marginBottom: 12 }}>{success}</div>}

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar menú del día"}
          </button>
        </form>

        {menu?.activo && (
          <div className="menu-del-dia-preview" style={{ marginTop: 24, padding: "16px", background: "var(--gold-100)", borderRadius: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Vista previa · Menú del día activo</p>
            <p><strong>Entrada:</strong> {menu.entrada || "—"}</p>
            <p><strong>Fondo:</strong> {menu.fondo || "—"}</p>
            <p><strong>Bebida:</strong> {menu.bebida || "—"}</p>
            <p><strong>Precio:</strong> S/ {Number(menu.precioSoles).toFixed(2)}</p>
            {menu.descripcion && <p style={{ marginTop: 4, color: "var(--muted)" }}>{menu.descripcion}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
