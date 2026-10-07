/** Diplomado: el estudiante sugiere jurado, pero vale el evaluador que asigna la coordinación. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const raiz = path.join(__dirname, '..');
const gs = fs.readFileSync(path.join(raiz, 'appscript.gs'), 'utf8');
function extraer(nombre) {
  const ini = gs.indexOf('function ' + nombre + '(');
  let i = gs.indexOf('{', ini), d = 0;
  for (; i < gs.length; i++) { if (gs[i] === '{') d++; else if (gs[i] === '}' && --d === 0) break; }
  return gs.slice(ini, i + 1);
}

test('cambiarEvaluadorProtocolo cambia solo la columna del evaluador y avisa al nuevo', () => {
  const celdas = { 2: 'CTTG-2026-0052', 7: 'Diana Bonilla', 8: '', 9: 'Pendiente Comité' };
  const ctx = {
    correos: [], historial: [],
    getSheet: () => ({ getRange: (r, c) => ({ getValue: () => celdas[c] || '', setValue: v => { celdas[c] = v; } }) }),
    MailApp: { sendEmail: m => ctx.correos.push(m.to) },
    Logger: { log() {} }, registrarAuditoria() {},
    registrarHistorial: (...a) => ctx.historial.push(a.join('|')),
  };
  vm.createContext(ctx);
  vm.runInContext(extraer('cambiarEvaluadorProtocolo'), ctx);
  const r = ctx.cambiarEvaluadorProtocolo(59, 'Harold Payan', 'h@usc.edu.co', 'coord@usc.edu.co');
  expect(r).toMatchObject({ success: true, evaluador: 'Harold Payan', anterior: 'Diana Bonilla' });
  expect(celdas[7]).toBe('Harold Payan');
  expect(celdas[9]).toBe('Pendiente Comité');
  expect(ctx.correos).toEqual(['h@usc.edu.co']);
  expect(ctx.historial[0]).toContain('Diana Bonilla → Harold Payan');
  expect(ctx.cambiarEvaluadorProtocolo(59, '  ', '', '').success).toBe(false);
});

test('la acción está registrada y solo la usa coordinación/asistencia', () => {
  expect(gs).toContain('case "cambiarEvaluadorProtocolo":');
  expect(gs).toMatch(/accionesCoord = \[[^\]]*'cambiarEvaluadorProtocolo'/);
});

test('el evaluador de cada radicación sale del envío más reciente', () => {
  expect(gs).toContain('protocolos.filter(p => String(p.numero) === String(rad.numero)).pop()');
});

test('los paneles muestran el evaluador asignado, no la sugerencia, como jurado del diplomado', () => {
  ['coordinadora_dashboard.html', 'asistente_dashboard.html'].forEach(f => {
    const html = fs.readFileSync(path.join(raiz, f), 'utf8');
    expect(html).toContain('function evaluadorAsignadoDe(r)');
    expect(html).not.toContain("[r.dipJurado1Nombre].filter(Boolean)");
  });
  const coord = fs.readFileSync(path.join(raiz, 'coordinadora_dashboard.html'), 'utf8');
  expect(coord).toContain("fila('Jurado sugerido 1', r.dipJurado1Nombre)");
  expect(coord).toContain('const jurado = juradoDiplomadoHtml(r);');
});

test('comité técnico permite cambiar el evaluador', () => {
  const html = fs.readFileSync(path.join(raiz, 'comite_tecnico.html'), 'utf8');
  expect(html).toContain('id="modalEvaluador"');
  expect(html).toContain("action: 'cambiarEvaluadorProtocolo'");
  expect(html).toContain('onclick="abrirCambioEvaluador(${p.rowIndex})"');
});
