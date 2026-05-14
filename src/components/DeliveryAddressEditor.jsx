import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../api";
import { useCart } from "../context/CartContext";
import DeliveryMapPicker from "./DeliveryMapPicker";

const ASSIST = [
  { id: "gps", label: "Mi ubicación", hint: "Usa el GPS del teléfono o navegador y completamos calle y distrito." },
  { id: "map", label: "Mapa y búsqueda", hint: "Busca una dirección o mueve el pin hasta la entrada exacta." },
  { id: "write", label: "Solo texto", hint: "Escribe calle, número y distrito si ya los tienes a mano." },
];

const SEARCH_MIN = 3;
const SUGGEST_DEBOUNCE_MS = 380;
const SUGGEST_BLUR_MS = 380;

function msgTone(m) {
  if (!m) return "neutral";
  if (/^(Listo|Ubicación aplicada|Dirección aplicada|Dirección guardada)/i.test(m)) return "success";
  if (
    /sin resultados|al menos \d|prueba otra|Tu navegador no permite|Permiso de ubicación|Intenta de nuevo o usa el mapa|No obtuvimos la ubicación|Espera un momento/i.test(
      m,
    )
  ) {
    return "notice";
  }
  return "error";
}

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
  const [geoSuggestBusy, setGeoSuggestBusy] = useState(false);
  const [searchHits, setSearchHits] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestKick, setSuggestKick] = useState(0);
  const reverseTimer = useRef(null);
  const suggestAbort = useRef(null);
  const blurCloseTimer = useRef(null);
  const previewRef = useRef(null);

  const loadSearchResults = useCallback(async (q, { signal } = {}) => {
    const json = await apiGet(`/api/geo/search?q=${encodeURIComponent(q)}`, { auth: true, signal });
    const hits = json?.data?.results;
    return Array.isArray(hits) ? hits : [];
  }, []);

  const clearBlurClose = () => {
    if (blurCloseTimer.current) {
      window.clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  };

  const scheduleCloseSuggest = () => {
    clearBlurClose();
    blurCloseTimer.current = window.setTimeout(() => {
      setSuggestOpen(false);
      blurCloseTimer.current = null;
    }, SUGGEST_BLUR_MS);
  };

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

  useEffect(() => {
    if (assist !== "map") {
      if (suggestAbort.current) suggestAbort.current.abort();
      setSearchHits([]);
      setGeoSuggestBusy(false);
      setSuggestOpen(false);
      return;
    }
    const q = searchQ.trim();
    if (q.length < SEARCH_MIN) {
      if (suggestAbort.current) suggestAbort.current.abort();
      setSearchHits([]);
      setGeoSuggestBusy(false);
      return;
    }
    if (suggestAbort.current) suggestAbort.current.abort();
    const ac = new AbortController();
    suggestAbort.current = ac;
    const tid = window.setTimeout(() => {
      void (async () => {
        setGeoSuggestBusy(true);
        try {
          const hits = await loadSearchResults(q, { signal: ac.signal });
          if (suggestAbort.current === ac) {
            setSearchHits(hits);
            setSuggestOpen(true);
          }
        } catch (e) {
          if (e?.name === "AbortError") return;
          if (suggestAbort.current === ac) {
            setSearchHits([]);
            setMsg(e?.message || "Búsqueda no disponible.");
          }
        } finally {
          if (suggestAbort.current === ac) setGeoSuggestBusy(false);
        }
      })();
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(tid);
      ac.abort();
    };
  }, [assist, searchQ, suggestKick, loadSearchResults]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSuggestOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [suggestOpen]);

  useEffect(
    () => () => {
      clearBlurClose();
      if (suggestAbort.current) suggestAbort.current.abort();
    },
    [],
  );

  const scrollPreviewIntoView = () => {
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const usarUbicacionActual = () => {
    setMsg("");
    if (!navigator.geolocation) {
      setMsg("Tu navegador no permite geolocalización. Usa el mapa o escribe la dirección.");
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
          setMsg("Dirección guardada. Revisa calle y distrito abajo; ajústalos si no coinciden con tu puerta.");
          scrollPreviewIntoView();
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
          setMsg("Permiso de ubicación denegado. Usa el mapa o escribe la dirección.");
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
    if (q.length < SEARCH_MIN) {
      setMsg(`Escribe al menos ${SEARCH_MIN} caracteres para buscar.`);
      return;
    }
    setSearchBusy(true);
    setMsg("");
    try {
      const hits = await loadSearchResults(q);
      setSearchHits(hits);
      setSuggestOpen(true);
      if (!hits.length) setMsg("Sin resultados. Prueba otra palabra o coloca el pin en el mapa.");
    } catch (e) {
      setSearchHits([]);
      setMsg(e?.message || "Búsqueda no disponible.");
    } finally {
      setSearchBusy(false);
    }
  };

  const elegirHit = (h) => {
    clearBlurClose();
    mergeDireccion({
      calle: h.calle || h.label?.split(",")[0]?.trim() || "",
      distrito: h.distrito || "",
      lat: h.lat,
      lng: h.lng,
      fuente: "mapa",
      etiqueta: h.label || "",
    });
    setSearchHits([]);
    setSuggestOpen(false);
    setMsg("Ubicación aplicada. Puedes afinar el pin en el mapa.");
    scrollPreviewIntoView();
  };

  const lineaFormulario = [direccion.calle, direccion.distrito]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" · ");
  const resumenEntrega = lineaFormulario || direccion.etiqueta?.trim() || "";

  const patchManual = (patch) => {
    mergeDireccion({ ...patch, fuente: "manual" });
  };

  const tone = msgTone(msg);
  const listboxId = "delivery-geo-suggest";
  const showSuggestPanel = suggestOpen && (searchHits.length > 0 || geoSuggestBusy);

  return (
    <div className="delivery-editor">
      <p className="delivery-editor__intro">
        Entrega orientativa en <strong>~1 h</strong> según tráfico y cocina. Indica el punto exacto: GPS, mapa o texto.
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
            El sistema pedirá permiso de ubicación. Si no deseas compartirla, elige mapa o solo texto.
          </p>
        </div>
      ) : null}

      {assist === "map" ? (
        <div className="delivery-editor__panel">
          <div className="delivery-editor__gps-inline">
            <button type="button" className="btn btn--outline-dark" disabled={gpsBusy} onClick={usarUbicacionActual}>
              {gpsBusy ? "Ubicación…" : "Usar mi ubicación GPS aquí"}
            </button>
            <span className="hint delivery-editor__gps-inline-hint">Misma acción que en «Mi ubicación», sin cambiar de pestaña.</span>
          </div>

          <div className="delivery-editor__search-wrap">
            <div className="delivery-editor__search">
              <input
                type="search"
                className="input"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestPanel}
                aria-controls={listboxId}
                placeholder="Escribe calle, avenida o distrito…"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setMsg("");
                }}
                onFocus={() => {
                  clearBlurClose();
                  setSuggestOpen(true);
                  const q = searchQ.trim();
                  if (q.length >= SEARCH_MIN && searchHits.length === 0 && !geoSuggestBusy) {
                    setSuggestKick((k) => k + 1);
                  }
                }}
                onBlur={() => scheduleCloseSuggest()}
                maxLength={120}
              />
              <button type="button" className="btn btn--surface" disabled={searchBusy} onClick={() => void buscarDireccion()}>
                {searchBusy ? "Buscando…" : "Buscar"}
              </button>
            </div>
            <p className="hint delivery-editor__search-hint">
              A partir de {SEARCH_MIN} letras se muestran direcciones sugeridas. Elige una o ajusta el mapa.
            </p>
            {showSuggestPanel ? (
              <ul id={listboxId} className="delivery-editor__suggest" role="listbox">
                {geoSuggestBusy && !searchHits.length ? (
                  <li className="delivery-editor__suggest-status" role="presentation">
                    Buscando direcciones…
                  </li>
                ) : null}
                {searchHits.map((h, i) => (
                  <li key={`${h.lat}-${h.lng}-${i}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      className="delivery-editor__hit"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => elegirHit(h)}
                    >
                      {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <DeliveryMapPicker lat={direccion.lat} lng={direccion.lng} onPositionChange={onMapMove} />
          <p className="hint delivery-editor__fineprint">
            Toca el mapa o arrastra el pin. La dirección se actualiza al soltar el pin.
          </p>
        </div>
      ) : null}

      {assist === "write" ? (
        <p className="hint delivery-editor__fineprint">
          Calle y número, distrito y referencias claras ayudan al repartidor a llegar sin demoras.
        </p>
      ) : null}

      {resumenEntrega ? (
        <div ref={previewRef} className="delivery-editor__preview" role="status">
          <span className="delivery-editor__preview-kicker">Punto de entrega</span>
          <p className="delivery-editor__preview-main">{resumenEntrega}</p>
        </div>
      ) : null}

      <div className="booking__grid booking__grid--2 delivery-editor__fields">
        <div className="field">
          <label className="label">
            Dirección (calle y número)<span className="req">*</span>
          </label>
          <input
            className="input"
            value={direccion.calle}
            onChange={(e) => patchManual({ calle: e.target.value })}
            placeholder="Av. Larco 123, Dpto 402"
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
            onChange={(e) => patchManual({ distrito: e.target.value })}
            placeholder="Miraflores"
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
          <label className="label">Referencia para el reparto</label>
          <input
            className="input"
            value={direccion.referencia}
            onChange={(e) => {
              setDireccionField("referencia", e.target.value);
              setDireccionField("fuente", "manual");
            }}
            placeholder="Portón azul, timbre 2, referencia frente al parque"
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
        <div
          className={
            tone === "success"
              ? "notice notice--success notice--spaced"
              : tone === "notice"
                ? "notice notice--spaced"
                : "error"
          }
          role="status"
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}
