/**
 * Verifica enlaces relativos entre páginas HTML del repositorio
 * (href / iframe src → archivo existente).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function listHtmlFiles() {
  return fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(ROOT, f));
}

function collectRelativeHtmlRefs(filePath, content) {
  const refs = new Set();
  const re = /\b(?:href|src)=(["'])([^"']+)\1/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const raw = m[2].trim();
    if (!raw.toLowerCase().endsWith('.html')) continue;
    if (/^(https?:|\/\/)/i.test(raw)) continue;
    if (raw.startsWith('/')) continue;
    const noHash = raw.split('#')[0].split('?')[0];
    if (!noHash) continue;
    refs.add(noHash);
  }
  return [...refs];
}

describe('Integridad estática de HTML', () => {
  const htmlPaths = listHtmlFiles();

  it('hay páginas HTML en la raíz del proyecto', () => {
    expect(htmlPaths.length).toBeGreaterThan(0);
  });

  it.each(htmlPaths.map((p) => [path.basename(p), p]))(
    '%s — todos los href/src a .html locales apuntan a archivos existentes',
    (_, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const refs = collectRelativeHtmlRefs(filePath, content);
      const missing = [];
      for (const ref of refs) {
        const target = path.resolve(path.dirname(filePath), ref);
        if (!target.startsWith(ROOT)) {
          missing.push(`${ref} (fuera del proyecto)`);
          continue;
        }
        if (!fs.existsSync(target)) missing.push(ref);
      }
      if (missing.length) {
        throw new Error(
          `Enlaces rotos desde ${path.basename(filePath)}: ${missing.join(', ')}`
        );
      }
    }
  );
});
