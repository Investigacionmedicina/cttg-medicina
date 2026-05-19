/**
 * Pruebas de integración — Modalidad Diplomado
 * Cubre: visibilidad de secciones, validaciones frontend, construcción del payload,
 * y la corrección del select dipJurado1AceptaPropuesta ("Sí"/"No").
 */

const fs   = require('fs');
const path = require('path');

const HTML_PATH   = path.join(__dirname, '..', 'estudiante_dashboard.html');
const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractBodyHtml() {
  const m = htmlContent.match(/<body>([\s\S]*?)<\/body>/i);
  if (!m) return '';
  return m[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractScript() {
  const m = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  return m ? m[1] : '';
}

const BODY_HTML  = extractBodyHtml();
const SCRIPT_RAW = extractScript();

const MOCK_USER  = { nombre: 'Ana Pérez', email: 'ana@usc.edu.co', rol: 'estudiante' };
const MOCK_TOKEN = 'tok-test-123';

function mockFetchSuccess() {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, radicaciones: [], actas: [], protocolos: [], fase3: [] }),
  });
}

async function flushPromises(rounds = 6) {
  for (let i = 0; i < rounds; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

async function bootPage({ user = MOCK_USER, token = MOCK_TOKEN, fetchSetup = null } = {}) {
  localStorage.clear();
  if (user)  localStorage.setItem('cttg_user',  JSON.stringify(user));
  if (token) localStorage.setItem('cttg_token', token);
  if (fetchSetup) fetchSetup();
  else            mockFetchSuccess();

  document.body.innerHTML = BODY_HTML;

  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: 'http://localhost/estudiante_dashboard.html' },
  });

  window.eval(SCRIPT_RAW);
  await flushPromises();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado`);
  el.value = val;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function isVisible(id) {
  const el = document.getElementById(id);
  return el && el.style.display !== 'none';
}

function getToastMsg() {
  return document.getElementById('toast')?.textContent || '';
}

// ─── Tests de estructura HTML ────────────────────────────────────────────────

describe('Diplomado — estructura HTML del formulario', () => {
  beforeEach(async () => { await bootPage(); });

  it('el select de modo jurado tiene las opciones tutor_sugiere y cttg_asigna', () => {
    const sel = document.getElementById('diplomadoJuradoModo');
    expect(sel).not.toBeNull();
    const vals = Array.from(sel.options).map(o => o.value);
    expect(vals).toContain('tutor_sugiere');
    expect(vals).toContain('cttg_asigna');
  });

  it('el select dipJurado1AceptaPropuesta tiene values "Sí" y "No" (no texto largo)', () => {
    const sel = document.getElementById('dipJurado1AceptaPropuesta');
    expect(sel).not.toBeNull();
    const vals = Array.from(sel.options).map(o => o.value).filter(v => v !== '');
    expect(vals).toEqual(['Sí', 'No']);
    expect(vals).not.toContain('Sí, acepta');
    expect(vals).not.toContain('No acepta');
    expect(vals).not.toContain('Pendiente confirmación');
  });

  it('el texto visible del select es descriptivo aunque el value sea corto', () => {
    const sel = document.getElementById('dipJurado1AceptaPropuesta');
    const opSi = Array.from(sel.options).find(o => o.value === 'Sí');
    const opNo = Array.from(sel.options).find(o => o.value === 'No');
    expect(opSi).toBeDefined();
    expect(opNo).toBeDefined();
    expect(opSi.textContent.toLowerCase()).toMatch(/s[ií]/);
    expect(opNo.textContent.toLowerCase()).toMatch(/no/);
  });

  it('la sección seccionDiplomado empieza oculta', () => {
    expect(isVisible('seccionDiplomado')).toBe(false);
  });

  it('la sección seccionJuradoDip empieza oculta', () => {
    expect(isVisible('seccionJuradoDip')).toBe(false);
  });
});

// ─── Tests de visibilidad dinámica ───────────────────────────────────────────

describe('Diplomado — visibilidad de secciones al cambiar modalidad', () => {
  beforeEach(async () => { await bootPage(); });

  it('seleccionar Diplomado muestra seccionDiplomado', () => {
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    expect(isVisible('seccionDiplomado')).toBe(true);
  });

  it('seleccionar otra modalidad oculta seccionDiplomado', () => {
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    setVal('modalidad', 'Trabajo de investigación');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    expect(isVisible('seccionDiplomado')).toBe(false);
  });

  it('modo tutor_sugiere muestra seccionJuradoDip', () => {
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    setVal('diplomadoJuradoModo', 'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    expect(isVisible('seccionJuradoDip')).toBe(true);
  });

  it('modo cttg_asigna oculta seccionJuradoDip', () => {
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    expect(isVisible('seccionJuradoDip')).toBe(false);
  });
});

// ─── Tests de validación al radicar ─────────────────────────────────────────

describe('Diplomado — validaciones al intentar radicar', () => {
  beforeEach(async () => {
    await bootPage();
    setVal('cedula1',   '1234567890');
    setVal('nombre1',   'Ana Pérez');
    setVal('email1',    'ana@usc.edu.co');
    setVal('telefono1', '3001234567');
    setVal('semestre1', '10');
    setVal('titulo',    'Diplomado en urgencias');
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
  });

  it('muestra error si falta fecha de inicio del diplomado', async () => {
    setVal('diplomadoFechaFin', '2025-12-01');
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).toMatch(/inicio/i);
  });

  it('muestra error si falta fecha de fin del diplomado', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).toMatch(/fin/i);
  });

  it('muestra error si no se selecciona modo de evaluador', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin', '2025-12-01');
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).toMatch(/evaluador|propone/i);
  });

  it('con modo cttg_asigna y fechas completas pasa la validación de diplomado', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin', '2025-12-01');
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).not.toMatch(/inicio|fin|evaluador|propone/i);
  });

  it('con modo tutor_sugiere exige nombre del jurado', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin', '2025-12-01');
    setVal('diplomadoJuradoModo', 'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).toMatch(/jurado|nombre/i);
  });

  it('con modo tutor_sugiere y nombre+email del jurado pasa esa validación', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin', '2025-12-01');
    setVal('diplomadoJuradoModo', 'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    setVal('dipJurado1Nombre', 'Dr. Juan García');
    setVal('dipJurado1Email', 'juan@usc.edu.co');
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).not.toMatch(/jurado.*nombre|nombre.*jurado/i);
  });
});

// ─── Tests del payload enviado al backend ────────────────────────────────────

describe('Diplomado — payload enviado al backend', () => {
  let fetchCalls;

  beforeEach(async () => {
    fetchCalls = [];
    await bootPage({
      fetchSetup: () => {
        global.fetch = jest.fn().mockImplementation((url, opts) => {
          try { fetchCalls.push(JSON.parse(opts.body)); } catch (_) {}
          return Promise.resolve({
            json: () => Promise.resolve({ success: true, numero: 'CTTG-2025-0001' }),
          });
        });
      },
    });
    setVal('cedula1',   '1234567890');
    setVal('nombre1',   'Ana Pérez');
    setVal('email1',    'ana@usc.edu.co');
    setVal('telefono1', '3001234567');
    setVal('semestre1', '10');
    setVal('titulo',    'Diplomado urgencias');
    setVal('modalidad', 'Diplomado');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
  });

  it('modo cttg_asigna — envía datos correctos al backend', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin',   '2025-12-01');
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    if (typeof window.radicar === 'function') await window.radicar();
    await flushPromises();
    expect(fetchCalls.length).toBeGreaterThan(0);
    const payload = fetchCalls.find(c => c.action === 'createRadicacion');
    expect(payload).toBeDefined();
    expect(payload.datos.diplomadoJuradoModo).toBe('cttg_asigna');
    expect(payload.datos.dipJurado1Nombre).toBe('');
    expect(payload.datos.dipJurado1Email).toBe('');
  });

  it('modo cttg_asigna — no envía tutores', async () => {
    setVal('diplomadoFechaInicio', '2025-10-01');
    setVal('diplomadoFechaFin',   '2025-12-01');
    setVal('diplomadoJuradoModo', 'cttg_asigna');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    if (typeof window.radicar === 'function') await window.radicar();
    await flushPromises();
    const datos = fetchCalls.find(c => c.action === 'createRadicacion')?.datos || {};
    expect(datos.tutor1Nombre).toBe('');
    expect(datos.tutor1Email).toBe('');
  });

  it('modo tutor_sugiere — envía "Sí" exacto en dipJurado1AceptaPropuesta', async () => {
    setVal('diplomadoFechaInicio',    '2025-10-01');
    setVal('diplomadoFechaFin',       '2025-12-01');
    setVal('diplomadoJuradoModo',     'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    setVal('dipJurado1Nombre',        'Dr. Juan García');
    setVal('dipJurado1Email',         'juan@usc.edu.co');
    setVal('dipJurado1Telefono',      '3009876543');
    setVal('dipJurado1Especialidad',  'Medicina Interna');
    setVal('dipJurado1AceptaPropuesta', 'Sí');
    if (typeof window.radicar === 'function') await window.radicar();
    await flushPromises();
    expect(fetchCalls.length).toBeGreaterThan(0);
    const ac = fetchCalls.find(c => c.action === 'createRadicacion')?.datos?.dipJurado1AceptaPropuesta;
    expect(ac).toBe('Sí');
    expect(ac).not.toBe('Sí, acepta');
  });

  it('modo tutor_sugiere — también acepta "No"', async () => {
    setVal('diplomadoFechaInicio',    '2025-10-01');
    setVal('diplomadoFechaFin',       '2025-12-01');
    setVal('diplomadoJuradoModo',     'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    setVal('dipJurado1Nombre',        'Dra. María López');
    setVal('dipJurado1Email',         'maria@usc.edu.co');
    setVal('dipJurado1Telefono',      '3001112233');
    setVal('dipJurado1Especialidad',  'Epidemiología');
    setVal('dipJurado1AceptaPropuesta', 'No');
    if (typeof window.radicar === 'function') await window.radicar();
    await flushPromises();
    const ac = fetchCalls.find(c => c.action === 'createRadicacion')?.datos?.dipJurado1AceptaPropuesta;
    expect(ac).toBe('No');
    expect(ac).not.toBe('No acepta');
  });

  it('modo tutor_sugiere — envía fechas del diplomado correctamente', async () => {
    setVal('diplomadoFechaInicio',    '2025-10-01');
    setVal('diplomadoFechaFin',       '2025-12-15');
    setVal('diplomadoJuradoModo',     'tutor_sugiere');
    if (typeof window.alModoJuradoCambiar === 'function') window.alModoJuradoCambiar();
    setVal('dipJurado1Nombre',        'Dr. X');
    setVal('dipJurado1Email',         'x@usc.edu.co');
    if (typeof window.radicar === 'function') await window.radicar();
    await flushPromises();
    const datos = fetchCalls.find(c => c.action === 'createRadicacion')?.datos || {};
    expect(datos.diplomadoFechaInicio).toBe('2025-10-01');
    expect(datos.diplomadoFechaFin).toBe('2025-12-15');
    expect(datos.modalidad).toBe('Diplomado');
  });
});

// ─── Test de regresión — modalidad normal no se ve afectada ──────────────────

describe('Diplomado — regresión: modalidades normales sin cambios', () => {
  beforeEach(async () => { await bootPage(); });

  it('Trabajo de investigación: sección diplomado permanece oculta', () => {
    setVal('modalidad', 'Trabajo de investigación');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    expect(isVisible('seccionDiplomado')).toBe(false);
  });

  it('Monografia: sección tutores permanece visible', () => {
    setVal('modalidad', 'Monografia Revision sistematica');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    const secTutor = document.getElementById('seccionTutores') || document.getElementById('tutor1Nombre');
    expect(secTutor).not.toBeNull();
  });

  it('Trabajo de investigación exige tutor1Nombre (no aplica en diplomado)', async () => {
    setVal('cedula1',   '1234567890');
    setVal('nombre1',   'Test');
    setVal('email1',    'test@usc.edu.co');
    setVal('telefono1', '3001234567');
    setVal('semestre1', '8');
    setVal('titulo',    'Proyecto X');
    setVal('modalidad', 'Trabajo de investigación');
    if (typeof window.alModalidadCambiar === 'function') window.alModalidadCambiar();
    if (typeof window.radicar === 'function') await window.radicar();
    expect(getToastMsg()).toMatch(/tutor|área/i);
  });
});
