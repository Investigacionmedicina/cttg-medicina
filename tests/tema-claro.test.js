/** Tema claro: ninguna página vuelve al fondo oscuro. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter(f => f.endsWith('.html'));

function lum(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe.each(paginas)('%s', (archivo) => {
  const html = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  const body = (html.match(/\n  body\{[^}]*\}/) || [''])[0];

  test('fondo de página claro', () => {
    expect(body).not.toMatch(/linear-gradient/);
    const m = body.match(/background:(#[0-9a-fA-F]{3,6})/);
    expect(m).not.toBeNull();
    expect(lum(m[1])).toBeGreaterThan(0.9);
  });

  test('sin los negros del tema anterior', () => {
    expect(html).not.toMatch(/#0a0f1a|#0f0f1a|#111827|#1a1f2e/i);
  });
});
