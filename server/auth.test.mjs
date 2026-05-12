import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, signAccessToken, verifyAccessToken, verifyPassword } from "./auth.mjs";

test("hashPassword + verifyPassword funcionan con secreto correcto", () => {
  const plain = "ClaveSegura123";
  const hash = hashPassword(plain);
  assert.equal(typeof hash, "string");
  assert.ok(hash.includes(":"));
  assert.equal(verifyPassword(plain, hash), true);
});

test("verifyPassword rechaza clave incorrecta", () => {
  const hash = hashPassword("123456");
  assert.equal(verifyPassword("654321", hash), false);
});

test("signAccessToken + verifyAccessToken validan firma y exp", () => {
  const secret = "demo-secret";
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = signAccessToken({ sub: 1, role: "client", exp }, secret);
  const payload = verifyAccessToken(token, secret);
  assert.equal(payload?.sub, 1);
  assert.equal(payload?.role, "client");
});

test("verifyAccessToken rechaza token expirado", () => {
  const secret = "demo-secret";
  const exp = Math.floor(Date.now() / 1000) - 1;
  const token = signAccessToken({ sub: 1, role: "client", exp }, secret);
  assert.equal(verifyAccessToken(token, secret), null);
});
