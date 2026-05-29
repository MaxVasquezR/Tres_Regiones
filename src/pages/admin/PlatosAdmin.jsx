import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api";

const CATEGORIAS = ["Entradas", "Clásicos", "Norte", "Mar", "Especiales", "Postres"];

const emptyForm = () => ({
  nombre: "",
  descripcion: "",
  precio: "S/ 0.00",
  categoria: "Clásicos",
  imagen: "",
  disponible: true,
});

export default function PlatosAdmin() {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(() => emptyForm());
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiGet("/api/platos");
      setPlatos(json.data || []);
    } catch (e) {
      setMsg(e?.message || "Error al cargar carta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId(null);
  };

  const editar = (p) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      precio: p.precio,
      categoria: p.categoria,
      imagen: p.imagen || "",
      disponible: p.disponible !== false,
    });
    setMsg("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (editId) {
        await apiPatch(`/api/platos/${editId}`, form, { auth: true });
        setMsg("Plato actualizado.");
      } else {
        await apiPost("/api/platos", form, { auth: true });
        setMsg("Plato creado.");
      }
      resetForm();
      await cargar();
    } catch (err) {
      setMsg(err?.message || "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este plato del menú?")) return;
    setBusy(true);
    try {
      await apiDelete(`/api/platos/${id}`, { auth: true });
      if (editId === id) resetForm();
      await cargar();
      setMsg("Plato eliminado.");
    } catch (err) {
      setMsg(err?.message || "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-platos">
      <header className="admin-page-head">
        <div>
          <p className="eyebrow">Carta</p>
          <h1>Gestión de platos</h1>
          <p className="admin-page-head__lead">Precios, categorías y disponibilidad para sala y carta digital.</p>
        </div>
      </header>

      {msg && <p className="form-msg">{msg}</p>}

      <div className="admin-platos__grid">
        <form className="card card--pad admin-platos__form" onSubmit={guardar}>
          <h2 className="section-title" style={{ fontSize: "1.1rem" }}>
            {editId ? "Editar plato" : "Nuevo plato"}
          </h2>
          <div className="field">
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Precio</label>
              <input className="input" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="S/ 28.00" required />
            </div>
            <div className="field">
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">URL imagen (opcional)</label>
            <input className="input" value={form.imagen} onChange={(e) => setForm({ ...form, imagen: e.target.value })} />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.disponible} onChange={(e) => setForm({ ...form, disponible: e.target.checked })} />
            Disponible en carta
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {editId ? "Guardar cambios" : "Agregar plato"}
            </button>
            {editId && (
              <button type="button" className="btn btn--surface" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="admin-platos__lista">
          {loading ? (
            <p className="muted">Cargando…</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {platos.map((p) => (
                    <tr key={p.id} className={p.disponible === false ? "ops-table__row--muted" : ""}>
                      <td>
                        <strong>{p.nombre}</strong>
                        {p.disponible === false && <span className="badge badge--danger" style={{ marginLeft: 8 }}>Agotado</span>}
                      </td>
                      <td>{p.categoria}</td>
                      <td>{p.precio}</td>
                      <td className="ops-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => editar(p)}>Editar</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void eliminar(p.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
