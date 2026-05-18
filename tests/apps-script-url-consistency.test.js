/**
 * Todas las vistas que usan sesión de estudiante deben llamar al mismo Web App
 * que estudiante_login.html; si no, el token emitido en login puede invalidarse.
 */
const fs = require('fs');
const path = require('path');

function extractUrlApp(html) {
  const m = String(html).match(/const URL_APP\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

describe('Apps Script URL — flujo estudiante', () => {
  const root = path.join(__dirname, '..');

  it('login estudiante define URL_APP', () => {
    const html = fs.readFileSync(path.join(root, 'estudiante_login.html'), 'utf8');
    expect(extractUrlApp(html)).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/AKfycb/);
  });

  it('páginas de estudiante posteriores al login usan la misma URL que estudiante_login', () => {
    const loginHtml = fs.readFileSync(path.join(root, 'estudiante_login.html'), 'utf8');
    const urlEsperada = extractUrlApp(loginHtml);
    expect(urlEsperada).toBeTruthy();

    const estudiantePages = [
      'estudiante_dashboard.html',
      'actas_asesoria.html',
      'protocolo_fase2.html',
      'fase3_sustentacion.html'
    ];

    estudiantePages.forEach((nombre) => {
      const html = fs.readFileSync(path.join(root, nombre), 'utf8');
      expect(extractUrlApp(html)).toBe(urlEsperada);
    });
  });
});
