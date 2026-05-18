/**
 * Todas las vistas que usan sesión de estudiante deben llamar al mismo Web App
 * que estudiante_login.html; además ese Web App debe ser el mismo que el login staff
 * para no depender de dos despliegues (uno desactualizado deja «credenciales incorrectas»).
 */
const fs = require('fs');
const path = require('path');

function extractUrlApp(html) {
  const m = String(html).match(/const URL_APP\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

describe('Apps Script URL — portal CTTG', () => {
  const root = path.join(__dirname, '..');

  it('login estudiante y login coordinación usan el mismo despliegue (un solo exec)', () => {
    const est = extractUrlApp(fs.readFileSync(path.join(root, 'estudiante_login.html'), 'utf8'));
    const coord = extractUrlApp(fs.readFileSync(path.join(root, 'coordinadora_login.html'), 'utf8'));
    expect(est).toBeTruthy();
    expect(est).toBe(coord);
  });

  it('login estudiante define URL_APP válida', () => {
    const html = fs.readFileSync(path.join(root, 'estudiante_login.html'), 'utf8');
    expect(extractUrlApp(html)).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/AKfycb/);
  });

  it('páginas posteriores al login estudiante usan la misma URL que estudiante_login', () => {
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
