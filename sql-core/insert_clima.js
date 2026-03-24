const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'TuPasswordFuerte!2026',
    server: '190.56.16.85',
    database: 'PortalCore',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function insertClima() {
    try {
        await sql.connect(config);
        
        // Ensure App is registered
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM AplicacionSistema WHERE Codigo = 'clima')
            INSERT INTO AplicacionSistema (Codigo, Nombre, Ruta, Icono, OrdenVisual)
            VALUES ('clima', 'Clima Laboral', 'http://localhost:5177', 'SunMedium', 4)
        `);

        // Ensure Permission is registered
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM PermisoSistema WHERE Codigo = 'app.clima')
            INSERT INTO PermisoSistema (Codigo, Nombre, Modulo, Descripcion)
            VALUES ('app.clima', 'Acceso Clima', 'clima', 'Acceso al módulo Clima')
        `);

        // Bind permission to EMPLEADO
        await sql.query(`
            DECLARE @IdRol INT = (SELECT IdRol FROM RolSistema WHERE Codigo = 'EMPLEADO');
            DECLARE @IdPermiso INT = (SELECT IdPermiso FROM PermisoSistema WHERE Codigo = 'app.clima');
            IF NOT EXISTS (SELECT * FROM RolPermiso WHERE IdRol = @IdRol AND IdPermiso = @IdPermiso)
            BEGIN
                INSERT INTO RolPermiso (IdRol, IdPermiso) VALUES (@IdRol, @IdPermiso)
            END
        `);
        
        console.log('Clima registrado correctamente en PortalCore.');
        process.exit(0);
    } catch (err) {
        console.error('Error insertando datos Clima:', err);
        process.exit(1);
    }
}

insertClima();
