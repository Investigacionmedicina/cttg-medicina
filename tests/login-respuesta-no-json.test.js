/** Las pantallas de login explican en claro por qué Apps Script no devolvió JSON. */
const fs = require('fs');
const path = require('path');

describe.each(['coordinadora_login.html', 'estudiante_login.html'])('%s', (archivo) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const ini = html.indexOf('function cttgMotivoRespuestaNoJson(');
  let i = html.indexOf('{', ini), d = 0;
  for (; i < html.length; i++) { if (html[i] === '{') d++; else if (html[i] === '}' && --d === 0) break; }
  const motivo = new Function(html.slice(ini, i + 1) + '\nreturn cttgMotivoRespuestaNoJson;')();

  test('respuesta vacía', () => {
    expect(motivo('', 500)).toContain('vacío');
  });
  test('página de inicio de sesión de Google → acceso de la implementación', () => {
    expect(motivo('<html><title>Iniciar sesión: Cuentas de Google</title></html>', 200)).toContain('Cualquier usuario');
  });
  test('falta doPost', () => {
    expect(motivo('<div>Script function not found: doPost</div>', 200)).toContain('doPost');
  });
  test('error de ejecución: muestra el texto visible sin etiquetas', () => {
    const m = motivo('<html><style>a{}</style><div>TypeError: Cannot read properties of null (línea 42, archivo &quot;Código&quot;)</div></html>', 200);
    expect(m).toContain('TypeError: Cannot read properties of null (línea 42, archivo "Código")');
    expect(m).not.toContain('<');
  });
  test('el mensaje de error del login usa la explicación', () => {
    expect(html).toContain("cttgMotivoRespuestaNoJson(raw, res.status)");
    expect(html).not.toContain('Respuesta del servidor ilegible');
  });
});
