/** Lleva la vista al inicio de la carta (hero / primera pantalla). */
export function scrollHomeTop(behavior = "smooth") {
  const opts = { top: 0, left: 0, behavior };

  window.scrollTo(opts);
  document.documentElement.scrollTo(opts);
  document.body.scrollTo(opts);

  const main = document.querySelector(".client-main");
  if (main && typeof main.scrollTo === "function") {
    main.scrollTo(opts);
  }

  const inicio = document.getElementById("inicio");
  if (inicio) {
    inicio.scrollIntoView({ behavior, block: "start" });
  }
}
