export default function MetricBarChart({ title, subtitle, items, maxValue }) {
  const peak = maxValue ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="chart-card">
      <div className="chart-card__head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="bar-chart" role="img" aria-label={title}>
        {items.map((item) => (
          <div key={item.label} className="bar-chart__row">
            <span className="bar-chart__label">{item.label}</span>
            <div className="bar-chart__track">
              <span className="bar-chart__fill" style={{ width: `${(item.value / peak) * 100}%` }} />
            </div>
            <span className="bar-chart__value">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
