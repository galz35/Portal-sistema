const mssql = require('mssql');

const dbConfig = {
  user: 'sa',
  password: 'TuPasswordFuerte!2026',
  server: '190.56.16.85',
  options: { encrypt: false, trustServerCertificate: true }
};

async function syncUsers() {
  console.log('🔄 INICIANDO SINCRONIZACION MAESTRA: PLANER -> PORTAL (v4 FINAL)');
  
  try {
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT carnet, correo, nombreCompleto FROM [Bdplaner].[dbo].[p_Usuarios] 
      WHERE activo = 1 AND carnet IS NOT NULL
    `);
    
    const employees = result.recordset;
    const defaultHash = '$argon2id$v=19$m=65536,t=3,p=4$WZyUIWzbAnp3ZWweMHZfuw$XlIb+88k/31RCKiXl8hnpBBi9KflJg87XJEFTF0N1lwQ';

    console.log(`✅ ${employees.length} empleados encontrados.`);

    let creados = 0;
    let omitidos = 0;

    for (const emp of employees) {
      const usuario = emp.carnet.trim();
      
      const check = await pool.request()
        .input('Usuario', usuario)
        .query('SELECT IdCuentaPortal FROM [PortalCore].[dbo].[CuentaPortal] WHERE Usuario = @Usuario');
      
      if (check.recordset.length > 0) {
        omitidos++;
        continue;
      }

      try {
        // A. Insertar en Persona
        const resPersona = await pool.request()
          .input('Nombres', emp.nombreCompleto)
          .input('Correo', emp.correo)
          .input('Carnet', usuario)
          .query(`
            INSERT INTO [PortalCore].[dbo].[Persona] (Nombres, PrimerApellido, SegundoApellido, CorreoPersonal, NumeroDocumento, FechaCreacion, Activo)
            VALUES (@Nombres, '', '', @Correo, @Carnet, GETDATE(), 1);
            SELECT SCOPE_IDENTITY() as id;
          `);
        
        const idPersona = resPersona.recordset[0].id;

        // B. Insertar en CuentaPortal (Inlcuyendo Carnet y EsInterno)
        await pool.request()
          .input('IdPersona', idPersona)
          .input('Usuario', usuario)
          .input('Carnet', usuario)
          .input('Correo', emp.correo)
          .input('ClaveHash', defaultHash)
          .query(`
            INSERT INTO [PortalCore].[dbo].[CuentaPortal] (IdPersona, Usuario, Carnet, CorreoLogin, ClaveHash, Activo, Bloqueado, EsInterno, EsExterno, FechaCreacion)
            VALUES (@IdPersona, @Usuario, @Carnet, @Correo, @ClaveHash, 1, 0, 1, 0, GETDATE())
          `);

        creados++;
      } catch (err) {
        console.error(`❌ Error carnet ${usuario}:`, err.message);
      }
    }

    console.log(`🚀 RESULTADO: Creados: ${creados} | Omitidos: ${omitidos}`);
    process.exit();
  } catch (err) {
    console.error('💥 Error:', err);
    process.exit(1);
  }
}

syncUsers();
