import { DatabaseService } from './src/shared/database/database.service';
import * as argon2 from 'argon2';
require('dotenv').config();

async function resetPasswords() {
    const db = new DatabaseService();
    try {
        const pool = await db.Pool;
        const newPassword = '123456';
        const hash = await argon2.hash(newPassword);
        
        console.log('--- RESETEANDO CONTRASEÑAS EN PORTAL CORE ---');
        console.log(`Nueva clave: ${newPassword}`);
        console.log(`Hash generado: ${hash.slice(0, 20)}...`);

        const result = await pool.request()
            .input('hash', hash)
            .query('UPDATE CuentaPortal SET ClaveHash = @hash, FechaModificacion = GETDATE()');
        
        console.log(`✅ ¡Éxito! Se actualizaron ${result.rowsAffected[0]} cuentas.`);
    } catch (e) {
        console.error('❌ Error al resetear contraseñas:', e.message);
    }
    process.exit(0);
}

void resetPasswords();
