import crypto from "node:crypto";

const PBKDF2_ITERS = 120_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const idx = stored.indexOf(":");
  if (idx <= 0) return false;
  const saltHex = stored.slice(0, idx);
  const hashHex = stored.slice(idx + 1);
  let salt;
  let expected;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  if (hash.length !== expected.length) return false;
  return crypto.timingSafeEqual(hash, expected);
}

/** Hash estable por “pepper” (p. ej. correo o `admin:usuario`) para migraciones y credencial admin. */
export function hashPasswordDeterministic(password, pepper) {
  const salt = crypto.createHash("sha256").update(`sazon:v1:${pepper}`).digest().subarray(0, 16);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function b64urlDecodeJson(s) {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function signAccessToken(payload, secret) {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const body = b64urlJson(payload);
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyAccessToken(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  try {
    const sigBuf = Buffer.from(s, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }
  const payload = b64urlDecodeJson(p);
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.exp === "number" && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}
