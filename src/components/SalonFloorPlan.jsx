import { useState } from "react";
import { MESAS, PLANO_MESAS_POR_ZONA, ZONAS } from "../data/salon";

function mesaMeta(codigo) {
  return MESAS.find((m) => m.codigo === codigo);
}

export default function SalonFloorPlan({
  mesaDestacada,
  zonaDefault,
  titulo = "Tu lugar en el local",
  subtitulo = "Plano orientativo del salón y la terraza. La mesa resaltada es la que quedó separada con tu depósito.",
  variant = "showcase",
}) {
  const meta = mesaDestacada ? mesaMeta(mesaDestacada) : null;
  const initialZona = zonaDefault && ZONAS.includes(zonaDefault) ? zonaDefault : ZONAS[0];
  const [zonaActiva, setZonaActiva] = useState(initialZona);

  const posiciones = PLANO_MESAS_POR_ZONA[zonaActiva] || [];

  return (
    <div className={`floor-plan floor-plan--${variant}`}>
      <div className="floor-plan__head">
        <div>
          <p className="floor-plan__eyebrow">Experiencia presencial · vista previa comercial</p>
          <h2 className="floor-plan__title">{titulo}</h2>
          <p className="floor-plan__lead">{subtitulo}</p>
        </div>
        <div className="floor-plan__legend" aria-label="Leyenda del plano">
          {mesaDestacada ? (
            <span className="floor-plan__legend-item">
              <i className="floor-plan__chip floor-plan__chip--yours" aria-hidden />
              Tu mesa
            </span>
          ) : null}
          <span className="floor-plan__legend-item">
            <i className="floor-plan__chip floor-plan__chip--room" aria-hidden />
            Ambiente
          </span>
        </div>
      </div>

      <div className="floor-plan__tabs" role="tablist" aria-label="Ambientes">
        {ZONAS.map((z) => (
          <button
            key={z}
            type="button"
            role="tab"
            aria-selected={zonaActiva === z}
            className={`floor-plan__tab${zonaActiva === z ? " floor-plan__tab--active" : ""}`}
            onClick={() => setZonaActiva(z)}
          >
            {z === "Salón principal" ? "Salón" : z}
            {meta?.zona === z && mesaDestacada ? (
              <span className="floor-plan__tab-badge">Tu mesa aquí</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="floor-plan__canvas-wrap">
        <svg
          className="floor-plan__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Plano de ${zonaActiva}`}
        >
          <defs>
            <linearGradient id="floor-plan-floor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f6f1e8" />
              <stop offset="100%" stopColor="#e8ece9" />
            </linearGradient>
            <linearGradient id="floor-plan-window" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(120, 170, 210, 0.35)" />
              <stop offset="100%" stopColor="rgba(120, 170, 210, 0.08)" />
            </linearGradient>
            <linearGradient id="floor-plan-sky" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(90, 140, 180, 0.2)" />
              <stop offset="100%" stopColor="rgba(200, 220, 235, 0.45)" />
            </linearGradient>
            <linearGradient id="floor-plan-mesa-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbf0" />
              <stop offset="50%" stopColor="#f4e4bc" />
              <stop offset="100%" stopColor="#e8d4a8" />
            </linearGradient>
          </defs>

          {zonaActiva === "Salón principal" ? (
            <>
              <rect x="2" y="2" width="96" height="14" rx="2" fill="url(#floor-plan-window)" opacity="0.95" />
              <text x="50" y="11" textAnchor="middle" fill="rgba(47,74,93,0.55)" fontSize="4.2" fontWeight="700">
                Fachada · luz natural
              </text>
            </>
          ) : (
            <>
              <rect x="2" y="2" width="96" height="22" rx="2" fill="url(#floor-plan-sky)" />
              <text x="50" y="14" textAnchor="middle" fill="rgba(47,74,93,0.5)" fontSize="4" fontWeight="700">
                Cielo abierto · terraza
              </text>
            </>
          )}

          <rect x="3" y={zonaActiva === "Salón principal" ? "18" : "26"} width="94" height={zonaActiva === "Salón principal" ? "78" : "71"} rx="3" fill="url(#floor-plan-floor)" stroke="rgba(47,74,93,0.12)" strokeWidth="0.35" />

          {zonaActiva === "Salón principal" ? (
            <g opacity="0.35" stroke="rgba(47,74,93,0.15)" strokeWidth="0.2">
              <line x1="50" y1="20" x2="50" y2="94" />
              <line x1="4" y1="52" x2="96" y2="52" />
            </g>
          ) : (
            <g opacity="0.4">
              <circle cx="18" cy="88" r="3" fill="rgba(76, 120, 90, 0.25)" />
              <circle cx="82" cy="86" r="2.5" fill="rgba(76, 120, 90, 0.2)" />
              <circle cx="50" cy="92" r="4" fill="rgba(76, 120, 90, 0.18)" />
            </g>
          )}

          {posiciones.map((slot) => {
            const m = mesaMeta(slot.codigo);
            const esTuya = Boolean(mesaDestacada && slot.codigo === mesaDestacada);
            const { x, y, w, h } = slot;
            const rectClass = esTuya
              ? "floor-plan__mesa floor-plan__mesa--yours"
              : mesaDestacada
                ? "floor-plan__mesa floor-plan__mesa--other"
                : "floor-plan__mesa floor-plan__mesa--neutral";
            const rectFill = esTuya ? "url(#floor-plan-mesa-gold)" : undefined;
            return (
              <g
                key={slot.codigo}
                className={esTuya ? "floor-plan__mesa-group floor-plan__mesa-group--yours" : "floor-plan__mesa-group"}
              >
                <rect x={x} y={y} width={w} height={h} rx="2.2" className={rectClass} fill={rectFill} />
                <text
                  x={x + w / 2}
                  y={y + h * 0.42}
                  textAnchor="middle"
                  className={`floor-plan__mesa-code${esTuya ? " floor-plan__mesa-code--yours" : ""}`}
                  fontSize="5.5"
                  fontWeight="800"
                >
                  {slot.codigo}
                </text>
                {m ? (
                  <text
                    x={x + w / 2}
                    y={y + h * 0.68}
                    textAnchor="middle"
                    className={`floor-plan__mesa-sub${esTuya ? " floor-plan__mesa-sub--yours" : ""}`}
                    fontSize="3.1"
                    fontWeight="600"
                  >
                    {m.etiqueta} · {m.capacidad} pax
                  </text>
                ) : null}
                {esTuya ? (
                  <text x={x + w / 2} y={y + h - 3.5} textAnchor="middle" className="floor-plan__mesa-tag" fontSize="2.75" fontWeight="800">
                    Separada para ti
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {meta && mesaDestacada ? (
        <p className="floor-plan__footer">
          <strong>{mesaDestacada}</strong> · {meta.etiqueta} · {meta.ambiente} · hasta {meta.capacidad} personas
          {meta.zona !== zonaActiva ? (
            <span className="floor-plan__footer-hint"> · Cambia de pestaña para ver el otro ambiente.</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
