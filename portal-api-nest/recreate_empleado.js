const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'TuPasswordFuerte!2026',
    server: '190.56.16.85',
    database: 'PortalCore',
    options: { encrypt: false, trustServerCertificate: true }
};

async function createTable() {
    try {
        const pool = await sql.connect(config);
        console.log('Borrando tabla Empleado si existe...');
        await pool.request().query("IF OBJECT_ID('Empleado', 'U') IS NOT NULL DROP TABLE Empleado;");
        
        console.log('Creando tabla Empleado con la estructura mejorada...');
        await pool.request().query(`
            CREATE TABLE Empleado (
                Carnet VARCHAR(50) PRIMARY KEY,
                NombreCompleto VARCHAR(250),
                Correo VARCHAR(200),
                Cargo VARCHAR(250),
                Gerencia VARCHAR(250),
                Subgerencia VARCHAR(250),
                Area VARCHAR(250),
                Jefe VARCHAR(250),
                Telefono VARCHAR(50),
                Sexo VARCHAR(10),
                Activo BIT DEFAULT 1,
                FechaCreacion DATETIME DEFAULT GETDATE(),
                FechaModificacion DATETIME DEFAULT GETDATE()
            );
        `);
        console.log('¡Tabla Empleado creada en PortalCore!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createTable();
