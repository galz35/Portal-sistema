const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'TuPasswordFuerte!2026',
    server: '190.56.16.85',
    database: 'PortalCore',
    options: { encrypt: false, trustServerCertificate: true }
};

async function cloneTable() {
    try {
        const pool = await sql.connect(config);
        console.log('Borrando tabla Empleado anterior...');
        await pool.request().query("IF OBJECT_ID('Empleado', 'U') IS NOT NULL DROP TABLE Empleado;");
        
        console.log('Clonando tabla EMP2024 desde Inventario_RRHH...');
        await pool.request().query(`
            SELECT * INTO dbo.Empleado 
            FROM Inventario_RRHH.dbo.EMP2024;
        `);
        
        console.log('Añadiendo Llave Primaria al carnet...');
        await pool.request().query("ALTER TABLE Empleado ALTER COLUMN carnet VARCHAR(50) NOT NULL;");
        await pool.request().query("ALTER TABLE Empleado ADD CONSTRAINT PK_Empleado PRIMARY KEY (carnet);");
        
        console.log('¡Tabla Empleado clonada exitosamente con estructura idéntica!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cloneTable();
