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
    const res = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('dbo.spAdmin_SincronizarUsuariosBulk')");
    console.log(res.recordset[0].definition);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
