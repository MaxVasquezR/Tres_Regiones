import { MESAS } from "../data/salon";

export default function SalonMap({ zona, personas, ocupadas, seleccionada, onSelect, disponibles }) {
  const mesasZona = MESAS.filter((mesa) => mesa.zona === zona);
  const disponiblesSet = new Set(disponibles.map((mesa) => mesa.codigo));

  return (
    <div className="salon-map" aria-label={`Mapa de mesas en ${zona}`}>
      <div className="salon-map__header">
        <div>
          <p className="salon-map__title">{zona}</p>
          <p className="salon-map__hint">Selecciona la mesa que mejor encaje con tu visita presencial.</p>
        </div>
        <div className="salon-map__legend">
          <span><i className="salon-map__dot salon-map__dot--free" /> Disponible</span>
          <span><i className="salon-map__dot salon-map__dot--busy" /> Ocupada</span>
          <span><i className="salon-map__dot salon-map__dot--selected" /> Tu elección</span>
        </div>
      </div>

      <div className="salon-map__grid">
        {mesasZona.map((mesa) => {
          const ocupada = ocupadas.has(mesa.codigo);
          const apta = mesa.capacidad >= Number(personas);
          const disponible = disponiblesSet.has(mesa.codigo);
          const selected = seleccionada === mesa.codigo;
          const disabled = !disponible || !apta;

          return (
            <button
              key={mesa.codigo}
              type="button"
              className={`salon-map__table${selected ? " salon-map__table--selected" : ""}${ocupada ? " salon-map__table--busy" : ""}${!apta ? " salon-map__table--small" : ""}`}
              disabled={disabled}
              onClick={() => onSelect(mesa.codigo)}
            >
              <span className="salon-map__code">{mesa.codigo}</span>
              <span className="salon-map__meta">{mesa.etiqueta}</span>
              <span className="salon-map__capacity">Hasta {mesa.capacidad} pax</span>
              <span className="salon-map__ambiente">{mesa.ambiente}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
