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
| `CORS_ORIGIN` | Origen del sitio (p. ej. `https://tu-app.onrender.com`). En **Render**, si lo deja vacío, la API usa `RENDER_EXTERNAL_URL` automáticamente. |
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

## Render (Web Service + Docker)

1. **New +** → **Web Service** → conecte su repositorio de GitHub.
2. **Runtime:** Docker (Render detecta el `Dockerfile` en la raíz).
3. **Variables** (mínimo):
   - `JWT_SECRET`: use **Generate** en el panel o deje que el blueprint lo cree.
   - `ADMIN_PASSWORD`: clave fuerte del panel admin (≥8 caracteres recomendado).
   - `CORS_ORIGIN`: opcional; si no la define, el servidor usa `RENDER_EXTERNAL_URL` (URL pública `https://….onrender.com`).
4. **Health check path:** `/api/health`.
5. **Blueprint (opcional):** en la raíz está `render.yaml`; puede crear el servicio con **Blueprints** pegando el repo para que pida `ADMIN_PASSWORD` y genere `JWT_SECRET`.

En plan **gratis** el disco es efímero: los datos en `/data/data.json` se pierden al redeploy salvo que use instancia de pago y **Persistent Disk** montado en `/data`.

## Fly.io / Railway (y otros PaaS)

1. Build: `npm ci && npm run build`.
2. Start: `node server/index.mjs` (o la imagen Docker de este repo).
3. Defina `JWT_SECRET`, `ADMIN_PASSWORD` y `CORS_ORIGIN` (o confíe en `RENDER_EXTERNAL_URL` solo en Render).
4. Disco persistente: configure volumen para `DATA_FILE` si no quiere perder datos al redeploy.

Plantilla opcional: `fly.toml.example` (renombrar y ajustar `app` / `primary_region`).

## Checklist antes de ofrecer el producto

- [ ] Dominio + HTTPS activo.
- [ ] `JWT_SECRET` y `ADMIN_PASSWORD` únicos y no filtrados en logs.
- [ ] `CORS_ORIGIN` acorde al dominio público (en Render puede omitirse si usa solo `onrender.com`).
- [ ] Copia de seguridad periódica del archivo en `DATA_FILE`.
- [ ] `/api/health` responde 200 con `static` y `datastore` en true tras un deploy limpio.
