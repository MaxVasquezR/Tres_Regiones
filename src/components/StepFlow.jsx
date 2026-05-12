export default function StepFlow({ steps, current }) {
  return (
    <ol className="step-flow" aria-label="Progreso de reserva">
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={step} className={`step-flow__item${active ? " step-flow__item--active" : ""}${done ? " step-flow__item--done" : ""}`}>
            <span className="step-flow__index">{index + 1}</span>
            <span className="step-flow__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
