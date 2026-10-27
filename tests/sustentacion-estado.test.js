/** Sustentación: aprobar jurados, programar y registrar nota cambian el estado (antes quedaba igual). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const raiz = path.join(__dirname, '..');
const gs = fs.readFileSync(path.join(raiz, 'appscript.gs'), 'utf8');

function hoja(filas) {
  const d = filas;
  const fila = (r, c) => { while (d.length < r) d.push([]); const x = d[r - 1]; while (x.length < c) x.push(''); return x; };
  return {
    getName: () => 'Fase 3',
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValue: () => (d[r - 1] || [])[c - 1] ?? '',
      getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => String((d[r - 1 + i] || [])[c - 1 + j] ?? ''))),
      setValue: v => { fila(r, c)[c - 1] = v; },
    }),
    getLastRow: () => d.length, getLastColumn: () => 34, getMaxColumns: () => 40, getMaxRows: () => 1000,
    getDataRange: () => ({ getValues: () => d.map(r => r.slice()), getLastRow: () => d.length, getLastColumn: () => 34 }),
    insertColumnsAfter() {},
  };
}
function entorno() {
  const f3 = [Array(34).fill('h')];
  const r = Array(34).fill(''); r[0] = 1; r[1] = 'CTTG-2026-0010'; r[2] = 'est@usc.edu.co'; r[12] = '2026-10-01'; r[27] = 'Sala 3'; r[28] = 'Solicitud sustentación revisada';
  f3.push(r);
  const f1 = [Array(40).fill('h'), Object.assign(Array(40).fill(''), { 1: 'CTTG-2026-0010', 32: 'Aprobado' })];
  const hojas = { 'Fase 3': hoja(f3), Fase1: hoja(f1) };
  const ctx = {
    Logger: { log() {} }, MailApp: { sendEmail() {} },
    Utilities: { formatDate: d => new Date(d).toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'America/Bogota' },
    SpreadsheetApp: { openById: () => ({ getSheetByName: n => hojas[n], getSheets: () => [] }) },
  };
  vm.createContext(ctx);
  vm.runInContext(gs, ctx);
  ctx.getSheet = n => hojas[n]; ctx.getSheetFase3 = () => hojas['Fase 3'];
  ['registrarAuditoria', 'registrarHistorial', 'registrarTrazabilidadSustentacion', 'notificarCambioEstado'].forEach(n => { ctx[n] = () => {}; });
  return { ctx, estado: () => ctx.listaFase3Completa()[0].estadoSolicitud, fila: f3[1] };
}
const j1 = { nombre: 'Jurado Uno', email: 'j1@usc.edu.co' }, j2 = { nombre: 'Jurado Dos', email: 'j2@usc.edu.co' };

test('el estado avanza: jurados → programada → sustentado', () => {
  const { ctx, estado } = entorno();
  expect(estado()).toBe('Solicitud sustentación revisada');
  ctx.updateFase3Asignacion(2, '', '', 'Sala 3', j1, j2, 'c@usc.edu.co');
  expect(estado()).toBe('Jurados aprobados');
  ctx.updateFase3Asignacion(2, '2026-11-05', '10:00', 'Auditorio', j1, j2, 'c@usc.edu.co');
  expect(estado()).toBe('Sustentación programada');
  expect(ctx.completarFase3(2, 4.5, 'ACTA-9', 'NO', '', 'c@usc.edu.co').success).toBe(true);
  expect(estado()).toBe('Sustentado');
});

test('nota menor a 3 queda Reprobado y reprogramar no borra el resultado', () => {
  const { ctx, estado } = entorno();
  ctx.completarFase3(2, 2.5, 'ACTA-1', 'NO', '', 'c@usc.edu.co');
  expect(estado()).toBe('Reprobado');
  ctx.updateFase3Asignacion(2, '2026-11-05', '10:00', 'Auditorio', j1, j2, 'c@usc.edu.co');
  expect(estado()).toBe('Reprobado');
});

test('la API devuelve el lugar para no borrarlo al editar jurados', () => {
  const { ctx } = entorno();
  expect(ctx.listaFase3Completa()[0].lugar).toBe('Sala 3');
});

describe('coordinadora_fase3.html', () => {
  const html = fs.readFileSync(path.join(raiz, 'coordinadora_fase3.html'), 'utf8');
  const ini = html.indexOf('function esEstadoDevueltaSheet');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    html.slice(ini, html.indexOf('\n}\n', ini) + 3) +
    html.slice(html.indexOf('function estadoSheetGuardado'), html.indexOf('function esEstadoDevueltaSheet')) +
    'function tieneJuradosAsignados(r){return !!(r.jurado1Nombre&&r.jurado2Nombre);} function tieneFechaProgramada(r){return !!r.fechaSustentacion;}', ctx);
  const base = { estadoSolicitud: 'Solicitud sustentación revisada' };
  test.each([
    [{}, 'Solicitud sustentación revisada'],
    [{ jurado1Nombre: 'A', jurado2Nombre: 'B' }, 'Jurados aprobados'],
    [{ jurado1Nombre: 'A', jurado2Nombre: 'B', fechaSustentacion: '2026-11-05' }, 'Sustentación programada'],
    [{ fechaSustentacion: '2026-11-05', nota: '4,2' }, 'Sustentado'],
    [{ nota: '2' }, 'Reprobado'],
    [{ estadoSolicitud: 'Solicitud sustentación devuelta', jurado1Nombre: 'A', jurado2Nombre: 'B' }, 'Solicitud sustentación devuelta'],
  ])('estado mostrado %j → %s', (extra, esperado) => {
    expect(ctx.estadoSheetRaw(Object.assign({}, base, extra))).toBe(esperado);
  });
  test('al aprobar jurados conserva el lugar ya guardado', () => {
    expect(html).toContain('const lugarExistente = (r && (r.lugar || r.observaciones))');
  });
});
