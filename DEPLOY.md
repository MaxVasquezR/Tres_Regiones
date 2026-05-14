# Despliegue en producción

Objetivo: **un solo proceso Node** sirve la API (`/api/*`) y el front estático compilado (`dist/`), detrás de **HTTPS** (Caddy, nginx, balanceador del proveedor, etc.).

## Requisitos

- Dominio apuntando al servidor (registro A/AAAA o CNAME).
- Node 20+ en VPS sin contenedor, o **Docker** (imagen con Node 22 Alpine).
- Variables sensibles fuera del repositorio (`.env` en el servidor, secretos del PaaS).

## Build del cliente (mismo origen)

El front debe llamar a la API en el **mismo host**. En el repo, `VITE_API_BASE` está vacío en `.env.production`; el build usa rutas relativas `/api/...`.

## Variables de entorno (obligatorias en producción)

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` (activa validación de `JWT_SECRET`). |
| `JWT_SECRET` | Secreto largo y aleatorio; **no** puede ser el valor por defecto de desarrollo. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Credenciales del panel admin; use contraseña fuerte (≥8 caracteres recomendado). |
| `CORS_ORIGIN` | Origen exacto del sitio, p. ej. `https://restaurante.ejemplo.com` (evite `*` en Internet). |
| `DATA_FILE` | Ruta absoluta al `data.json` persistente (volumen Docker o disco del VPS). |

Opcionales: `PORT`, `HOST`, `BODY_LIMIT_BYTES`, `RATE_LIMIT_*`.

## Docker (recomendado)

En el servidor, con Docker y plugin Compose:

```bash
cp .env.example .env
# Edite .env: JWT_SECRET, ADMIN_PASSWORD, CORS_ORIGIN=https://su-dominio.com
docker compose up -d --build
```

Los datos viven en el volumen `appdata` montado en `/data/data.json` dentro del contenedor.

Comprobaciones:

- `GET https://su-dominio.com/api/health` → `static: true`, `datastore: true`.
- `GET https://su-dominio.com/api/version` → versión del `package.json`.

## HTTPS con Caddy (VPS)

1. Instale [Caddy](https://caddyserver.com/) y copie `deploy/Caddyfile.example` a `/etc/caddy/Caddyfile`, sustituyendo `{$SITE_DOMAIN}` por su dominio (o use un bloque `tu-dominio.com { ... }`).
2. Asegúrese de que la app escuche en `127.0.0.1:8787` (Compose puede mapear solo localhost si expone el puerto al host y Caddy hace proxy a ese puerto).
3. `sudo systemctl reload caddy` (o el comando equivalente).

Caddy obtendrá certificados TLS automáticamente con Let's Encrypt si el dominio resuelve bien al servidor y el puerto 443 está abierto.

## Sin Docker (VPS)

```bash
npm ci
npm run build
export NODE_ENV=production
export JWT_SECRET=...
export ADMIN_PASSWORD=...
export CORS_ORIGIN=https://su-dominio.com
export DATA_FILE=/var/lib/tres-regiones/data.json
node server/index.mjs
```

Use **systemd**, **pm2** o similar para reinicios y logs; coloque Caddy/nginx delante para TLS.

## Fly.io / Railway / Render

Patrón general (Node **20+** en desarrollo; imagen Docker con Node 22):

1. Build: `npm ci && npm run build`.
2. Start: `node server/index.mjs`.
3. Defina las mismas variables en el panel del proveedor.
4. Disco persistente: configure volumen o almacenamiento para `DATA_FILE` (sin volumen, los datos se pierden al redeploy).

En **Render** con la imagen de este repo, el `Dockerfile` ya define `DATA_FILE=/data/data.json`. Añada un **Persistent Disk** montado en `/data` si necesita que reservas y pedidos sobrevivan a reinicios.

Plantilla opcional: `fly.toml.example` (renombrar y ajustar `app` / `primary_region`).

## Checklist antes de ofrecer el producto

- [ ] Dominio + HTTPS activo.
- [ ] `JWT_SECRET` y `ADMIN_PASSWORD` únicos y no filtrados en logs.
- [ ] `CORS_ORIGIN` acorde al dominio público.
- [ ] Copia de seguridad periódica del archivo en `DATA_FILE`.
- [ ] `/api/health` responde 200 con `static` y `datastore` en true tras un deploy limpio.
