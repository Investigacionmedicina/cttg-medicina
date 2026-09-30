/**
 * Cambios y Cancelaciones: las solicitudes guardan la fila de Fase1 del momento en que se
 * crearon. Si luego se borran filas, esa fila es de otra radicación y no se debe aprobar.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'coordinadora_dashboard.html'), 'utf8');
function extraer(nombre) {
  const ini = html.indexOf('function ' + nombre + '(');
  let i = html.indexOf('{', ini), d = 0;
  for (; i < html.length; i++) { if (html[i] === '{') d++; else if (html[i] === '}' && --d === 0) break; }
  return html.slice(ini, i + 1);
}

const radicaciones = [
  { rowIndex: 24, numero: 'CTTG-2026-0029', estado: 'Cancelado' },
  { rowIndex: 49, numero: 'CTTG-2026-0056', estado: 'Fase 2 Desbloqueada' },
  { rowIndex: 50, numero: 'CTTG-2026-0057', estado: 'Aprobado' },
];
const api = new Function('radicaciones', `
  const esc = s => String(s ?? '');
  const badgeEst = e => '[' + e + ']';
  ${extraer('avisoFilaDesplazada')}
  ${extraer('estadoRadicacionSolicitud')}
  return { avisoFilaDesplazada, estadoRadicacionSolicitud };`)(radicaciones);

test('avisa cuando la fila guardada ya es de otra radicación', () => {
  const aviso = api.avisoFilaDesplazada({ numero: 'CTTG-2026-0056', rowFase1: 50 });
  expect(aviso).toContain('No apruebes');
  expect(aviso).toContain('CTTG-2026-0057');
  expect(aviso).toContain('<strong>49</strong>');
});

test('sin aviso cuando la fila coincide', () => {
  expect(api.avisoFilaDesplazada({ numero: 'CTTG-2026-0029', rowFase1: 24 })).toBe('');
});

test('indica que la radicación está cancelada', () => {
  expect(api.estadoRadicacionSolicitud({ numero: 'CTTG-2026-0029' })).toContain('cancelada');
});

test('los botones de los modales se bloquean durante la espera', () => {
  expect(html).toMatch(/data-accion="aprobar_directo"/);
  expect(html).toMatch(/data-accion="aprobar" onclick="resolverCancelacion/);
  expect(extraer('resolverSolicitudCambio')).toContain("bloquearAccionesModal('modalSolicitudCambio', true)");
  expect(extraer('resolverCancelacion')).toContain("bloquearAccionesModal('modalCancelacion', true)");
});

test('backend: resuelve por número de radicación y con lock', () => {
  const gs = fs.readFileSync(path.join(__dirname, '..', 'appscript.gs'), 'utf8');
  expect(gs).toContain('function filaFase1PorNumero_(');
  expect(gs).toMatch(/function resolverSolicitudModRad\(sesion, body\) \{\s*return conLockSolicitudes_/);
  expect(gs).toMatch(/function resolverSolicitudCancelarRad\(sesion, body\) \{\s*return conLockSolicitudes_/);
  expect(gs).not.toMatch(/getRange\((rs|rowF1|ri), 1, \1,/);
});
