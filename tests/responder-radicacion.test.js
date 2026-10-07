/** Responder una radicación: una sola llamada, un solo correo con la decisión real y sin esperar la recarga. */
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

function entorno(modalidad) {
  const celdas = { 2: 'CTTG-2026-0070', 23: modalidad, 33: 'Radicado' };
  const hoja = { getRange: (r, c) => ({ getValue: () => celdas[c] || '', setValue: v => { celdas[c] = v; } }) };
  const ctx = {
    correos: [], estados: [],
    getSheet: () => hoja,
    registrarAuditoria: () => {}, registrarHistorial: () => {},
  };
  ctx.notificarCambioEstado = (ri, est) => ctx.correos.push(est);
  ctx.actualizarEstado = (ri, est) => { celdas[33] = est; ctx.estados.push(est); ctx.notificarCambioEstado(ri, est); return { success: true }; };
  vm.createContext(ctx);
  vm.runInContext(extraer('validarTutores'), ctx);
  return { ctx, celdas };
}
const t1 = { nombre: 'Tutor', email: 't@usc.edu.co', telefono: '', vinculo: 'Planta' };

test('devolver: el estudiante recibe solo el correo de «Devuelto»', () => {
  const { ctx, celdas } = entorno('Investigación');
  const r = ctx.validarTutores(5, t1, null, 'Ajustar objetivos', 'coord@usc.edu.co', 'Devuelto');
  expect(r).toEqual({ success: true, estadoAplicado: 'Devuelto' });
  expect(ctx.correos).toEqual(['Devuelto']);
  expect(celdas[33]).toBe('Devuelto');
});

test('avalar: un solo correo de «Tutores Avalados»', () => {
  const { ctx } = entorno('Investigación');
  ctx.validarTutores(5, t1, null, '', 'coord@usc.edu.co', 'Tutores Avalados');
  expect(ctx.correos).toEqual(['Tutores Avalados']);
});

test('sin estadoFinal (página anterior) se comporta como antes', () => {
  const { ctx, celdas } = entorno('Investigación');
  expect(ctx.validarTutores(5, t1, null, '', 'coord@usc.edu.co')).toEqual({ success: true });
  expect(ctx.correos).toEqual(['Tutores Avalados']);
  expect(ctx.estados).toEqual([]);
  expect(celdas[33]).toBe('Tutores Avalados');
});

test('la página de tutores envía el estado final y no repite la llamada si el servidor ya lo aplicó', () => {
  const html = fs.readFileSync(path.join(raiz, 'coordinadora_validar_tutores.html'), 'utf8');
  expect(html).toMatch(/estadoFinal: estado/);
  expect(html).toMatch(/if \(dTutores\.estadoAplicado !== estado\)/);
  expect(gs).toMatch(/validarTutores\(body\.rowIndex, body\.tutor1, body\.tutor2, body\.observaciones, body\.emailCoord, body\.estadoFinal\)/);
});

test.each(['coordinadora_dashboard.html', 'asistente_dashboard.html'])('%s: el modal de estado se cierra sin esperar la recarga', f => {
  const html = fs.readFileSync(path.join(raiz, f), 'utf8');
  const ini = html.indexOf('async function guardarEstado()');
  const fn = html.slice(ini, html.indexOf('\n}', ini));
  expect(fn).toContain("closeModal('modalEst')");
  expect(fn).not.toMatch(/await cargar\(\)/);
});
