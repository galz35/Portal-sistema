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
    console.log('--- Iniciando Limpieza Avanzada ---');
    
    // 1. Identificar usuarios sin @ y borrar duplicados
    const cleanupQuery = `
      DECLARE @Carnet VARCHAR(50), @Correo VARCHAR(255);
      DECLARE cur CURSOR FOR SELECT Carnet, CorreoLogin FROM CuentaPortal WHERE CorreoLogin NOT LIKE '%@%';
      OPEN cur;
      FETCH NEXT FROM cur INTO @Carnet, @Correo;
      WHILE @@FETCH_STATUS = 0
      BEGIN
          IF EXISTS (SELECT 1 FROM CuentaPortal WHERE CorreoLogin = @Correo + '@claro.com.ni')
          BEGIN
              PRINT 'Borrando duplicado incompleto: ' + @Correo;
              DELETE FROM UsuarioAplicacion WHERE IdCuentaPortal = (SELECT IdCuentaPortal FROM CuentaPortal WHERE CorreoLogin = @Correo);
              DELETE FROM CuentaPortal WHERE CorreoLogin = @Correo;
          END
          ELSE
          BEGIN
              PRINT 'Normalizando correo: ' + @Correo;
              UPDATE CuentaPortal SET CorreoLogin = @Correo + '@claro.com.ni', Usuario = @Correo + '@claro.com.ni' WHERE CorreoLogin = @Correo;
          END
          FETCH NEXT FROM cur INTO @Carnet, @Correo;
      END
      CLOSE cur; DEALLOCATE cur;
    `;
    const res1 = await pool.request().query(cleanupQuery);
    console.log('✅ Normalización completada.');

    // 2. Resetear claves para usuarios específicos
    const passQuery = `
        UPDATE CuentaPortal 
        SET ClaveHash = '$argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4',
            DebeCambiarClave = 1
        WHERE CorreoLogin IN ('abel.siezar@claro.com.ni', 'aaron.murillo@claro.com.ni')
    `;
    await pool.request().query(passQuery);
    console.log('✅ Claves reseteadas para Aaron y Abel.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}
run();
