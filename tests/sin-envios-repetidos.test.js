/** El servidor no acepta solicitudes repetidas mientras haya una en curso. */
const fs = require('fs');
const path = require('path');
const gs = fs.readFileSync(path.join(__dirname, '..', 'appscript.gs'), 'utf8');
function extraer(nombre) {
  const ini = gs.indexOf('function ' + nombre + '(');
  let i = gs.indexOf('{', ini), d = 0;
  for (; i < gs.length; i++) { if (gs[i] === '{') d++; else if (gs[i] === '}' && --d === 0) break; }
  return gs.slice(ini, i + 1);
}
const antesDeGuardar = (fn, texto) => {
  const f = extraer(fn);
  expect(f).toContain(texto);
  expect(f.indexOf(texto)).toBeLessThan(f.indexOf('appendRow('));
};

test('radicación: una activa por estudiante', () => antesDeGuardar('crearRadicacion', 'radicacionActivaDeIntegrantes_('));
test('protocolo: uno en revisión a la vez', () => antesDeGuardar('crearProtocolo', 'Ya tienes un protocolo en revisión'));
test('activación de Fase 2: una solicitud en revisión a la vez', () => antesDeGuardar('crearActasAsesoria', 'Ya enviaste la solicitud de activación de Fase 2'));
test('activación de Fase 2: no se pide si ya está activada', () => antesDeGuardar('crearActasAsesoria', 'ya está activada'));
test('sustentación: una solicitud en curso a la vez', () => antesDeGuardar('crearFase3', 'Ya enviaste una solicitud de sustentación'));
