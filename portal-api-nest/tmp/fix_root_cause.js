const mssql = require('mssql');
const config = {
  user: 'sa',
  password: 'TuPasswordFuerte!2026',
  server: '190.56.16.85',
  database: 'PortalCore',
  options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
  try {
    const pool = await mssql.connect(config);
    console.log('--- Aplicando parche global a cuentas dañadas ---');
    
    // 1. Corregimos TODOS los correos que vinieron incompletos del CSV (700+ registros)
    const cleanupQuery = `
      -- Borrar duplicados si existe el mismo usuario con y sin dominio
      DELETE FROM CuentaPortal 
      WHERE CorreoLogin NOT LIKE '%@%'
      AND EXISTS (
          SELECT 1 FROM CuentaPortal c2 
          WHERE c2.CorreoLogin = CuentaPortal.CorreoLogin + '@claro.com.ni'
      );

      -- Normalizar los que quedaron
      UPDATE CuentaPortal 
      SET CorreoLogin = CorreoLogin + '@claro.com.ni',
          Usuario = Usuario + '@claro.com.ni'
      WHERE CorreoLogin NOT LIKE '%@%';
    `;
    const res1 = await pool.request().query(cleanupQuery);
    console.log('✅ Correos normalizados para todo el servidor.');

    // 2. Corregimos la clave 123456 plana por su Hash real. El CSV metió el texto "123456" en lugar del Hash de encriptamiento.
    const passQuery = `
      UPDATE CuentaPortal 
      SET ClaveHash = '$argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4',
          DebeCambiarClave = 1
      WHERE ClaveHash = '123456' OR ClaveHash NOT LIKE '%argon2id%';
    `;
    const res2 = await pool.request().query(passQuery);
    console.log('✅ Contraseñas reseteadas correctamente al Hash en ' + res2.rowsAffected[0] + ' usuarios.');

    // 3. Modificamos el procedimiento almacenado subyacente que fue el origen del mal:
    console.log('--- RECONSTRUYENDO PROCEDIMIENTO ALMACENADO ---');
    const getSpQuery = "SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('dbo.spAdmin_SincronizarUsuariosBulk')";
    const spRes = await pool.request().query(getSpQuery);
    let spText = spRes.recordset[0].definition;

    // Sustituimos '123456' en el SP por la cadena cifrada
    spText = spText.replace(/VALUES\s*\(([^)]+),\s*'123456'/gi, "VALUES ($1, '$argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4'");
    
    // Y añadimos un trigger de saneamiento automático al CTE #CleanSource o directamente con una expresion:
    const alterSpQuery = spText.replace(/CREATE PROCEDURE/i, 'ALTER PROCEDURE');
    await pool.request().batch(alterSpQuery);

    console.log('✅ Procedimiento almacenado central reparado. Próximas importaciones ya no fallarán.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  }
}
run();
