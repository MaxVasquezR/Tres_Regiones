# Tres Regiones

Aplicación web para operación de restaurante (cliente y administración): carta, pedidos, reservas con política de depósito, cuentas y panel de operación.

## Stack

- **Frontend:** React 19 + Vite + React Router
- **Backend:** Node.js HTTP (sin framework), API bajo `/api`
- **Persistencia:** JSON en disco (`DATA_FILE` o `server/data.json` por defecto)
- **Auth:** token firmado (HMAC) + sesión en el cliente

## Desarrollo local

1. `npm install`
2. `cp .env.example .env` y ajuste variables si lo desea
3. `npm run dev:all` → front en `http://localhost:5173`, API en `http://127.0.0.1:8787`

## Credenciales de ejemplo (solo desarrollo)

Con el seed por defecto puede usar usuario `admin` y la clave definida en `ADMIN_PASSWORD` (por defecto en `.env.example` es débil a propósito). Cambie siempre estas credenciales antes de exponer el servicio a Internet.

## Scripts

```bash
npm run dev       # solo frontend
npm run server    # solo backend
npm run dev:all   # frontend + backend
npm run test      # pruebas backend
npm run lint
npm run build     # genera dist/ (usa .env.production para VITE_*)
npm run start     # sirve API + estáticos desde dist/ (requiere build previo)
```

## Producción y contrato

Para dominio, HTTPS, build desplegado y datos persistentes sin depender de su máquina de desarrollo, siga **[DEPLOY.md](./DEPLOY.md)** (Docker Compose, Caddy, checklist y variables obligatorias).

Puntos clave:

- `NODE_ENV=production` fuerza un `JWT_SECRET` distinto del valor de desarrollo.
- `GET /api/health` y `GET /api/version` sirven para comprobar despliegue y versiones.

## Variables de entorno (backend)

Vea `.env.example` y la tabla en `DEPLOY.md` (`PORT`, `HOST`, `JWT_SECRET`, `ADMIN_*`, `CORS_ORIGIN`, `DATA_FILE`, límites y rate limit).

## Rutas principales

**Cliente:** `/`, `/login`, `/register`, `/reservar`, `/confirmacion`, carrito y checkout según configuración del router.

**Administrador:** `/admin/login`, `/admin/dashboard`, `/admin/operaciones`, cuentas, reservas, calendario, pedidos, perfil.

## Próximos pasos de producto (fuera de este repo)

Para escala enterprise suele sumar: base de datos relacional, refresh tokens, cookies httpOnly, observabilidad centralizada y backups automatizados del almacén de datos.
