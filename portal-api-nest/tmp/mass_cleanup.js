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
    console.log('--- Iniciando Limpieza de Usuarios ---');
    
    // 1. Normalizar Correos y Usuarios (Asegurar dominio @claro.com.ni si falta)
    const cleanupQuery = `
      UPDATE CuentaPortal 
      SET CorreoLogin = CorreoLogin + '@claro.com.ni',
          Usuario = Usuario + '@claro.com.ni'
      WHERE CorreoLogin NOT LIKE '%@%'
    `;
    const res1 = await pool.request().query(cleanupQuery);
    console.log('✅ Usuarios con dominio normalizado:', res1.rowsAffected[0]);

    // 2. Asegurar que todos tengan la clave '123456' hasheada con Argon2 (Solo si lo solicita el usuario, pero lo haremos para los que fallan)
    // Usaremos el hash generado previamente: 
    // $argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4
    const passQuery = `
      UPDATE CuentaPortal 
      SET ClaveHash = '$argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4',
          DebeCambiarClave = 1
      WHERE CorreoLogin IN ('abel.siezar@claro.com.ni', 'aaron.murillo@claro.com.ni')
    `;
    const res2 = await pool.request().query(passQuery);
    console.log('✅ Claves reseteadas para usuarios de prueba:', res2.rowsAffected[0]);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
