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
        await pool.request().query(`
            IF OBJECT_ID('Empleado', 'U') IS NOT NULL DROP TABLE Empleado;
            CREATE TABLE Empleado (
                Carnet VARCHAR(50) PRIMARY KEY,
                IdHcm INT,
                NombreCompleto VARCHAR(500),
                Correo VARCHAR(250),
                Cargo VARCHAR(250),
                Empresa VARCHAR(250),
                Departamento VARCHAR(250),
                Direccion VARCHAR(1000),
                FechaIngreso DATE,
                FechaBaja DATE,
                Telefono VARCHAR(50),
                Sexo VARCHAR(20),
                Gerencia VARCHAR(250),
                Subgerencia VARCHAR(250),
                Area VARCHAR(250),
                JefeCarnet VARCHAR(50),
                JefeNombre VARCHAR(250),
                JefeCorreo VARCHAR(250),
                IdOrg VARCHAR(100),
                Nivel1 VARCHAR(250),
                Nivel2 VARCHAR(250),
                Nivel3 VARCHAR(250),
                FechaCreacion DATETIME DEFAULT GETDATE(),
                FechaModificacion DATETIME DEFAULT GETDATE()
            );
        `);
        console.log('Tabla Empleado creada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createTable();
