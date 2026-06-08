/**
 * Ejecutar: node tools/test-fase3-fecha-filter.mjs
 * Replica la lógica de fechaProgramacionValida / tieneFechaProgramada del HTML coordinadora_fase3.
 */
function fechaProgramacionValida(v) {
  if (v == null) return false;
  const s = String(v).trim().split('T')[0];
  if (!s || s === '-' || s === '—') return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const y = parseInt(s.slice(0, 4), 10);
    return y >= 1990 && y <= 2100;
  }
  if (/^\d{5,7}(\.\d+)?$/.test(s)) return true;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 1990 && y <= 2100;
}

function tieneFechaProgramada(r) {
  return fechaProgramacionValida(r.fechaSustentacion) || fechaProgramacionValida(r.fechaAsignada);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(!fechaProgramacionValida(''), 'vacío');
assert(!fechaProgramacionValida('texto'), 'texto random');
assert(fechaProgramacionValida('2026-04-22'), 'ISO');
assert(!tieneFechaProgramada({ fechaSustentacion: '', fechaAsignada: '' }), 'sin fechas');
assert(tieneFechaProgramada({ fechaSustentacion: '2026-05-01', fechaAsignada: '' }), 'solo D');
assert(tieneFechaProgramada({ fechaSustentacion: '', fechaAsignada: '2026-05-02' }), 'solo U');
assert(!tieneFechaProgramada({ fechaSustentacion: 'foo', fechaAsignada: 'bar' }), 'basura ambas');

console.log('OK test-fase3-fecha-filter');
