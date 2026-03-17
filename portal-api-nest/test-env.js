const dotenv = require('dotenv');
const path = require('path');
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('Error cargando .env:', result.error);
} else {
  console.log('--- Variables de Entorno Detectadas ---');
  const keys = ['PORT', 'MSSQL_HOST', 'MSSQL_PORT', 'MSSQL_DATABASE', 'RATE_LIMIT_MAX', 'CORS_ORIGIN'];
  keys.forEach(key => {
    console.log(`${key}: [${process.env[key]}] (Tipo: ${typeof process.env[key]})`);
  });
}
