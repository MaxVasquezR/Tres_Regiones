import { useEffect, useState } from "react";
import { apiGet } from "../api";

const FALLBACK = {
  pedidosHoy: 24,
  ultimoEntregaMin: 8,
  enCurso: 3,
  rating: 4.9,
  etaPromedio: 28,
  cocinaAbierta: true,
};

export default function LivePulseStrip() {
  const [stats, setStats] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await apiGet("/api/stats/public");
        if (alive && res?.data) setStats({ ...FALLBACK, ...res.data });
      } catch {
        /* fallback */
      }
    };
    void load();
    const id = setInterval(load, 45000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="live-pulse full-bleed" aria-label="Actividad en vivo">
      <div className="container container--wide live-pulse__inner">
        <span className="live-pulse__dot" aria-hidden />
        <p className="live-pulse__lead">
          <strong>{stats.pedidosHoy}</strong> pedidos Guepardo hoy · última entrega hace{" "}
          <strong>{stats.ultimoEntregaMin} min</strong>
        </p>
        <div className="live-pulse__chips">
          <span className="live-pulse__chip">🐆 {stats.enCurso} en camino</span>
          <span className="live-pulse__chip">⚡ ~{stats.etaPromedio} min promedio</span>
          <span className="live-pulse__chip">⭐ {stats.rating}</span>
          <span className={`live-pulse__chip${stats.cocinaAbierta ? " live-pulse__chip--open" : ""}`}>
            {stats.cocinaAbierta ? "Cocina abierta" : "Cocina cerrada"}
          </span>
        </div>
      </div>
    </section>
  );
}
