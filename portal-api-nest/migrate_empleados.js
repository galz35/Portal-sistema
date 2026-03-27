const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'TuPasswordFuerte!2026',
    server: '190.56.16.85',
    database: 'PortalCore',
    options: { encrypt: false, trustServerCertificate: true }
};

async function migrateData() {
    try {
        const pool = await sql.connect(config);
        console.log('Migrando datos desde la vista externa a la tabla local Empleado...');
        await pool.request().query(`
            INSERT INTO Empleado (
                Carnet, IdHcm, NombreCompleto, Correo, Cargo, Empresa, Departamento, Direccion, 
                FechaIngreso, FechaBaja, Telefono, Sexo, Gerencia, Subgerencia, Area, 
                JefeCarnet, JefeNombre, JefeCorreo, IdOrg, Nivel1, Nivel2, Nivel3
            )
            SELECT 
                carnet, idhcm, nombre_completo, correo, cargo, empresa, Departamento, Direccion,
                fechaingreso, fechabaja, telefono, Gender, primernivel, segundo_nivel, tercer_nivel,
                carnet_jefe1, nom_jefe1, correo_jefe1, idorg, primernivel, segundo_nivel, tercer_nivel
            FROM vwEmpleadoPortal
            WHERE carnet IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Empleado WHERE Carnet = vwEmpleadoPortal.carnet)
        `);
        console.log('Migración completada.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrateData();
