/**
 * Las páginas del estudiante (panel, actas, Fase 2 y Fase 3) deben elegir la misma
 * radicación de referencia, ignorando las canceladas si hay otra vigente.
 * Caso real: diplomado «Completado» + diplomado «Cancelado» más reciente.
 */
const fs = require('fs');
const path = require('path');

function cargarFuncion(archivo, nombre, auxiliares = []) {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const extraer = (fn) => {
    const ini = html.indexOf('function ' + fn + '(');
    if (ini === -1) throw new Error(fn + ' no encontrada en ' + archivo);
    let i = html.indexOf('{', ini), d = 0;
    for (; i < html.length; i++) {
      if (html[i] === '{') d++;
      else if (html[i] === '}' && --d === 0) break;
    }
    return html.slice(ini, i + 1);
  };
  const src = [...auxiliares, nombre].map(extraer).join('\n');
  return new Function(src + '\nreturn ' + nombre + ';')();
}

const PAGINAS = [
  ['estudiante_dashboard.html', 'radicacionReferenciaDashboard', ['fechaRadMs', 'esModalidadDiplomado']],
  ['actas_asesoria.html', 'radicacionReferenciaActas', []],
  ['protocolo_fase2.html', 'radicacionRefFase2', []],
  ['fase3_sustentacion.html', 'radicacionReferenciaF3', ['fechaRadMsF3', 'esModalidadDiplomado']],
];

describe.each(PAGINAS)('%s — radicación de referencia', (archivo, nombre, aux) => {
  const elegir = cargarFuncion(archivo, nombre, aux);

  test('ignora una cancelada más reciente', () => {
    const ref = elegir([
      { numero: 'CTTG-2026-0040', modalidad: 'Diplomado', estado: 'Completado', fechaRadicacion: '2026-05-13' },
      { numero: 'CTTG-2026-0044', modalidad: 'Diplomado', estado: 'Cancelado', fechaRadicacion: '2026-05-19' },
    ]);
    expect(ref.numero).toBe('CTTG-2026-0040');
  });

  test('elige la más reciente entre vigentes', () => {
    const ref = elegir([
      { numero: 'CTTG-2026-0034', modalidad: 'Trabajo de investigación', estado: 'Cancelado', fechaRadicacion: '2026-04-21' },
      { numero: 'CTTG-2026-0037', modalidad: 'Trabajo de investigación', estado: 'Radicado', fechaRadicacion: '2026-04-22' },
    ]);
    expect(ref.numero).toBe('CTTG-2026-0037');
  });

  test('si todas están canceladas, devuelve la más reciente', () => {
    const ref = elegir([
      { numero: 'A', modalidad: 'Trabajo de investigación', estado: 'Cancelado', fechaRadicacion: '2026-04-21' },
      { numero: 'B', modalidad: 'Trabajo de investigación', estado: 'Cancelado', fechaRadicacion: '2026-04-25' },
    ]);
    expect(ref.numero).toBe('B');
  });
});
