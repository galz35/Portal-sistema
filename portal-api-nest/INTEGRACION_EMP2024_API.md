# API Integracion EMP2024 (Portal API Test)

Base URL:
- `https://rhclaroni.com/api-portal-test/integracion/emp2024/empleados`

Autenticacion (usar una):
- Bearer: `Authorization: Bearer <INTEGRATION_API_TOKEN>`
- Basic: `Authorization: Basic <base64(usuario:clave)>`
- Alternativo headers: `x-api-token` o `x-api-user` + `x-api-pass`

## GET
Consulta empleados (segun tabla de usuarios configurada para este backend).

Query params:
- `limit` (opcional, default 100, max 2000)
- `carnet` (opcional)
- `correo` (opcional)

Ejemplo:
```bash
curl -sS "https://rhclaroni.com/api-portal-test/integracion/emp2024/empleados?limit=50" \
  -H "Authorization: Bearer <TOKEN>"
```

## POST
Inserta o actualiza (`upsert`) empleado.

Campos:
- `carnet` string (requerido)
- `nombre` string (requerido)
- `correo` string (opcional)
- `cargo` string (opcional)
- `departamento` string (opcional)
- `gerencia` string (opcional)
- `subgerencia` string (opcional)
- `area` string (opcional)
- `jefeCarnet` string (opcional)
- `idRol` number (opcional)
- `pais` string (opcional)
- `rolGlobal` string (opcional)
- `activo` boolean (opcional, default `true`)

Ejemplo:
```bash
curl -sS -X POST "https://rhclaroni.com/api-portal-test/integracion/emp2024/empleados" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "carnet":"EMP2024-PORTAL",
    "nombre":"Empleado API Portal",
    "correo":"emp2024.portal@claro.com.ni",
    "jefeCarnet":"854",
    "idRol":3,
    "pais":"NI",
    "activo":true
  }'
```
