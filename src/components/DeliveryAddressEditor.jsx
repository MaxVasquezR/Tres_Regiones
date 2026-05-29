export default function DeliveryAddressEditor({ value, zonas, onChange }) {
  const distritos = zonas.map((z) => z.distrito);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="delivery-editor">
      <div className="field">
        <label className="label">
          Dirección de entrega<span className="req">*</span>
        </label>
        <input
          type="text"
          className="input"
          placeholder="Av. / Calle y número"
          value={value.calle}
          onChange={(e) => set({ calle: e.target.value })}
          maxLength={160}
        />
      </div>
      <div className="field">
        <label className="label">
          Distrito<span className="req">*</span>
        </label>
        <select className="input" value={value.distrito} onChange={(e) => set({ distrito: e.target.value })}>
          <option value="">Selecciona tu distrito…</option>
          {distritos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="hint">Cobertura: {distritos.join(" · ")}.</p>
      </div>
      <div className="field">
        <label className="label">
          Referencia<span className="req">*</span>
        </label>
        <input
          type="text"
          className="input"
          placeholder="Ej. Portón verde, frente al parque"
          value={value.referencia}
          onChange={(e) => set({ referencia: e.target.value })}
          maxLength={200}
        />
      </div>
      <div className="field">
        <label className="label">
          Celular de contacto<span className="req">*</span>
        </label>
        <input
          type="tel"
          inputMode="numeric"
          className="input"
          placeholder="9 dígitos"
          value={value.celularContacto}
          onChange={(e) => set({ celularContacto: e.target.value.replace(/\D/g, "").slice(0, 9) })}
          maxLength={9}
        />
      </div>
    </div>
  );
}
