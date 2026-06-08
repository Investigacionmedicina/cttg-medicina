/**
 * Smoke tests against deployed Apps Script Web App.
 * Usage: node tools/test-api-smoke.mjs [email] [password]
 */
const URL_APP =
  'https://script.google.com/macros/s/AKfycbxThWOEZZWmJTZ9SsAdEOE7a2e0ai9uddlZBGTUz7rt-iq2VepCf0YC8r4trjAiF7MhlA/exec';

async function api(body) {
  const res = await fetch(URL_APP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { status: res.status, data: null, raw: text };
  }
}

function ok(label, cond, detail = '') {
  const pass = !!cond;
  console.log((pass ? '✅' : '❌') + ' ' + label + (detail ? ' — ' + detail : ''));
  return pass;
}

let passed = 0;
let failed = 0;
function tally(p) {
  if (p) passed++;
  else failed++;
}

async function main() {
  console.log('── Smoke API CTTG Medicina ──\nURL:', URL_APP, '\n');

  // 1. Login vacío
  let r = await api({ action: 'login', email: '', password: '' });
  tally(ok('login vacío rechazado', r.data?.error === 'Credenciales incompletas', r.data?.error));

  // 2. Acción sin token → sesión inválida (auth antes del switch)
  r = await api({ action: 'solicitarCancelacionRadicacion', rowIndex: 2, motivo: 'test motivo largo' });
  tally(ok('cancelación sin token pide sesión', /sesión inválida|sesion invalida/i.test(r.data?.error || ''), r.data?.error));

  // 3. Acción desconocida sin token → también sesión inválida
  r = await api({ action: '__accion_inexistente_xyz__' });
  tally(ok('acción inventada sin token', /sesión inválida|sesion invalida/i.test(r.data?.error || ''), r.data?.error));

  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('\n⚠ Sin credenciales: node tools/test-api-smoke.mjs <email> <password>');
    console.log(`\nResumen: ${passed} OK, ${failed} FAIL`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // 4. Login real
  r = await api({ action: 'login', email, password });
  tally(ok('login estudiante', r.data?.success && r.data?.token, r.data?.error || r.data?.user?.rol));
  if (!r.data?.success || !r.data?.token) {
    console.log(`\nResumen: ${passed} OK, ${failed} FAIL`);
    process.exit(1);
  }
  const token = r.data.token;
  const userEmail = r.data.user?.email || email;
  console.log('   Usuario:', userEmail, '| rol:', r.data.user?.rol);

  // 5. getFase1ByEmail
  r = await api({ action: 'getFase1ByEmail', email: userEmail, token });
  tally(ok('getFase1ByEmail', r.data?.success, r.data?.error));
  const rads = r.data?.radicaciones || [];
  console.log('   Radicaciones:', rads.length);
  rads.slice(0, 5).forEach((x) =>
    console.log('   ·', x.numero, '| fila', x.rowIndex, '| estado:', x.estado)
  );

  // 6. Buscar radicación cancelable
  const LIBERA = ['Aprobado', 'Devuelto', 'Cancelada'];
  const NO_CANCEL = ['Cancelación solicitada', 'Cancelada', 'Sustentado', 'Reprobado'];
  const cancelable = rads.find((x) => {
    const est = String(x.estado || '').trim();
    return est && !LIBERA.includes(est) && !NO_CANCEL.includes(est);
  });

  if (!cancelable) {
    console.log('\n⚠ No hay radicación en estado cancelable para probar solicitarCancelacionRadicacion.');
    console.log('  (Necesita estado distinto de Aprobado/Devuelto/Cancelada/Cancelación solicitada/Sustentado/Reprobado)');
  } else {
    console.log('\n── Prueba solicitarCancelacionRadicacion (DRY: solo validación, NO enviar) ──');
    console.log('   Objetivo:', cancelable.numero, 'fila', cancelable.rowIndex, 'estado', cancelable.estado);

    // Motivo corto → debe fallar validación
    r = await api({
      action: 'solicitarCancelacionRadicacion',
      rowIndex: cancelable.rowIndex,
      motivo: 'corto',
      token,
    });
    tally(
      ok(
        'motivo corto rechazado',
        r.data?.success === false && /motivo|10 caracteres/i.test(r.data?.error || ''),
        r.data?.error
      )
    );

    // Fila inválida
    r = await api({
      action: 'solicitarCancelacionRadicacion',
      rowIndex: 1,
      motivo: 'motivo de prueba automatizada largo',
      token,
    });
    tally(ok('fila 1 rechazada', r.data?.success === false, r.data?.error));

    // ¿Enviar cancelación real? Solo si CTTG_SMOKE_SEND_CANCEL=1
    if (process.env.CTTG_SMOKE_SEND_CANCEL === '1') {
      r = await api({
        action: 'solicitarCancelacionRadicacion',
        rowIndex: cancelable.rowIndex,
        motivo: 'Prueba automatizada smoke test ' + new Date().toISOString(),
        token,
      });
      tally(ok('solicitar cancelación REAL', r.data?.success, r.data?.error || r.data?.numero));
    } else {
      console.log('   (Omitido envío real; export CTTG_SMOKE_SEND_CANCEL=1 para probar escritura en Sheet)');
    }
  }

  // 7. Coordinadora: resolver sin rol
  r = await api({
    action: 'resolverCancelacionRadicacion',
    rowIndex: 2,
    aprobar: true,
    notas: 'test',
    emailCoord: userEmail,
    token,
  });
  tally(
    ok(
      'estudiante no puede resolver cancelación',
      r.data?.success === false && /no autorizado/i.test(r.data?.error || ''),
      r.data?.error
    )
  );

  console.log(`\nResumen: ${passed} OK, ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
