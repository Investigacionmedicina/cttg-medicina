/**
 * DOM integration tests for estudiante_dashboard.html
 *
 * Strategy: extract the full <script> block from the HTML (IIFE included),
 * inject the body into jsdom, set localStorage + mock fetch BEFORE eval so
 * the IIFE initialises properly (sets the closed-over `user` from localStorage
 * and starts cargarMisRad).  Wait for all pending promises after each eval.
 */

const fs   = require('fs');
const path = require('path');

// Re-read the HTML fresh after every require cache clear (jest resets modules)
const HTML_PATH   = path.join(__dirname, '..', 'estudiante_dashboard.html');
const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

// ── helpers ─────────────────────────────────────────────────────────────────

function extractBodyHtml() {
  const m = htmlContent.match(/<body>([\s\S]*?)<\/body>/i);
  if (!m) return '';
  // Strip all <script> blocks so eval controls execution
  return m[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractScript() {
  // The main script block immediately before </body>
  const m = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  return m ? m[1] : '';
}

const BODY_HTML  = extractBodyHtml();
const SCRIPT_RAW = extractScript(); // full script INCLUDING the IIFE

// Canonical valid session
const MOCK_USER  = { nombre: 'Ana López', email: 'ana@usc.edu.co', rol: 'estudiante' };
const MOCK_TOKEN = 'tok-test-999';

// A sample in-progress radicacion (non-terminal state → bloquearNuevaRad=true)
function makeRad(overrides = {}) {
  return {
    rowIndex: 1, numero: 'RAD-001', titulo: 'Mi tesis', estado: 'Radicado',
    fechaRadicacion: '2025-02-10', modalidad: 'Trabajo de investigación',
    tutor1Nombre: 'Dr. X', semestre1: '8',
    ...overrides,
  };
}

// Fetch mock that handles all GAS actions with neutral responses
function mockFetchDefault() {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      radicaciones: [],
      actas: [],
      protocolos: [],
      fase3: [],
    }),
  });
}

// Let all micro/macrotasks from chained async functions complete
async function flushPromises(rounds = 6) {
  for (let i = 0; i < rounds; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Boot the page:
 * 1. Set localStorage
 * 2. Mock fetch
 * 3. Inject body HTML into jsdom
 * 4. Mock window.location (to prevent navigation)
 * 5. eval the FULL script — the IIFE sets user from localStorage and starts cargarMisRad
 * 6. Flush promises so initial async load completes
 */
async function bootPage({
  user  = MOCK_USER,
  token = MOCK_TOKEN,
  fetchSetup = null,
} = {}) {
  localStorage.clear();
  if (user)  localStorage.setItem('cttg_user',  JSON.stringify(user));
  if (token) localStorage.setItem('cttg_token', token);

  if (fetchSetup) fetchSetup();
  else            mockFetchDefault();

  document.body.innerHTML = BODY_HTML;

  // Prevent actual navigation
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: 'http://localhost/estudiante_dashboard.html' },
  });

  // Eval full script; the IIFE runs and sets `user` (closed-over) from localStorage
  window.eval(SCRIPT_RAW);

  // Wait for cargarMisRad + actualizarBotonesFases promise chains
  await flushPromises();
}

// ============================================================
// 1. AUTENTICACIÓN — redirección si la sesión no es válida
// ============================================================
describe('Autenticación y redirección', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchDefault();
    document.body.innerHTML = BODY_HTML;
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true,
      value: { href: 'http://localhost/' },
    });
  });

  test('redirige cuando no hay usuario en localStorage', () => {
    localStorage.clear();
    window.eval(SCRIPT_RAW);
    expect(window.location.href).toContain('login');
  });

  test('redirige cuando rol !== estudiante', () => {
    localStorage.setItem('cttg_user',  JSON.stringify({ nombre: 'X', email: 'x@x.com', rol: 'coordinadora' }));
    localStorage.setItem('cttg_token', 'tok-x');
    window.eval(SCRIPT_RAW);
    expect(window.location.href).toContain('login');
  });

  test('redirige cuando falta el token', () => {
    localStorage.setItem('cttg_user', JSON.stringify(MOCK_USER));
    // no token
    window.eval(SCRIPT_RAW);
    expect(window.location.href).toContain('login');
  });

  test('no redirige con sesión válida', () => {
    localStorage.setItem('cttg_user',  JSON.stringify(MOCK_USER));
    localStorage.setItem('cttg_token', MOCK_TOKEN);
    window.eval(SCRIPT_RAW);
    expect(window.location.href).not.toContain('login');
  });
});

// ============================================================
// 2. switchTab
// ============================================================
describe('switchTab', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test('activa el panel correspondiente y desactiva el anterior', () => {
    const tabNueva = document.querySelector('.tab:last-child');
    window.switchTab('nueva', tabNueva);
    expect(document.getElementById('pan-nueva').classList.contains('on')).toBe(true);
    expect(document.getElementById('pan-mis-rad').classList.contains('on')).toBe(false);
  });

  test('activa la clase "on" en el botón de tab', () => {
    const tabNueva = document.querySelector('.tab:last-child');
    window.switchTab('nueva', tabNueva);
    expect(tabNueva.classList.contains('on')).toBe(true);
  });

  test('volver a mis-rad activa ese panel y desactiva nueva', () => {
    const tabNueva = document.querySelector('.tab:last-child');
    const tabMis   = document.querySelector('.tab:first-child');
    window.switchTab('nueva', tabNueva);
    window.switchTab('mis-rad', tabMis);
    expect(document.getElementById('pan-mis-rad').classList.contains('on')).toBe(true);
    expect(document.getElementById('pan-nueva').classList.contains('on')).toBe(false);
  });

  test('bloquea tab "nueva" con toast cuando bloquearNuevaRad=true', async () => {
    // Trigger bloquearNuevaRad=true via cargarMisRad with in-progress rad
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [makeRad()], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();

    const tabNueva = document.querySelector('.tab:last-child');
    window.switchTab('nueva', tabNueva);

    expect(document.getElementById('pan-nueva').classList.contains('on')).toBe(false);
    expect(document.getElementById('toast').classList.contains('show')).toBe(true);
  });
});

// ============================================================
// 3. setEst — campos de estudiantes adicionales
// ============================================================
describe('setEst', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test('1 estudiante: oculta est2 y est3', () => {
    window.setEst(1, document.querySelector('.ne'));
    document.querySelectorAll('.est2, .est3').forEach(el => {
      expect(el.style.display).toBe('none');
    });
  });

  test('2 estudiantes: muestra est2, oculta est3', () => {
    window.setEst(2, document.querySelector('.ne:nth-child(2)'));
    document.querySelectorAll('.est2').forEach(el => expect(el.style.display).not.toBe('none'));
    document.querySelectorAll('.est3').forEach(el => expect(el.style.display).toBe('none'));
  });

  test('3 estudiantes: muestra est2 y est3', () => {
    window.setEst(3, document.querySelector('.ne:nth-child(3)'));
    document.querySelectorAll('.est2, .est3').forEach(el => {
      expect(el.style.display).not.toBe('none');
    });
  });

  test('marca el botón activo con clase "on"', () => {
    const btns = document.querySelectorAll('.ne');
    window.setEst(2, btns[1]);
    expect(btns[1].classList.contains('on')).toBe(true);
    expect(btns[0].classList.contains('on')).toBe(false);
    expect(btns[2].classList.contains('on')).toBe(false);
  });
});

// ============================================================
// 4. toast
// ============================================================
describe('toast', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test('muestra el mensaje en el elemento #toast', () => {
    window.toast('Error de prueba', 'err');
    expect(document.getElementById('toast').textContent).toBe('Error de prueba');
  });

  test('agrega clase del tipo (err / ok / warn)', () => {
    window.toast('Atención', 'warn');
    expect(document.getElementById('toast').classList.contains('warn')).toBe(true);
  });

  test('agrega clase "show"', () => {
    window.toast('OK', 'ok');
    expect(document.getElementById('toast').classList.contains('show')).toBe(true);
  });
});

// ============================================================
// 5. limpiar
// ============================================================
describe('limpiar', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test('vacía los inputs de texto del formulario', () => {
    ['cedula1','nombre1','email1','telefono1','titulo','tutor1Nombre','tutor1Email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'valor-previo';
    });
    window.limpiar();
    ['cedula1','nombre1','email1','telefono1','titulo','tutor1Nombre','tutor1Email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) expect(el.value).toBe('');
    });
  });

  test('oculta la caja de éxito', () => {
    document.getElementById('successBox').style.display = 'block';
    window.limpiar();
    expect(document.getElementById('successBox').style.display).toBe('none');
  });

  test('vuelve a 1 estudiante (oculta campos est2)', () => {
    window.setEst(3, document.querySelector('.ne:nth-child(3)'));
    window.limpiar();
    document.querySelectorAll('.est2').forEach(el => {
      expect(el.style.display).toBe('none');
    });
  });
});

// ============================================================
// 6. radicar — validación
// ============================================================
describe('radicar — validación de campos', () => {
  function fillRequired() {
    const v = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    v('cedula1','12345678'); v('nombre1','María Pérez'); v('email1','maria@usc.edu.co');
    v('telefono1','3001234567'); v('semestre1','8');
    v('titulo','Mi proyecto'); v('modalidad','Trabajo de investigación');
    v('area','Pediatría');
    v('tutor1Nombre','Dr. García'); v('tutor1Email','garcia@usc.edu.co');
  }

  beforeEach(async () => {
    await bootPage();  // bloquearNuevaRad=false (empty radicaciones)
    mockFetchDefault();
  });

  test.each([
    ['cedula1',     'Cédula estudiante 1'],
    ['nombre1',     'Nombre estudiante 1'],
    ['email1',      'Email estudiante 1'],
    ['telefono1',   'Teléfono estudiante 1'],
    ['titulo',      'Título del proyecto'],
    ['modalidad',   'Modalidad'],
    ['area',        'Área'],
    ['tutor1Nombre','Nombre del tutor 1'],
    ['tutor1Email', 'Email del tutor 1'],
  ])('muestra toast warn si falta "%s"', async (fieldId) => {
    fillRequired();
    document.getElementById(fieldId).value = '';
    await window.radicar();
    const t = document.getElementById('toast');
    expect(t.classList.contains('show')).toBe(true);
    expect(t.classList.contains('warn')).toBe(true);
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: expect.stringContaining('createRadicacion') })
    );
  });

  test('bloquea radicar cuando bloquearNuevaRad=true', async () => {
    // Activate block via cargarMisRad
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [makeRad()], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();
    fillRequired();
    global.fetch.mockClear();

    await window.radicar();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('valida campos del estudiante 2 cuando numEst=2', async () => {
    fillRequired();
    window.setEst(2, document.querySelector('.ne:nth-child(2)'));
    // no fields for student 2 filled
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('warn')).toBe(true);
  });

  test('valida campos del estudiante 3 cuando numEst=3', async () => {
    fillRequired();
    window.setEst(3, document.querySelector('.ne:nth-child(3)'));
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('warn')).toBe(true);
  });

  test('rechaza tutor 2 con nombre pero sin email', async () => {
    fillRequired();
    document.getElementById('tutor2Nombre').value = 'Dr. Ramos';
    document.getElementById('tutor2Email').value  = '';
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('warn')).toBe(true);
  });

  test('rechaza tutor 2 con email pero sin nombre', async () => {
    fillRequired();
    document.getElementById('tutor2Nombre').value = '';
    document.getElementById('tutor2Email').value  = 'ramos@usc.edu.co';
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('warn')).toBe(true);
  });
});

// ============================================================
// 7. radicar — envío y respuesta del servidor
// ============================================================
describe('radicar — envío al servidor', () => {
  function fillAll() {
    const v = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    v('cedula1','99887766'); v('nombre1','Carlos Ruiz'); v('email1','carlos@usc.edu.co');
    v('telefono1','3109998877'); v('semestre1','10');
    v('titulo','Análisis clínico'); v('modalidad','Trabajo de investigación');
    v('area','Epidemiología');
    v('tutor1Nombre','Dra. Mora'); v('tutor1Email','mora@usc.edu.co');
  }

  beforeEach(async () => {
    await bootPage();
    mockFetchDefault();
  });

  test('llama a fetch con action=createRadicacion cuando el formulario es válido', async () => {
    fillAll();
    global.fetch.mockResolvedValueOnce({ json: async () => ({ success: true, numero: 'RAD-2025-001' }) });
    await window.radicar();
    const createCall = global.fetch.mock.calls.find(([, opts]) =>
      opts && opts.body && opts.body.includes('createRadicacion')
    );
    expect(createCall).toBeTruthy();
    const body = JSON.parse(createCall[1].body);
    expect(body.action).toBe('createRadicacion');
    expect(body.emailEstudiante).toBe(MOCK_USER.email);
  });

  test('muestra success-box con el número de radicación al éxito', async () => {
    fillAll();
    global.fetch.mockResolvedValueOnce({ json: async () => ({ success: true, numero: 'RAD-2025-007' }) });
    await window.radicar();
    expect(document.getElementById('successBox').style.display).toBe('block');
    expect(document.getElementById('numRadResult').textContent).toBe('RAD-2025-007');
  });

  test('oculta el botón radicar tras éxito', async () => {
    fillAll();
    global.fetch.mockResolvedValueOnce({ json: async () => ({ success: true, numero: 'RAD-X' }) });
    await window.radicar();
    expect(document.getElementById('btnRad').style.display).toBe('none');
  });

  test('muestra toast err cuando servidor retorna success=false', async () => {
    fillAll();
    // Use a generic error that does NOT match the session-redirect regex
    global.fetch.mockResolvedValueOnce({ json: async () => ({ success: false, error: 'Formulario incompleto' }) });
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('err')).toBe(true);
  });

  test('muestra toast err en error de red', async () => {
    fillAll();
    global.fetch.mockRejectedValueOnce(new Error('red caída'));
    await window.radicar();
    expect(document.getElementById('toast').classList.contains('err')).toBe(true);
  });

  test('el botón se reactiva después de un error', async () => {
    fillAll();
    global.fetch.mockRejectedValueOnce(new Error('red caída'));
    await window.radicar();
    expect(document.getElementById('btnRad').disabled).toBe(false);
  });
});

// ============================================================
// 8. cargarMisRad
// ============================================================
describe('cargarMisRad', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test('muestra "Cargando..." antes de resolver la petición', () => {
    // Never-resolving fetch
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    window.cargarMisRad(); // don't await
    expect(document.getElementById('misRadWrap').innerHTML).toContain('Cargando');
  });

  test('renderiza tarjetas de radicaciones al cargar datos', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [makeRad()], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();
    const html = document.getElementById('misRadWrap').innerHTML;
    expect(html).toContain('RAD-001');
    expect(html).toContain('Mi tesis');
  });

  test('muestra estado vacío cuando no hay radicaciones', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();
    expect(document.getElementById('misRadWrap').innerHTML).toContain('No tienes radicaciones');
  });

  // Regression: cargarMisRad crasheaba con TypeError cuando data.radicaciones era undefined.
  // Debe mostrar el estado vacío (no "Error al cargar") y la promesa debe resolver.
  test('muestra estado vacío (no error) cuando data.radicaciones es undefined [regression]', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true }), // radicaciones ausente
    });
    await window.cargarMisRad();
    const html = document.getElementById('misRadWrap').innerHTML;
    expect(html).not.toContain('Error al cargar');
    expect(html).toContain('No tienes radicaciones');
  });

  test('muestra "Error al cargar" si fetch falla', async () => {
    global.fetch.mockRejectedValue(new Error('red caída'));
    await window.cargarMisRad();
    expect(document.getElementById('misRadWrap').innerHTML).toContain('Error al cargar');
  });

  test('el HTML renderizado escapa caracteres especiales (XSS)', async () => {
    const xssRad = makeRad({ titulo: '<script>alert("xss")</script>', numero: 'RAD-XSS' });
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [xssRad], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();
    const html = document.getElementById('misRadWrap').innerHTML;
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('bloquea acceso a nueva radicación cuando hay una en proceso', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, radicaciones: [makeRad()], actas: [], protocolos: [], fase3: [] }),
    });
    await window.cargarMisRad();
    // bloquearNuevaRad should now be true
    const tabNueva = document.querySelector('.tab:last-child');
    window.switchTab('nueva', tabNueva);
    expect(document.getElementById('pan-nueva').classList.contains('on')).toBe(false);
  });
});

// ============================================================
// 9. redirigirSiSesionInvalida
// ============================================================
describe('redirigirSiSesionInvalida', () => {
  beforeEach(async () => {
    await bootPage();
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true,
      value: { href: 'http://localhost/' },
    });
  });

  test('devuelve false y no redirige si success=true', () => {
    const result = window.redirigirSiSesionInvalida({ success: true });
    expect(result).toBe(false);
    expect(window.location.href).not.toContain('login');
  });

  test('redirige si el mensaje contiene "sesión"', () => {
    window.redirigirSiSesionInvalida({ success: false, error: 'Sesión expirada' });
    expect(window.location.href).toContain('login');
  });

  test('redirige si el mensaje contiene "token"', () => {
    window.redirigirSiSesionInvalida({ success: false, error: 'Token inválido' });
    expect(window.location.href).toContain('login');
  });

  test('no redirige para errores genéricos sin palabras clave de sesión', () => {
    const result = window.redirigirSiSesionInvalida({ success: false, error: 'Error interno del servidor' });
    expect(result).toBe(false);
    expect(window.location.href).not.toContain('login');
  });
});
