const request = require('supertest');

const API_URL = 'http://127.0.0.1:3001';

describe('Auth System E2E', () => {
  it('Debe devolver 200 en el health check y conexión a DB', async () => {
    const res = await request(API_URL).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  it('Debe rechazar login con credenciales inexistentes (401)', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login-empleado')
      .send({
        usuario: 'usuario_no_existente_999',
        clave: 'password123'
      });
    
    // Si la lógica es correcta, debe ser 401 porque el usuario no existe en la DB
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Credenciales invalidas');
  });

  it('Debe proteger el endpoint de snapshot (401 sin sesión)', async () => {
    const res = await request(API_URL).get('/api/observabilidad/snapshot');
    expect(res.status).toBe(401);
  });
});
