# Análisis Base para Futura Migración de Portal Core a Rust 🦀

**Fecha de Análisis:** 2026-03-29
**Objetivo:** Establecer la hoja de ruta, el esfuerzo requerido y las decisiones arquitectónicas para migrar `portal-api-nest` (Portal Central) a Rust, tomando como referencia el éxito y los aprendizajes técnicos de la migración en los nodos hijos (`portal-planer` y `portal-clima`).

---

## 1. ⏱️ Esfuerzo Estimado y Complejidad

**Nivel de Esfuerzo:** BAJO / MEDIO (Aprox. 2 a 4 días de programación concentrada).
**Justificación:**
- A diferencia de los nodos hijos que poseen cientos de rutas de negocio complejas, el Portal Central opera principalmente como el **Identity Provider (IdP)**. Tiene menos de 20 endpoints críticos (Login, Sesiones, CSRF, Sincronización Masiva).
- El **70% de la arquitectura fundacional** (`Cargo.toml`, configuraciones de Axum, `db.rs` con Tiberius/bb8, y utilidades de encriptación) se reciclará directamente de `portal-planer/backendrust`.

---

## 2. 🛡 Retos Críticos a Resolver en Rust

El foco de esta migración no son las consultas SQL (que son pocas), sino la **Seguridad Perimetral y el Estado HTTP**:
1. **Gestión de Cookies Seguras:** Migrar la firma robusta de `cookie-parser` de NestJS a la librería de Rust compatible dentro de Axum (`tower-cookies`).
2. **Protección Anti-CSRF:** Implementar la validación e inyección de tokens dinámicos en las cabeceras/cookies requeridos para toda mutación.
3. **Seguridad JWT y Hashes Híbridos:** Soportar la verificación de claves en texto y su transición transparente a Argon2, que ya es el estándar en las migraciones recientes.
4. **Sincronización de Red Concurrente:** Traducir los `fetch` en bucle (lotes de 50) a llamadas asíncronas de alto rendimiento utilizando `Reqwest` en Rust.

---

## 3. 🛠 Decisión de Herramientas y Frameworks (DX)

Basado en la extensa investigación previa (`2026-03-30_rust_referencia`):

### ❌ Frameworks "Nuevos" Descartados para este Backend
- **Loco (Rails for Rust):** Loco asume que el universo del proyecto y la base de datos se manejan a través de su ORM (`SeaORM`). Dado que Portal Core utiliza fuertemente SQL Server y Stored Procedures (cuyo soporte en SeaORM/SQLx está roto e incompleto), **Loco no es viable y causaría cuellos de botella severos**.

### ✅ Nuestro Stack Definitivo
- **Axum + Tokio:** Sigue siendo la decisión más acertada. Nos da el control granular necesario para manipular cabeceras, sesiones JWT y middlewares de seguridad estricta, empatando el rendimiento C10k sin sacrificar legibilidad.
- **Tiberius (bb8-tiberius):** Seguiremos con este driver nativo de SQL Server para ejecutar nuestros SPs y consultas crudas de manera segura.

### 🥓 La Joya de la Experiencia de Desarrollo (DX): `Bacon`
- **¿Por qué?** Empezaremos el proyecto utilizando `bacon` como observador (watcher) principal en las terminales del VPS o entorno de desarrollo local. Evita lanzar `cargo check` manual e identifica instantáneamente conflictos de tipado estricto (como incompatibilidades entre interfaces DTO y respuestas SQL). Es obligatorio para lograr la estimación de tiempos de 2-4 días.

---

## 4. 🏁 Conclusión y Próximos Pasos (Cuando inicie el proyecto)

Cuando se decida reemplazar completamente el proceso de PM2 de Node.js del Portal Central, el agente responsable deberá seguir los siguientes pasos:
1. Crear la carpeta `backendrust` dentro de `portal-core`.
2. Inicializar un binario (`cargo init`) y copiar el `Cargo.toml` base de *Planer*.
3. Levantar la capa `security.rs` y `db.rs` como prioridad número uno.
4. Implementar los middlewares de `Cookie` y `SessionGuard`.
5. Replicar al final los `handlers` de `auth.rs` y `admin.rs`.

El Portal Core en Rust será el cerebro de identidad de todo el ecosistema Claro; la meta es **Cero Pérdida de Paquetes, Cero Caídas por RAM, y Ejecución Inmediata**.
