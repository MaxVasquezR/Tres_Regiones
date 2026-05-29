import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiGet, apiPost } from "../../api";
import { iniciarSesionMozo } from "../../session";

export default function LoginMozo() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [sedeId, setSedeId] = useState("");

  useEffect(() => {
    apiGet("/api/sedes")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setSedes(data);
        if (data[0]) setSedeId(data[0].id);
      })
      .catch(() => setSedes([]));
  }, []);

  const handleDigit = (d) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length >= 4) {
      void tryLogin(next);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const tryLogin = async (pinValue) => {
    setSubmitting(true);
    try {
      const json = await apiPost("/api/auth/mozo-login", { pin: pinValue, sedeId });
      iniciarSesionMozo({ token: json.token, user: json.user });
      navigate("/mozo/mesas");
    } catch (err) {
      setError(err?.message || "PIN incorrecto");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="standalone-page">
      <div className="split">
        <div className="split__left">
          <div className="split__badge">
            <span style={{ color: "var(--gold-600)", fontWeight: 900 }}>●</span>
            Acceso del mozo
          </div>
          <h1>TRES REGIONES</h1>
          <p style={{ marginTop: 10, maxWidth: 420, color: "rgba(255,255,255,0.86)" }}>
            Pantalla de atención presencial. Ingresa tu PIN para empezar tu turno.
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/admin/login" className="btn btn--ghost">
              Panel admin
            </Link>
          </div>
        </div>

        <div className="split__right pattern-bg">
          <div className="card auth__card" style={{ maxWidth: 360 }}>
            <h2 className="auth__title">Ingresa tu PIN</h2>
            <p className="auth__subtitle">4 a 6 dígitos numéricos</p>

            {sedes.length > 0 && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label">Sede del turno</label>
                <select className="input" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.distrito}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pin-display" aria-label="PIN ingresado">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`pin-display__dot${pin.length > i ? " pin-display__dot--filled" : ""}`}
                  aria-hidden
                />
              ))}
            </div>

            {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="pin-pad" role="group" aria-label="Teclado numérico">
              {digits.map((d, idx) => {
                if (d === "") return <span key={idx} />;
                if (d === "⌫") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="pin-pad__btn pin-pad__btn--del"
                      onClick={handleDelete}
                      disabled={submitting}
                      aria-label="Borrar"
                    >
                      {d}
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    className="pin-pad__btn"
                    onClick={() => handleDigit(d)}
                    disabled={submitting}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
