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
    const query = `
      UPDATE CuentaPortal 
      SET CorreoLogin = 'aaron.murillo@claro.com.ni', 
          Usuario = 'aaron.murillo@claro.com.ni', 
          ClaveHash = '$argon2id$v=19$m=65536,t=3,p=4$IF0ViOF3r/QCycTvp8sLig$wa3CFzed/tcJD8z0He2ZtDamcXC+SWkCNjTeutSH5e4', 
          DebeCambiarClave = 1 
      WHERE CorreoLogin = 'aaron.murillo'
    `;
    const res = await pool.request().query(query);
    console.log('✅ Filas afectadas:', res.rowsAffected[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
