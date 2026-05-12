const COLORS = ["#2f4a5d", "#c58b3d", "#4f7d6c", "#a84832", "#7a8d9c"];

export default function StatusDonutChart({ title, subtitle, slices }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cursor = 0;
  const gradient = total
    ? slices
        .map((slice, index) => {
          const start = (cursor / total) * 100;
          cursor += slice.value;
          const end = (cursor / total) * 100;
          return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
        })
        .join(", ")
    : "#e8eef2 0% 100%";

  return (
    <section className="chart-card">
      <div className="chart-card__head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="donut-chart">
        <div className="donut-chart__ring" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="donut-chart__hole">
            <strong>{total}</strong>
            <span>reservas</span>
          </div>
        </div>
        <ul className="donut-chart__legend">
          {slices.map((slice, index) => (
            <li key={slice.label}>
              <span className="donut-chart__swatch" style={{ background: COLORS[index % COLORS.length] }} />
              <span>{slice.label}</span>
              <strong>{slice.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
