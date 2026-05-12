# TRES REGIONES - Mini Demo Profesional

Aplicacion de demo para un restaurante peruano turistico con dos experiencias:

- **Cliente**: exploracion de carta, registro/login y reserva con politica de deposito.
- **Administrador**: operacion de sala (dashboard, cuentas, reservas, calendario y perfil de local).

## Stack

- **Frontend:** React 19 + Vite + React Router
- **Backend:** Node.js HTTP server (sin framework)
- **Persistencia demo:** `server/data.json`
- **Auth:** token firmado (JWT-like HMAC) + sesion local

## Quickstart (2 minutos)

1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
cp .env.example .env
```

3. Levanta API + frontend:

```bash
npm run dev:all
```

4. Abre:
- Frontend: `http://localhost:5173`
- API: `http://127.0.0.1:8787`

## Credenciales demo

### Administrador
- **Usuario:** `admin`
- **Clave:** `123456`

### Cliente
- **Correo:** `cliente@sazon.com`
- **Clave:** `123456`

## Scripts

```bash
npm run dev       # solo frontend
npm run server    # solo backend
npm run dev:all   # frontend + backend
npm run test      # pruebas backend (node:test)
npm run lint
npm run build
npm run preview
```

## Rutas principales

### Cliente
- `/`
- `/login`
- `/register`
- `/reservar`
- `/confirmacion`

### Administrador
- `/admin/login`
- `/admin/dashboard`
- `/admin/cuentas`
- `/admin/reservas`
- `/admin/calendario`
- `/admin/perfil`

## Caracteristicas profesionales incluidas

- Validaciones completas de reservas, cuentas y autenticacion.
- Asignacion automatica de mesa por zona/capacidad/disponibilidad.
- Politica de deposito modelada en flujo cliente y gestion admin.
- Fallback offline de reservas en frontend cuando la API no responde.
- Headers de seguridad, limite de payload y rate limit basico en la API.
- Logging de requests con `X-Request-Id`.

## Variables de entorno (backend)

Revisa `.env.example`:

- `PORT`
- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN`
- `BODY_LIMIT_BYTES`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

## Estado del proyecto

Esta demo esta optimizada para presentacion profesional y entrevistas tecnicas.
Para pasar a produccion real se recomienda migrar a base de datos, refresh tokens, cookies httpOnly y observabilidad centralizada.
