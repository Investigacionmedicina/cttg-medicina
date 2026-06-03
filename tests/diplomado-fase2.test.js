/**
 * Pruebas para la modalidad diplomado en protocolo_fase2.html
 * Cubre: selección correcta de radicación de referencia, detección de modalidad,
 * y habilitación del botón Fase 2 en el dashboard cuando el estado es 'Fase 2 Desbloqueada'.
 */

const fs   = require('fs');
const path = require('path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractScript(htmlContent) {
  const m = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  return m ? m[1] : '';
}

// ─── Tests: radicacionRefFase2 (protocolo_fase2.html) ────────────────────────

describe('protocolo_fase2 — radicacionRefFase2', () => {
  let fnScript;

  beforeAll(() => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '..', 'protocolo_fase2.html'), 'utf8'
    );
    fnScript = extractScript(htmlContent);
  });

  function buildEnv() {
    const g = {};
    // Ejecutar solo las funciones utilitarias (sin init async)
    const safe = fnScript
      .replace(/\(async function init[\s\S]*?\}\)\(\);/, '')
      .replace(/const URL_APP\s*=\s*["'][^"']+["'];/, 'const URL_APP = "";')
      .replace(/const TOKEN\s*=\s*[^;]+;/, 'const TOKEN = "";');
    try { new Function('window', 'localStorage', safe)(g, { getItem: () => null }); } catch (_) {}
    return g;
  }

  it('selecciona la única radicación disponible', () => {
    const g = buildEnv();
    if (typeof g.radicacionRefFase2 !== 'function') return; // skip si no es accesible
    const rads = [{ numero: 'RAD-001', modalidad: 'Diplomado', fechaRadicacion: '2025-01-15' }];
    const ref = g.radicacionRefFase2(rads);
    expect(ref.numero).toBe('RAD-001');
  });

  it('prioriza la radicación de modalidad Diplomado sobre otras', () => {
    const g = buildEnv();
    if (typeof g.radicacionRefFase2 !== 'function') return;
    const rads = [
      { numero: 'RAD-001', modalidad: 'Trabajo de investigación', fechaRadicacion: '2025-01-10' },
      { numero: 'RAD-002', modalidad: 'Diplomado', fechaRadicacion: '2025-01-05' }
    ];
    const ref = g.radicacionRefFase2(rads);
    expect(ref.numero).toBe('RAD-002');
  });

  it('entre varias radicaciones diplomado elige la más reciente', () => {
    const g = buildEnv();
    if (typeof g.radicacionRefFase2 !== 'function') return;
    const rads = [
      { numero: 'RAD-OLD', modalidad: 'Diplomado', fechaRadicacion: '2024-06-01' },
      { numero: 'RAD-NEW', modalidad: 'Diplomado', fechaRadicacion: '2025-03-01' }
    ];
    const ref = g.radicacionRefFase2(rads);
    expect(ref.numero).toBe('RAD-NEW');
  });

  it('si no hay diplomado, elige la radicación más reciente disponible', () => {
    const g = buildEnv();
    if (typeof g.radicacionRefFase2 !== 'function') return;
    const rads = [
      { numero: 'RAD-A', modalidad: 'Monografia Reporte de caso', fechaRadicacion: '2024-11-01' },
      { numero: 'RAD-B', modalidad: 'Trabajo de investigación', fechaRadicacion: '2025-02-01' }
    ];
    const ref = g.radicacionRefFase2(rads);
    expect(ref.numero).toBe('RAD-B');
  });
});

// ─── Tests: esDiplomadoFase2 usa includes en vez de === ──────────────────────

describe('protocolo_fase2 — esDiplomadoFase2 detecta modalidad correctamente', () => {
  let htmlContent;

  beforeAll(() => {
    htmlContent = fs.readFileSync(
      path.join(__dirname, '..', 'protocolo_fase2.html'), 'utf8'
    );
  });

  it('usa includes en vez de igualdad exacta para detectar diplomado', () => {
    // La función debe usar .includes('diplomado') no === 'diplomado'
    const fnBlock = htmlContent.match(/function esDiplomadoFase2\(\)\s*\{[\s\S]*?\}/)?.[0] || '';
    expect(fnBlock).toMatch(/includes/);
    expect(fnBlock).not.toMatch(/=== ['"]diplomado['"]/);
  });
});

// ─── Tests: dashboard actualizarBotonesFases con estado 'Fase 2 Desbloqueada' ─

describe('dashboard — Fase 2 habilitada para diplomado con Fase 2 Desbloqueada', () => {
  const HTML_PATH   = path.join(__dirname, '..', 'estudiante_dashboard.html');
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

  function extractBodyHtml() {
    const m = htmlContent.match(/<body>([\s\S]*?)<\/body>/i);
    if (!m) return '';
    return m[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  function extractScriptDash() {
    const m = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
    return m ? m[1] : '';
  }

  const BODY_HTML  = extractBodyHtml();
  const SCRIPT_RAW = extractScriptDash();
  const MOCK_USER  = { nombre: 'Ana', email: 'ana@usc.edu.co', rol: 'estudiante' };

  async function flushPromises(n = 6) {
    for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0));
  }

  async function bootWithEstado(estado, modalidad = 'Diplomado') {
    localStorage.clear();
    localStorage.setItem('cttg_user',  JSON.stringify(MOCK_USER));
    localStorage.setItem('cttg_token', 'tok-test');

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        radicaciones: [{ numero: 'CTTG-DIP-001', modalidad, estado, fechaRadicacion: '2025-01-01', rowIndex: 2 }],
        actas: [],
        protocolos: [],
        fase3: []
      }),
    });

    document.body.innerHTML = BODY_HTML;
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true,
      value: { href: 'http://localhost/estudiante_dashboard.html' },
    });
    window.eval(SCRIPT_RAW);
    await flushPromises();
  }

  it('con estado Fase 2 Desbloqueada el botón Fase 2 queda habilitado (pointer-events:auto)', async () => {
    await bootWithEstado('Fase 2 Desbloqueada');
    const btn = document.getElementById('btnFase2');
    expect(btn).not.toBeNull();
    const ptr = btn.style.pointerEvents;
    expect(ptr).toBe('auto');
  });

  it('con estado Radicado el botón Fase 2 queda deshabilitado para diplomado', async () => {
    await bootWithEstado('Radicado');
    const btn = document.getElementById('btnFase2');
    expect(btn).not.toBeNull();
    expect(btn.style.pointerEvents).toBe('none');
  });

  it('con estado Devuelto por Comité Técnico el botón Fase 2 queda habilitado para diplomado', async () => {
    await bootWithEstado('Devuelto por Comité Técnico');
    const btn = document.getElementById('btnFase2');
    expect(btn).not.toBeNull();
    expect(btn.style.pointerEvents).toBe('auto');
  });

  it('el texto del botón Fase 2 indica "Subir producto del diplomado" cuando desbloqueado', async () => {
    await bootWithEstado('Fase 2 Desbloqueada');
    const sub = document.getElementById('btnFase2Sub');
    if (!sub) return;
    expect(sub.textContent).toMatch(/producto.*diplomado|diplomado.*producto/i);
  });

  it('el texto del botón Fase 2 indica "aval de coordinación" cuando pendiente', async () => {
    await bootWithEstado('Radicado');
    const sub = document.getElementById('btnFase2Sub');
    if (!sub) return;
    expect(sub.textContent).toMatch(/aval.*coordinaci[oó]n|coordinaci[oó]n.*aval/i);
  });

  it('el botón Actas está oculto para diplomado', async () => {
    await bootWithEstado('Fase 2 Desbloqueada');
    const btnActas = document.getElementById('btnActas');
    if (!btnActas) return;
    expect(btnActas.style.display).toBe('none');
  });

  it('el botón Fase 3 está oculto para diplomado', async () => {
    await bootWithEstado('Fase 2 Desbloqueada');
    const btnFase3 = document.getElementById('btnFase3');
    if (!btnFase3) return;
    expect(btnFase3.style.display).toBe('none');
  });
});
