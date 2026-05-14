const pilares = [
  {
    title: "Sala y turismo",
    copy: "El comensal conoce la oferta de tres regiones y puede separar mesa antes de llegar al local en Lima.",
  },
  {
    title: "Mesa bajo control",
    copy: "Turno, ambiente y mesa con criterio operativo: base para ampliar salas, horarios y políticas del restaurante.",
  },
  {
    title: "Operación con vista",
    copy: "Ocupación, depósitos y estados en un panel pensado para dueños, gerencia y equipo de sala.",
  },
];

const regiones = [
  {
    title: "Costa",
    copy: "Mar, limón y calor limeño: piqueos y clásicos que reciben al visitante en la capital.",
  },
  {
    title: "Sierra",
    copy: "Papa nativa, ají panca y caldos profundos: memoria andina en cada bocado.",
  },
  {
    title: "Selva",
    copy: "Frutas amazónicas y notas audaces para cerrar un itinerario con sello peruano.",
  },
];

export default function DemoAccessPanel() {
  return (
    <div className="experience-guide" role="region" aria-label="Propuesta de valor">
      <div className="experience-guide__intro">
        <p className="eyebrow">Tres Regiones</p>
        <h2 className="section-title">Experiencia de marca, operación ordenada</h2>
        <p className="section-lead">
          Interfaz pensada para impacto en sala y claridad en el pedido: carta, delivery con dirección precisa y
          reservas enlazadas al panel del local.
        </p>
      </div>

      <div className="experience-guide__regions">
        {pilares.map((item) => (
          <article key={item.title} className="experience-guide__region">
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>

      <div className="experience-guide__regions">
        {regiones.map((region) => (
          <article key={region.title} className="experience-guide__region experience-guide__region--soft">
            <h3>{region.title}</h3>
            <p>{region.copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
