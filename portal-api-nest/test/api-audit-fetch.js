const API_URL = 'http://127.0.0.1:3001';

async function runStrongTests() {
  console.log(`\n🔥 INICIANDO AUDITORIA FUERTE: PORTAL API (${API_URL})\n`);

  const results = [];
  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      results.push({ name, pass: true });
    } catch (err) {
      console.log(`❌ [FAIL] ${name}`);
      console.log(`   👉 ${err.message}`);
      results.push({ name, pass: false, error: err.message });
    }
  };

  // 1. Conectividad y Salud (Respuesta RAW sin .data)
  await runTest('Health Check - Servicio Base', async () => {
    const res = await fetch(`${API_URL}/api/health`);
    const body = await res.json();
    if (res.status !== 200 || body.status !== 'ok') throw new Error(`Status ${res.status}`);
  });

  await runTest('Health Check - SQL Connection', async () => {
    const res = await fetch(`${API_URL}/api/health`);
    const body = await res.json();
    if (body.database !== 'connected') throw new Error('DB is disconnected');
  });

  // 2. Auth - Rechazo de credenciales
  await runTest('Auth - Rechazar Login Inválido (401)', async () => {
    const res = await fetch(`${API_URL}/api/auth/login-empleado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'fake_user_test_99', clave: 'no_pass' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 3. Guards - Rutas Protegidas
  await runTest('Guard - Profile (/me) Protegido (401)', async () => {
    const res = await fetch(`${API_URL}/api/auth/me`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest('Guard - Core Apps Protegido (401)', async () => {
    const res = await fetch(`${API_URL}/api/core/apps`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  console.log(`\n--- RESUMEN PORTAL API: ${results.filter(r => r.pass).length}/${results.length} ---`);
}

runStrongTests();
