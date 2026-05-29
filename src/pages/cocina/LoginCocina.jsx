import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../api";
import { iniciarSesionCocina } from "../../session";

export default function LoginCocina() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiPost("/api/auth/cocina-login", { pin });
      iniciarSesionCocina({ token: res.token, user: res.user });
      navigate("/cocina", { replace: true });
    } catch (err) {
      setError(err?.message || "PIN incorrecto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login staff-login--cocina">
      <div className="staff-login__card">
        <p className="eyebrow">Pantalla cocina</p>
        <h1>TRES REGIONES</h1>
        <p className="staff-login__sub">Ingresa el PIN de cocina para ver comandas.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="cocina-pin">PIN</label>
            <input
              id="cocina-pin"
              type="password"
              inputMode="numeric"
              className="input input--pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="off"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? "Verificando…" : "Entrar a cocina"}
          </button>
        </form>
      </div>
    </div>
  );
}
