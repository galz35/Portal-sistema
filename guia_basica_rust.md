# 🦀 Guía de Supervivencia: Entendiendo nuestro `backendrust`

Esta guía está diseñada para que tú, viniendo de TypeScript (NestJS), entiendas exactamente cómo está construido el backend de Rust (Axum + Tiberius) que se hizo en 2 días bajo alta presión.

## 1. El Diccionario Node.js ➡️ Rust

Para que tu cerebro haga la transición rápido:
*   `package.json` -> `Cargo.toml` (Aquí van las dependencias)
*   `npm run dev` -> `bacon` o `cargo run`
*   `Express / NestJS` -> `Axum` (Framework web)
*   `TypeORM / Prisma` -> **¡No usamos!** Usamos `Tiberius` para llamar Stored Procedures puros.
*   `app.module.ts` -> `app.rs` / `router.rs`
*   `Controllers` -> `handlers/` (Funciones puras de Axum)

---

## 2. La Anatomía de un "Endpoint" en nuestro Rust

En NestJS hacías una clase `@Controller` con decoradores. En **Axum**, defines una ruta y la conectas a una función asíncrona (el "Handler").

### A) El Controlador (Handler): `src/handlers/proyectos.rs`
Fíjate en esta función, este es nuestro pan de cada día a la hora de mutar la base:

```rust
// 1. Recibimos el "State" (conexión a DB) y el "Body" (JSON)
pub async fn crear_proyecto(
    State(state): State<Arc<ApiState>>,
    Json(payload): Json<CrearProyectoDto>,
) -> Result<Json<RespuestaExitosa>, AppError> {

    // 2. Pedimos una conexión a la base de datos (bb8-tiberius)
    let mut client = state.db.get().await.map_err(|_| AppError::DbError)?;

    // 3. Ejecutamos un Stored Procedure de tu servidor SQL Server
    client.execute(
        "EXEC sp_Proyectos_Crear @Nombre = @p1", 
        &[&payload.nombre] // @p1 es inyectado aquí seguro
    ).await.map_err(|_| AppError::DbError)?;

    // 4. Retornamos OK (JSON)
    Ok(Json(RespuestaExitosa { mensaje: "Creado".into() }))
}
```

### B) El Enrutador: `src/router.rs`
Aquí es donde conectas la ruta con la función de arriba:

```rust
use axum::{routing::post, Router};

pub fn crear_rutas() -> Router<Arc<ApiState>> {
    Router::new()
        // Cuando hagan POST a /proyectos, corre la función crear_proyecto
        .route("/proyectos", post(crear_proyecto))
}
```

---

## 3. El Dolor Actual: Convertir Datos (Modelos)

La razón por la que ves tanto código abultado en `backendrust` es porque **Rust es extremadamente quisquilloso con la memoria**.
Si el SP te devuelve un texto `VARCHAR` o un nulo `NULL`, en Rust eso es de vida o muerte. Debes declarar explícitamente cuándo algo puede faltar.

```rust
// DTO de TypeScript (Lo que envías)
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")] // Automáticamente convierte tuJsonCamelCase a rust_snake_case
pub struct CrearProyectoDto {
    pub nombre: String,           // Obligatorio
    pub descripcion: Option<String> // El 'Option' significa que puede ser NULL
}
```

---

## 4. Práctica: Tu Proyecto "Hola Mundo"
Si quieres practicar de cero para perderle el miedo a Rust sin romper la producción:

1. **Instalar Rust:** Ejecuta `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. **Crear app:** `cargo new mi_api_practica_rust`
3. Dale permisos a la base de instalar el framework: `cargo add axum tokio --features tokio/full`
4. Reemplaza tu `src/main.rs` con:
   ```rust
   use axum::{routing::get, Router};

   #[tokio::main]
   async fn main() {
       // Nuestro primer Handler anónimo!
       let app = Router::new().route("/", get(|| async { "¡Hola Gustavo!" }));
       
       // El listener escuchando el puerto
       let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
       axum::serve(listener, app).await.unwrap();
   }
   ```
5. Corre localmente: Ejecuta `cargo run`. Entra a `localhost:3000` y listo. Has levantado tu primer servidor asíncrono.
