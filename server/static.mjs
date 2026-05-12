import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export async function distReady() {
  try {
    await fs.access(path.join(DIST_DIR, "index.html"));
    return true;
  } catch {
    return false;
  }
}

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function cacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "no-cache";
  if ([".js", ".css", ".woff", ".woff2"].includes(ext)) return "public, max-age=31536000, immutable";
  return "public, max-age=86400";
}

function safeDistPath(urlPath) {
  const rel = decodeURIComponent(String(urlPath || "/").split("?")[0] || "/");
  const normalized = path.posix.normalize(rel.startsWith("/") ? rel : `/${rel}`);
  const relative = normalized.replace(/^\/+/, "");
  const filePath = path.resolve(DIST_DIR, relative);
  const distRoot = `${DIST_DIR}${path.sep}`;
  if (!filePath.startsWith(distRoot)) return null;
  return filePath;
}

async function readFileIfExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;
    return { stat, data: await fs.readFile(filePath) };
  } catch {
    return null;
  }
}

function writeStatic(res, filePath, data, method) {
  res.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Content-Length": data.length,
    "Cache-Control": cacheControl(filePath),
  });
  if (method === "HEAD") res.end();
  else res.end(data);
}

export async function tryServeStatic(req, res, urlPath) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") return false;

  const candidates = [];
  const direct = safeDistPath(urlPath);
  if (direct) candidates.push(direct);

  const cleanPath = String(urlPath || "/").split("?")[0] || "/";
  if (cleanPath !== "/" && !path.posix.extname(cleanPath)) {
    const spa = safeDistPath("/index.html");
    if (spa) candidates.push(spa);
  }

  for (const filePath of candidates) {
    const hit = await readFileIfExists(filePath);
    if (!hit) continue;
    writeStatic(res, filePath, hit.data, method);
    return true;
  }

  const indexPath = safeDistPath("/index.html");
  const indexHit = indexPath ? await readFileIfExists(indexPath) : null;
  if (!indexHit) return false;
  writeStatic(res, indexPath, indexHit.data, method);
  return true;
}
