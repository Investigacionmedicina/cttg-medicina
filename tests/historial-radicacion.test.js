/**
 * Contrato backend + detalle Fase 3 coordinadora (campos jurado).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appscript = fs.readFileSync(path.join(root, 'appscript.gs'), 'utf8');
const fase3Html = fs.readFileSync(path.join(root, 'coordinadora_fase3.html'), 'utf8');
const asistenteHtml = fs.readFileSync(path.join(root, 'asistente_dashboard.html'), 'utf8');
const coordHtml = fs.readFileSync(path.join(root, 'coordinadora_dashboard.html'), 'utf8');

describe('Historial de radicación — contrato Apps Script', () => {
  test('handleRequest expone getHistorialRadicacion', () => {
    expect(appscript).toMatch(/case\s+"getHistorialRadicacion"/);
    expect(appscript).toMatch(/function\s+getHistorialRadicacion\s*\(/);
    expect(appscript).toMatch(/function\s+registrarHistorial\s*\(/);
  });

  test('fixes documentados en BACKEND_FIXES ya están en appscript.gs', () => {
    expect(appscript).toMatch(/case\s+"getJurados"/);
    expect(appscript).toMatch(/function\s+ultimaFilaEscrituraFase3\s*\(/);
    expect(appscript).toMatch(/jurado1Telefono:\s*String\(r\[14\]/);
    expect(appscript).not.toMatch(/jurado1Cedula:\s*String\(r\[14\]/);
    expect(appscript).toMatch(/body\.motivoDevolucion\s*\|\|\s*body\.motivoDevoluccion/);
  });
});

describe('Historial de radicación — portales staff', () => {
  test('coordinadora_dashboard tiene modal y acción getHistorialRadicacion', () => {
    expect(coordHtml).toMatch(/id="modalHistorial"/);
    expect(coordHtml).toMatch(/abrirHistorialRadicacion/);
    expect(coordHtml).toMatch(/getHistorialRadicacion/);
    expect(coordHtml).toMatch(/leerRespuestaApp/);
  });

  test('asistente_dashboard tiene paridad de historial con coordinadora', () => {
    expect(asistenteHtml).toMatch(/id="modalHistorial"/);
    expect(asistenteHtml).toMatch(/abrirHistorialRadicacion/);
    expect(asistenteHtml).toMatch(/getHistorialRadicacion/);
    expect(asistenteHtml).toMatch(/leerRespuestaApp/);
  });
});

describe('coordinadora_fase3 — campos jurado en detalle', () => {
  test('no usa jurado1Cedula ni jurado2Cedula (teléfono en columna O/R)', () => {
    expect(fase3Html).not.toMatch(/jurado1Cedula/);
    expect(fase3Html).not.toMatch(/jurado2Cedula/);
    expect(fase3Html).toMatch(/jurado1Especialidad/);
    expect(fase3Html).toMatch(/jurado2Especialidad/);
  });

  test('usa leerRespuestaApp en llamadas fetch (evita error JSON con HTML)', () => {
    expect(fase3Html).toMatch(/function leerRespuestaApp/);
    expect(fase3Html).not.toMatch(/return r\.json\(\)/);
  });
});
