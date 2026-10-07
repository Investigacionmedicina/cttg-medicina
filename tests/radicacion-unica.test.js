/**
 * Evitar que una persona radique varias veces (caso real: CTTG-2026-0062 a 0065, mismo grupo).
 */
const fs = require('fs');
const path = require('path');

const gs = fs.readFileSync(path.join(__dirname, '..', 'appscript.gs'), 'utf8');
function extraer(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  let i = src.indexOf('{', ini), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(ini, i + 1);
}

describe('backend — radicacionActivaDeIntegrantes_', () => {
  const buscar = new Function(
    extraer(gs, 'estadosLiberanNuevaRadicacion_') + extraer(gs, 'radicacionActivaDeIntegrantes_') +
    '\nreturn radicacionActivaDeIntegrantes_;')();
  const fila = (num, estado, e2, e1 = 'a@usc.edu.co') => {
    const r = new Array(40).fill(''); r[1] = num; r[2] = e1; r[5] = e1; r[11] = e2 || ''; r[32] = estado; return r;
  };
  const hoja = (filas) => ({ getDataRange: () => ({ getValues: () => [new Array(40).fill('h'), ...filas] }) });

  test('bloquea si el mismo correo ya tiene una radicación activa', () => {
    const r = buscar(hoja([fila('CTTG-2026-0062', 'Radicado')]), ['A@usc.edu.co']);
    expect(r).toEqual({ numero: 'CTTG-2026-0062', estado: 'Radicado', email: 'a@usc.edu.co' });
  });
  test('bloquea si otro integrante del grupo ya está en una radicación activa', () => {
    const r = buscar(hoja([fila('CTTG-2026-0062', 'Tutores Avalados', 'maria.montoya07@usc.edu.co')]),
      ['otra@usc.edu.co', 'otra@usc.edu.co', 'maria.montoya07@usc.edu.co']);
    expect(r.numero).toBe('CTTG-2026-0062');
  });
  test('permite radicar si las anteriores están devueltas, canceladas o aprobadas', () => {
    const h = hoja([fila('X1', 'Devuelto'), fila('X2', 'Cancelado'), fila('X3', 'Aprobado')]);
    expect(buscar(h, ['a@usc.edu.co'])).toBeNull();
  });
  test('ignora correos vacíos', () => {
    expect(buscar(hoja([fila('X', 'Radicado', '', '')]), ['', null, undefined])).toBeNull();
  });
  test('crearRadicacion revisa dentro del lock, antes de generar el número', () => {
    const f = extraer(gs, 'crearRadicacion');
    const iLock = f.indexOf('lockRad.waitLock');
    const iChoque = f.indexOf('radicacionActivaDeIntegrantes_(');
    const iNum = f.indexOf('generarNumero("CTTG"');
    expect(iLock).toBeGreaterThan(-1);
    expect(iChoque).toBeGreaterThan(iLock);
    expect(iNum).toBeGreaterThan(iChoque);
  });
});

describe('portal — no radicar sin saber si ya tiene una', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'estudiante_dashboard.html'), 'utf8');
  const radicar = extraer(html, 'radicar');
  test('espera a que cargue la lista de radicaciones', () => {
    expect(radicar).toContain('if (!misRadCargadas)');
  });
  test('tras radicar queda bloqueado y refresca la lista', () => {
    expect(radicar).toContain('bloquearNuevaRad = true;');
  });
  test('ante error de conexión revisa la lista antes de permitir reintentar', () => {
    expect(radicar).toMatch(/catch\(e\) \{[\s\S]*await cargarMisRad\(\)/);
  });
});
