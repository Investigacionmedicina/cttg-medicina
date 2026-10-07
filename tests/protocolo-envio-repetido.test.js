/** Protocolos confirmados dos veces el mismo día: el repetido no es un pendiente nuevo. */
const fs = require('fs');
const path = require('path');

function extraer(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  let i = src.indexOf('{', ini), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(ini, i + 1);
}

describe.each(['coordinadora_dashboard.html', 'asistente_dashboard.html'])('%s', (archivo) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const crear = protocolos => new Function('protocolos', extraer(html, 'protocoloEnvioRepetidoDe') + '\nreturn protocoloEnvioRepetidoDe;')(protocolos);

  // Caso real CTTG-2026-0002: fila 62 evaluada por el comité, fila 63 repetida el mismo día.
  const prots = [
    { rowIndex: 62, numero: 'CTTG-2026-0002', fechaRadicacion: '2026-09-15', estado: 'Devuelto por Comité Técnico' },
    { rowIndex: 63, numero: 'CTTG-2026-0002', fechaRadicacion: '2026-09-15', estado: 'Cargado' },
    { rowIndex: 70, numero: 'CTTG-2026-0025', fechaRadicacion: '2026-09-20', estado: 'Cargado' },
    { rowIndex: 53, numero: 'CTTG-2026-0009', fechaRadicacion: '2026-06-24', estado: 'Devuelto' },
    { rowIndex: 80, numero: 'CTTG-2026-0009', fechaRadicacion: '2026-10-01', estado: 'Cargado' },
  ];
  const repetido = crear(prots);

  test('el envío repetido del mismo día se reconoce', () => {
    expect(repetido(prots[1]).rowIndex).toBe(62);
  });
  test('un envío único sigue pendiente', () => {
    expect(repetido(prots[2])).toBeNull();
  });
  test('una versión corregida enviada después de la devolución sí es pendiente', () => {
    expect(repetido(prots[4])).toBeNull();
  });
  test('los envíos ya procesados no se marcan', () => {
    expect(repetido(prots[0])).toBeNull();
  });
});

test('backend: no acepta otro protocolo mientras haya uno en revisión', () => {
  const gs = fs.readFileSync(path.join(__dirname, '..', 'appscript.gs'), 'utf8');
  const f = extraer(gs, 'crearProtocolo');
  expect(f).toContain('Ya tienes un protocolo en revisión');
  expect(f.indexOf('Ya tienes un protocolo en revisión')).toBeLessThan(f.indexOf('sheet.appendRow('));
});
