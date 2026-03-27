const mssql = require('mssql');
const argon2 = require('argon2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function resetPasswords() {
    const config = {
        server: process.env.MSSQL_HOST || '190.56.16.85',
        user: process.env.MSSQL_USER || 'sa',
        password: process.env.MSSQL_PASSWORD || 'TuPasswordFuerte!2026',
        database: process.env.MSSQL_DATABASE || 'PortalCore',
        port: Number(process.env.MSSQL_PORT || 1433),
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        console.log(`--- CONECTANDO A ${config.server} [${config.database}] ---`);
        const pool = await mssql.connect(config);
        
        const newPassword = '123456';
        const hash = await argon2.hash(newPassword);
        
        console.log(`Hash generado para "${newPassword}": ${hash.slice(0, 30)}...`);

        const result = await pool.request()
            .input('hash', hash)
            .query('UPDATE CuentaPortal SET ClaveHash = @hash, FechaModificacion = GETDATE()');
        
        console.log(`✅ ¡Éxito! Se resetearon ${result.rowsAffected[0]} contraseñas.`);
        await pool.close();
    } catch (e) {
        console.error('❌ Error fatal:', e.message);
    }
    process.exit(0);
}

resetPasswords();
