import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api";

const cuentasLocal = [
  { id: 1, nombre: "Valeria Quispe", correo: "valeria@mail.com", rol: "Cliente", estado: "Activo" },
  { id: 2, nombre: "Diego Huamán", correo: "diego@mail.com", rol: "Cliente", estado: "Activo" },
  { id: 3, nombre: "Carlos Ramos", correo: "c.ramos@sazon.pe", rol: "Administrador", estado: "Activo" },
  { id: 4, nombre: "Ana Torres", correo: "ana@mail.com", rol: "Cliente", estado: "Inactivo" },
  { id: 5, nombre: "Mayra Cliente", correo: "cliente@sazon.com", rol: "Cliente", estado: "Activo" },
];

const emptyNueva = { nombre: "", correo: "", telefono: "", rol: "Cliente", estado: "Activo", contrasena: "" };

export default function Cuentas() {
  const [cuentas, setCuentas] = useState(cuentasLocal);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [nueva, setNueva] = useState(emptyNueva);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    rol: "Cliente",
    estado: "Activo",
    contrasena: "",
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const json = await apiGet("/api/cuentas", { auth: true });
      if (Array.isArray(json.data) && json.data.length) {
        setCuentas(json.data);
      } else {
        setCuentas(cuentasLocal);
      }
    } catch {
      setCuentas(cuentasLocal);
      setMsg("No se pudo cargar la API (¿sesión admin?). Mostrando datos locales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearCuenta = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const tel = nueva.telefono.replace(/\D/g, "").slice(0, 9);
    const pw = nueva.contrasena.trim();
    if (nueva.rol === "Cliente") {
      if (pw.length > 0 && pw.length < 6) {
        setMsg("Si asignas contraseña manual, debe tener al menos 6 caracteres. Si no, deja el campo vacío y usa solo el celular (9 dígitos).");
        setSaving(false);
        return;
      }
      if (pw.length === 0 && tel.length !== 9) {
        setMsg("Cliente web: indica un celular peruano de 9 dígitos (será su clave al iniciar sesión) o una contraseña de al menos 6 caracteres.");
        setSaving(false);
        return;
      }
    }
    try {
      const body = {
        nombre: nueva.nombre.trim(),
        correo: nueva.correo.trim(),
        rol: nueva.rol,
        estado: nueva.estado,
        ...(pw.length > 0 ? { contrasena: pw } : {}),
        ...(nueva.rol === "Cliente" && tel.length === 9 ? { telefono: tel } : {}),
      };
      await apiPost("/api/cuentas", body, { auth: true });
      setNueva(emptyNueva);
      setMsg("Cuenta creada.");
      await cargar();
    } catch (err) {
      setMsg(err?.message || "No se pudo crear la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicion = (c) => {
    setEditId(c.id);
    setEditForm({
      nombre: c.nombre,
      correo: c.correo,
      telefono: String(c.telefono ?? "").replace(/\D/g, "").slice(0, 9),
      rol: c.rol,
      estado: c.estado,
      contrasena: "",
    });
    setMsg("");
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setMsg("");
    try {
      const body = {
        nombre: editForm.nombre.trim(),
        correo: editForm.correo.trim(),
        rol: editForm.rol,
        estado: editForm.estado,
      };
      const et = editForm.telefono.replace(/\D/g, "").slice(0, 9);
      if (editForm.rol === "Cliente" && et.length === 9) {
        body.telefono = et;
      }
      if (editForm.contrasena.length >= 6) {
        body.contrasena = editForm.contrasena;
      }
      await apiPatch(`/api/cuentas/${editId}`, body, { auth: true });
      setEditId(null);
      setMsg("Cuenta actualizada.");
      await cargar();
    } catch (err) {
      setMsg(err?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const eliminarCuenta = async (id) => {
    if (!window.confirm("¿Eliminar esta cuenta? Los clientes perderán acceso si era su único registro.")) return;
    setSaving(true);
    setMsg("");
    try {
      await apiDelete(`/api/cuentas/${id}`, { auth: true });
      if (editId === id) setEditId(null);
      setMsg("Cuenta eliminada.");
      await cargar();
    } catch (err) {
      setMsg(err?.message || "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "12px", color: "var(--brand-700)" }}>Cuentas</h1>
      <p style={{ marginBottom: "18px" }}>
        Alta, baja y edición de clientes y personal. En la web el cliente entra con <strong>nombre + celular</strong> (9
        dígitos); aquí puedes dar de alta un cliente con ese celular o con contraseña clásica (mín. 6 caracteres).
      </p>

      {msg && (
        <div className="card card--pad" style={{ marginBottom: 14, fontSize: 14 }}>
          {msg}
        </div>
      )}

      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Nueva cuenta</h3>
        <form onSubmit={crearCuenta} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="field">
            <label className="label">Nombre</label>
            <input className="input" value={nueva.nombre} onChange={(e) => setNueva((x) => ({ ...x, nombre: e.target.value }))} required minLength={3} />
          </div>
          <div className="field">
            <label className="label">Correo</label>
            <input className="input" type="email" value={nueva.correo} onChange={(e) => setNueva((x) => ({ ...x, correo: e.target.value }))} required />
          </div>
          <div className="field">
            <label className="label">Rol</label>
            <select className="input" value={nueva.rol} onChange={(e) => setNueva((x) => ({ ...x, rol: e.target.value }))}>
              <option value="Cliente">Cliente</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
          {nueva.rol === "Cliente" ? (
            <div className="field">
              <label className="label">
                Celular web (9 dígitos)<span className="req">*</span>
              </label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={9}
                value={nueva.telefono}
                onChange={(e) => setNueva((x) => ({ ...x, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                placeholder="Clave en la app pública si no pones contraseña"
              />
            </div>
          ) : null}
          <div className="field">
            <label className="label">Estado</label>
            <select className="input" value={nueva.estado} onChange={(e) => setNueva((x) => ({ ...x, estado: e.target.value }))}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Contraseña (opcional)</label>
            <input
              className="input"
              type="password"
              value={nueva.contrasena}
              onChange={(e) => setNueva((x) => ({ ...x, contrasena: e.target.value }))}
              placeholder="Solo si quieres otra clave distinta al celular (mín. 6 caracteres)"
              autoComplete="new-password"
            />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" className="btn btn--primary" disabled={saving || loading}>
              {saving ? "Guardando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </div>

      {editId && (
        <div className="card card--pad" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Editar cuenta #{editId}</h3>
          <form onSubmit={guardarEdicion} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="field">
              <label className="label">Nombre</label>
              <input className="input" value={editForm.nombre} onChange={(e) => setEditForm((x) => ({ ...x, nombre: e.target.value }))} required minLength={3} />
            </div>
            <div className="field">
              <label className="label">Correo</label>
              <input className="input" type="email" value={editForm.correo} onChange={(e) => setEditForm((x) => ({ ...x, correo: e.target.value }))} required />
            </div>
            <div className="field">
              <label className="label">Rol</label>
              <select className="input" value={editForm.rol} onChange={(e) => setEditForm((x) => ({ ...x, rol: e.target.value }))}>
                <option value="Cliente">Cliente</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
            {editForm.rol === "Cliente" ? (
              <div className="field">
                <label className="label">Celular web (9 dígitos)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  maxLength={9}
                  value={editForm.telefono}
                  onChange={(e) => setEditForm((x) => ({ ...x, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                  placeholder="Solo si cambias el número (9 dígitos); vacío = no actualizar celular"
                />
              </div>
            ) : null}
            <div className="field">
              <label className="label">Estado</label>
              <select className="input" value={editForm.estado} onChange={(e) => setEditForm((x) => ({ ...x, estado: e.target.value }))}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Nueva contraseña (opcional)</label>
              <input
                className="input"
                type="password"
                value={editForm.contrasena}
                onChange={(e) => setEditForm((x) => ({ ...x, contrasena: e.target.value }))}
                placeholder="Dejar vacío para no cambiar"
              />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                Guardar
              </button>
              <button type="button" className="btn" onClick={() => setEditId(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <p className="loading-inline" style={{ marginBottom: 14 }}>
          Cargando cuentas…
        </p>
      )}

      <div className="card card--pad">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Celular</th>
                <th>WA promo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--muted)" }}>
                    …
                  </td>
                </tr>
              ) : (
                cuentas.map((cuenta) => (
                  <tr key={cuenta.id}>
                    <td>{cuenta.id}</td>
                    <td>
                      <strong>{cuenta.nombre}</strong>
                    </td>
                    <td>{cuenta.correo}</td>
                    <td>{cuenta.telefono ?? "—"}</td>
                    <td>
                      {cuenta.aceptaMarketingWhatsapp ? (
                        <span className="badge badge--ok">Sí</span>
                      ) : (
                        <span className="badge badge--warn">No</span>
                      )}
                    </td>
                    <td>{cuenta.rol}</td>
                    <td>
                      <span className={cuenta.estado === "Activo" ? "badge badge--ok" : "badge badge--warn"}>
                        {cuenta.estado}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => abrirEdicion(cuenta)}>
                          Editar
                        </button>
                        <button type="button" className="btn" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => void eliminarCuenta(cuenta.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
