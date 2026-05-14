import { useCallback, useRef, useState } from "react";
import { apiGet } from "../api";
import { useCart } from "../context/CartContext";
import DeliveryMapPicker from "./DeliveryMapPicker";

const ASSIST = [
  { id: "gps", label: "Mi ubicación", hint: "Un clic: ubicación del navegador y dirección sugerida." },
  { id: "map", label: "Otra en el mapa", hint: "Toca el mapa o arrastra el pin para otra dirección de entrega." },
  { id: "write", label: "Solo escribir", hint: "Si ya tienes la dirección, escribe sin usar mapa." },
];

export default function DeliveryAddressEditor() {
  const { direccion, setDireccionField, mergeDireccion } = useCart();
  const [assist, setAssist] = useState(() => {
    if (direccion.fuente === "gps") return "gps";
    if (direccion.fuente === "mapa") return "map";
    return "write";
  });
  const [msg, setMsg] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState([]);
  const reverseTimer = useRef(null);

  const runReverse = useCallback(
    async (la, lo) => {
      try {
        const json = await apiGet(`/api/geo/reverse?lat=${encodeURIComponent(la)}&lng=${encodeURIComponent(lo)}`, {
          auth: true,
        });
        const d = json?.data;
        if (!d) return;
        mergeDireccion({
          calle: d.calle,
          distrito: d.distrito,
          lat: d.lat,
          lng: d.lng,
          fuente: "mapa",
          etiqueta: d.etiqueta,
        });
        setMsg("");
      } catch (e) {
        setMsg(e?.message || "No pudimos leer la dirección en ese punto.");
      }
    },
    [mergeDireccion],
  );

  const onMapMove = useCallback(
    (la, lo) => {
      mergeDireccion({ lat: la, lng: lo, fuente: "mapa" });
      if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
      reverseTimer.current = window.setTimeout(() => {
        void runReverse(la, lo);
      }, 480);
    },
    [mergeDireccion, runReverse],
  );

  const usarUbicacionActual = () => {
    setMsg("");
    if (!navigator.geolocation) {
      setMsg("Tu navegador no permite geolocalización. Usa «Otra en el mapa» o escribe la dirección.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        try {
          const json = await apiGet(`/api/geo/reverse?lat=${encodeURIComponent(la)}&lng=${encodeURIComponent(lo)}`, {
            auth: true,
          });
          const d = json?.data;
          if (!d) throw new Error("Respuesta vacía del geocodificador.");
          mergeDireccion({
            calle: d.calle,
            distrito: d.distrito,
            lat: d.lat,
            lng: d.lng,
            fuente: "gps",
            etiqueta: d.etiqueta,
          });
          setAssist("write");
          setMsg("Listo: revisa calle y distrito y ajusta si hace falta.");
        } catch (e) {
          setMsg(e?.message || "No pudimos convertir tu ubicación en dirección.");
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        const code = err?.code;
        if (code === 1) {
          setMsg("Permiso de ubicación denegado. Usa «Otra en el mapa» o escribe la dirección.");
        } else if (code === 2 || code === 3) {
          setMsg("No obtuvimos la ubicación a tiempo. Intenta de nuevo o usa el mapa.");
        } else {
          setMsg("No pudimos obtener tu ubicación. Usa el mapa o escribe la dirección.");
        }
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 },
    );
  };

  const buscarDireccion = async () => {
    const q = searchQ.trim();
    if (q.length < 4) {
      setMsg("Escribe al menos 4 caracteres para buscar (ej. Larco Miraflores).");
      return;
    }
    setSearchBusy(true);
    setMsg("");
    try {
      const json = await apiGet(`/api/geo/search?q=${encodeURIComponent(q)}`, { auth: true });
      const hits = json?.data?.results;
      setSearchHits(Array.isArray(hits) ? hits : []);
      if (!hits?.length) setMsg("Sin resultados. Prueba otra palabra o coloca el pin en el mapa.");
    } catch (e) {
      setSearchHits([]);
      setMsg(e?.message || "Búsqueda no disponible.");
    } finally {
      setSearchBusy(false);
    }
  };

  const elegirHit = (h) => {
    mergeDireccion({
      calle: h.calle || h.label?.split(",")[0]?.trim() || "",
      distrito: h.distrito || "",
      lat: h.lat,
      lng: h.lng,
      fuente: "mapa",
      etiqueta: h.label,
    });
    setSearchHits([]);
    setMsg("Ubicación aplicada. Puedes afinar el pin en el mapa.");
  };

  return (
    <div className="delivery-editor">
      <p className="delivery-editor__intro">
        Pago por adelantado · entrega orientativa en <strong>~1 h</strong> según tráfico y cocina. Elige cómo indicar
        dónde llevamos el pedido: rápido con GPS, preciso con mapa, o directo al teclado.
      </p>

      <div className="delivery-editor__modes" role="tablist" aria-label="Forma de indicar dirección">
        {ASSIST.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={assist === m.id}
            className={`delivery-editor__mode${assist === m.id ? " delivery-editor__mode--active" : ""}`}
            onClick={() => {
              setAssist(m.id);
              setMsg("");
            }}
          >
            <strong>{m.label}</strong>
            <span>{m.hint}</span>
          </button>
        ))}
      </div>

      {assist === "gps" ? (
        <div className="delivery-editor__panel">
          <button type="button" className="btn btn--primary" disabled={gpsBusy} onClick={usarUbicacionActual}>
            {gpsBusy ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
          </button>
          <p className="hint delivery-editor__fineprint">
            El navegador pedirá permiso. Si no quieres compartir ubicación, usa «Otra en el mapa».
          </p>
        </div>
      ) : null}

      {assist === "map" ? (
        <div className="delivery-editor__panel">
          <div className="delivery-editor__search">
            <input
              type="search"
              className="input"
              placeholder="Buscar zona o dirección (ej. Larco, San Isidro)"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              maxLength={120}
            />
            <button type="button" className="btn btn--surface" disabled={searchBusy} onClick={() => void buscarDireccion()}>
              {searchBusy ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {searchHits.length ? (
            <ul className="delivery-editor__hits">
              {searchHits.map((h, i) => (
                <li key={`${h.lat}-${h.lng}-${i}`}>
                  <button type="button" className="delivery-editor__hit" onClick={() => elegirHit(h)}>
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <DeliveryMapPicker lat={direccion.lat} lng={direccion.lng} onPositionChange={onMapMove} />
          <p className="hint delivery-editor__fineprint">
            Toca el mapa o arrastra el pin. La dirección se actualiza al soltar (servicio OpenStreetMap / Nominatim).
          </p>
        </div>
      ) : null}

      {assist === "write" ? (
        <p className="hint delivery-editor__fineprint">
          Completa calle y número más distrito. Las referencias ayudan al rider a llegar sin llamadas extra.
        </p>
      ) : null}

      <div className="booking__grid booking__grid--2 delivery-editor__fields">
        <div className="field">
          <label className="label">
            Dirección (calle y número)<span className="req">*</span>
          </label>
          <input
            className="input"
            value={direccion.calle}
            onChange={(e) => {
              setDireccionField("calle", e.target.value);
              setDireccionField("fuente", "manual");
            }}
            placeholder="Ej. Av. Larco 123, Dpto 402"
            maxLength={160}
          />
        </div>
        <div className="field">
          <label className="label">
            Distrito<span className="req">*</span>
          </label>
          <input
            className="input"
            value={direccion.distrito}
            onChange={(e) => {
              setDireccionField("distrito", e.target.value);
              setDireccionField("fuente", "manual");
            }}
            placeholder="Ej. Miraflores"
            maxLength={80}
          />
        </div>
        <div className="field">
          <label className="label">Urbanización / interior (opcional)</label>
          <input
            className="input"
            value={direccion.urbanizacion}
            onChange={(e) => {
              setDireccionField("urbanizacion", e.target.value);
              setDireccionField("fuente", "manual");
            }}
            maxLength={80}
          />
        </div>
        <div className="field">
          <label className="label">Referencia para el rider</label>
          <input
            className="input"
            value={direccion.referencia}
            onChange={(e) => {
              setDireccionField("referencia", e.target.value);
              setDireccionField("fuente", "manual");
            }}
            placeholder="Portón azul, timbre 2, contra entrega en portería"
            maxLength={200}
          />
        </div>
      </div>

      {Number.isFinite(direccion.lat) && Number.isFinite(direccion.lng) ? (
        <p className="delivery-editor__coords">
          Coordenadas guardadas para el pedido:{" "}
          <strong>
            {Number(direccion.lat).toFixed(5)}, {Number(direccion.lng).toFixed(5)}
          </strong>
          {direccion.fuente ? (
            <>
              {" "}
              · origen: <strong>{direccion.fuente === "gps" ? "GPS" : direccion.fuente === "mapa" ? "Mapa" : "Texto"}</strong>
            </>
          ) : null}
        </p>
      ) : null}

      {msg ? (
        <div className={msg.startsWith("Listo") ? "notice notice--spaced" : "error"} role="status">
          {msg}
        </div>
      ) : null}
    </div>
  );
}
