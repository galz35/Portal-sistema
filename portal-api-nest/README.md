# Portal API Nest

Backend NestJS de transicion para `portal-web`, montado sobre Fastify.

## Endpoints cubiertos

- `POST /api/auth/login-empleado`
- `GET /api/auth/session-state`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/core/apps`
- `GET /api/health`

## Notas

- Usa almacenamiento en memoria para sesiones y datos demo.
- Mantiene compatibilidad con el frontend actual basado en `fetch("/api/...")`.
- Puerto por defecto: `3001`.

## Seguridad base

- Cookies `httpOnly`
- Helmet en Fastify
- Rate limit por minuto
- Validacion DTO con `ValidationPipe`

## Arranque

```bash
npm install
npm run start:dev
```
