const pilares = [
  {
    title: "Servicio en sala",
    copy: "La experiencia es presencial en Lima: reserva, llega al local y vive la carta de las tres regiones.",
  },
  {
    title: "Mesa elegida",
    copy: "El visitante selecciona turno, ambiente y mesa antes de confirmar su separación.",
  },
  {
    title: "Operación visible",
    copy: "El administrador lee ocupación, depósitos, canales y riesgo desde un panel con gráficos.",
  },
];

const regiones = [
  {
    title: "Costa",
    copy: "Cítricos, mar y sazón limeña para viajeros que llegan del malecón o del aeropuerto.",
  },
  {
    title: "Sierra",
    copy: "Papas andinas, ajíes y caldos profundos con memoria de altura.",
  },
  {
    title: "Selva",
    copy: "Frutas amazónicas y notas tropicales para cerrar un itinerario con identidad.",
  },
];

export default function DemoAccessPanel() {
  return (
    <section className="experience-guide" aria-label="Experiencia presencial">
      <div className="experience-guide__intro">
        <p className="eyebrow">Turismo presencial</p>
        <h2 className="section-title">Una minimuestra pensada para recibir viajeros</h2>
        <p className="section-lead">
          Sin delivery ni reparto: aquí se prueba cómo un restaurante turístico vende mesa, personaliza la visita y opera
          la sala con datos reales.
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
    </section>
  );
}
