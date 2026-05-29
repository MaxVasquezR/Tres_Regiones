import test from "node:test";
import assert from "node:assert/strict";
import { distritoClave, zonaPorDistrito, sedeActiva, calcularEta } from "./delivery.mjs";

const store = {
  sedes: [
    { id: "olivos", distrito: "Los Olivos", activa: true },
    { id: "comas", distrito: "Comas", activa: true },
    { id: "cerrada", distrito: "Surco", activa: false },
  ],
  zonasDelivery: [
    { distrito: "Los Olivos", sedeId: "olivos", minutosMin: 20, minutosMax: 30, costoSoles: 5, activa: true },
    { distrito: "San Martín de Porres", sedeId: "smp", minutosMin: 25, minutosMax: 35, costoSoles: 6, activa: true },
    { distrito: "Carabayllo", sedeId: "comas", minutosMin: 35, minutosMax: 50, costoSoles: 8, activa: false },
  ],
  comandas: [],
};

test("distritoClave normaliza acentos, mayúsculas y espacios", () => {
  assert.equal(distritoClave("  SAN  Martín   de PORRES "), "san martin de porres");
  assert.equal(distritoClave("Los Olivos"), "los olivos");
});

test("zonaPorDistrito encuentra cobertura ignorando acentos/mayúsculas", () => {
  assert.equal(zonaPorDistrito(store, "los olivos")?.sedeId, "olivos");
  assert.equal(zonaPorDistrito(store, "SAN MARTIN DE PORRES")?.sedeId, "smp");
});

test("zonaPorDistrito rechaza distritos sin cobertura o zona inactiva", () => {
  assert.equal(zonaPorDistrito(store, "Miraflores"), null);
  assert.equal(zonaPorDistrito(store, "Carabayllo"), null);
  assert.equal(zonaPorDistrito(store, ""), null);
});

test("sedeActiva ignora sedes inactivas", () => {
  assert.equal(sedeActiva(store, "olivos")?.id, "olivos");
  assert.equal(sedeActiva(store, "cerrada"), null);
});

test("calcularEta suma recargo por cola de cocina de la sede", () => {
  const zona = store.zonasDelivery[0];
  const sinCola = calcularEta(store, "olivos", zona);
  assert.deepEqual([sinCola.etaMin, sinCola.etaMax], [20, 30]);

  const conCola = {
    ...store,
    comandas: [
      { sedeId: "olivos", estado: "Pendiente_cocina" },
      { sedeId: "olivos", estado: "En_preparacion" },
      { sedeId: "comas", estado: "Pendiente_cocina" },
    ],
  };
  const eta = calcularEta(conCola, "olivos", zona);
  assert.deepEqual([eta.etaMin, eta.etaMax], [23, 33]);
  assert.equal(eta.etaTexto, "23–33 min");
});
