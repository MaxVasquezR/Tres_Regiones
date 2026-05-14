const pilares = [
  {
    title: "Sala y turismo",
    copy: "El visitante vive un recorrido premium: conoce la oferta de tres regiones y separa mesa antes de llegar al local en Lima.",
  },
  {
    title: "Mesa bajo control",
    copy: "Turno, ambiente y mesa elegidos con claridad operativa: la misma lógica que escalará con más salas y horarios.",
  },
  {
    title: "Operación con vista",
    copy: "El equipo revisa ocupación, depósitos y estados en un panel serio, pensado para dueños e inversionistas en preventa.",
  },
];

const regiones = [
  {
    title: "Costa",
    copy: "Mar, limón y calor limeño: piqueos y clásicos que reciben al viajero que aterriza en la capital.",
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
    <div className="experience-guide" role="region" aria-label="Propuesta de valor · minimuestra">
      <div className="experience-guide__intro">
        <p className="eyebrow">Preventa comercial</p>
        <h2 className="section-title">Plataforma lista para mostrar, no para improvisar</h2>
        <p className="section-lead">
          Esta interfaz ocupa la pantalla de forma deliberada: impacto visual para socios, flujo claro para el visitante
          y panel administrativo alineado con la operación real. Los datos se ampliarán en la versión productiva.
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
