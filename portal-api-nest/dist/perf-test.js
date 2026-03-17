"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const database_service_1 = require("./shared/database/database.service");
const fs = require("fs");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const db = app.get(database_service_1.DatabaseService);
    let output = '';
    try {
        const start = Date.now();
        output += '--- ROW COUNTS ---\n';
        const counts = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM CuentaPortal) as CuentaPortalCount,
        (SELECT COUNT(*) FROM Persona) as PersonaCount,
        (SELECT COUNT(*) FROM UsuarioAplicacion) as UsuarioAplicacionCount
    `);
        output += JSON.stringify(counts, null, 2) + '\n';
        output += `Time taken for counts: ${Date.now() - start}ms\n\n`;
        const startQuery = Date.now();
        output += '--- TEST listAllUsers QUERY ---\n';
        await db.query(`
        SELECT 
          cp.IdCuentaPortal, 
          cp.Usuario, 
          cp.CorreoLogin, 
          cp.Activo, 
          p.Nombres, 
          p.PrimerApellido, 
          p.SegundoApellido, 
          cp.Carnet,
          (
            SELECT ua.IdAplicacion 
            FROM UsuarioAplicacion ua 
            WHERE ua.IdCuentaPortal = cp.IdCuentaPortal AND ua.Activo = 1 
            FOR JSON PATH
          ) as AppsJson
        FROM CuentaPortal cp
        JOIN Persona p ON cp.IdPersona = p.IdPersona
        ORDER BY p.Nombres ASC
    `);
        output += `Time taken for listAllUsers query: ${Date.now() - startQuery}ms\n\n`;
        const startOptimized = Date.now();
        output += '--- TEST OPTIMIZED QUERY (No JSON PATH) ---\n';
        await db.query(`
        SELECT 
          cp.IdCuentaPortal, 
          cp.Usuario, 
          cp.CorreoLogin, 
          cp.Activo, 
          p.Nombres, 
          p.PrimerApellido, 
          p.SegundoApellido, 
          cp.Carnet
        FROM CuentaPortal cp
        JOIN Persona p ON cp.IdPersona = p.IdPersona
        ORDER BY p.Nombres ASC
    `);
        output += `Time taken for optimized query: ${Date.now() - startOptimized}ms\n`;
    }
    catch (err) {
        output += 'Error: ' + err.message + '\n';
    }
    finally {
        fs.writeFileSync('db-perf-test.txt', output);
        await app.close();
    }
}
bootstrap();
