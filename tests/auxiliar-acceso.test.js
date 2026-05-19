/**
 * Tests de acceso para rol auxiliar en páginas secundarias.
 * Verifica que auxiliar no sea expulsado al navegar a coordinadora_fase3,
 * coordinadora_validar_tutores y coordinadora_actas_asesorias.
 */

const fs   = require('fs');
const path = require('path');

const MOCK_ADMIN_AUXILIAR     = { nombre: 'Aux Test', email: 'aux@usc.edu.co', rol: 'auxiliar' };
const MOCK_ADMIN_ASISTENTE    = { nombre: 'Asis Test', email: 'asis@usc.edu.co', rol: 'asistente' };
const MOCK_ADMIN_COORDINADORA = { nombre: 'Coord Test', email: 'coord@usc.edu.co', rol: 'coordinadora' };
const MOCK_TOKEN = 'tok-staff-999';

function loadPage(filename) {
  const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '') : '';
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  const script = scriptMatch ? scriptMatch[1] : '';
  return { body, script };
}

function setupPage(filename, admin, token = MOCK_TOKEN) {
  localStorage.clear();
  localStorage.setItem('cttg_admin', JSON.stringify(admin));
  localStorage.setItem('cttg_token', token);

  const { body, script } = loadPage(filename);
  document.body.innerHTML = body;

  Object.defineProperty(window, 'location', {
    configurable: true, writable: true,
    value: { href: `http://localhost/${filename}` },
  });

  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, rows: [], radicaciones: [] }),
  });

  try { window.eval(script); } catch (e) { /* fetch errors esperados en jsdom */ }
}

// ─── coordinadora_fase3.html ─────────────────────────────────────────────────

describe('coordinadora_fase3.html — acceso por rol', () => {
  it('auxiliar NO es redirigido al login', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_AUXILIAR);
    expect(window.location.href).not.toContain('login');
  });

  it('asistente NO es redirigido al login', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_ASISTENTE);
    expect(window.location.href).not.toContain('login');
  });

  it('coordinadora NO es redirigida al login', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_COORDINADORA);
    expect(window.location.href).not.toContain('login');
  });

  it('sin sesión SÍ redirige al login', () => {
    localStorage.clear();
    const { body, script } = loadPage('coordinadora_fase3.html');
    document.body.innerHTML = body;
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { href: 'http://localhost/' } });
    try { window.eval(script); } catch (_) {}
    expect(window.location.href).toContain('login');
  });
});

// ─── coordinadora_fase3.html — urlPanelStaff ─────────────────────────────────

describe('coordinadora_fase3.html — urlPanelStaff devuelve panel correcto', () => {
  it('auxiliar → asistente_dashboard.html', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_AUXILIAR);
    expect(window.urlPanelStaff()).toBe('asistente_dashboard.html');
  });

  it('asistente → asistente_dashboard.html', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_ASISTENTE);
    expect(window.urlPanelStaff()).toBe('asistente_dashboard.html');
  });

  it('coordinadora → coordinadora_dashboard.html', () => {
    setupPage('coordinadora_fase3.html', MOCK_ADMIN_COORDINADORA);
    expect(window.urlPanelStaff()).toBe('coordinadora_dashboard.html');
  });
});

// ─── coordinadora_validar_tutores.html ───────────────────────────────────────

describe('coordinadora_validar_tutores.html — acceso por rol', () => {
  it('auxiliar NO es redirigido al login', () => {
    setupPage('coordinadora_validar_tutores.html', MOCK_ADMIN_AUXILIAR);
    expect(window.location.href).not.toContain('login');
  });

  it('asistente NO es redirigido al login', () => {
    setupPage('coordinadora_validar_tutores.html', MOCK_ADMIN_ASISTENTE);
    expect(window.location.href).not.toContain('login');
  });

  it('auxiliar → urlPanelStaff devuelve asistente_dashboard.html', () => {
    setupPage('coordinadora_validar_tutores.html', MOCK_ADMIN_AUXILIAR);
    expect(window.urlPanelStaff()).toBe('asistente_dashboard.html');
  });

  it('sin sesión SÍ redirige al login', () => {
    localStorage.clear();
    const { body, script } = loadPage('coordinadora_validar_tutores.html');
    document.body.innerHTML = body;
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { href: 'http://localhost/' } });
    try { window.eval(script); } catch (_) {}
    expect(window.location.href).toContain('login');
  });
});

// ─── coordinadora_actas_asesorias.html ───────────────────────────────────────

describe('coordinadora_actas_asesorias.html — acceso por rol', () => {
  it('auxiliar NO es redirigido al login', () => {
    setupPage('coordinadora_actas_asesorias.html', MOCK_ADMIN_AUXILIAR);
    expect(window.location.href).not.toContain('login');
  });

  it('asistente NO es redirigido al login', () => {
    setupPage('coordinadora_actas_asesorias.html', MOCK_ADMIN_ASISTENTE);
    expect(window.location.href).not.toContain('login');
  });

  it('auxiliar → urlPanelStaff devuelve asistente_dashboard.html', () => {
    setupPage('coordinadora_actas_asesorias.html', MOCK_ADMIN_AUXILIAR);
    expect(window.urlPanelStaff()).toBe('asistente_dashboard.html');
  });

  it('sin sesión SÍ redirige al login', () => {
    localStorage.clear();
    const { body, script } = loadPage('coordinadora_actas_asesorias.html');
    document.body.innerHTML = body;
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { href: 'http://localhost/' } });
    try { window.eval(script); } catch (_) {}
    expect(window.location.href).toContain('login');
  });
});
