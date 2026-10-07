/** Las radicaciones Diplomado se distinguen a simple vista (se valoran distinto). */
const fs = require('fs');
const path = require('path');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe.each(['coordinadora_dashboard.html', 'asistente_dashboard.html'])('%s', f => {
  const html = leer(f);
  test('cada fila lleva etiqueta y franja según modalidad', () => {
    const ini = html.indexOf('function renderTabla() {');
    const fn = html.slice(ini, html.indexOf('\nfunction ', ini + 10));
    expect(fn).toContain('claseFilaModalidad(r)');
    expect(fn).toContain('etiquetaModalidad(r)');
  });
  test('filtro por tipo y leyenda con la ruta de cada modalidad', () => {
    expect(html).toContain('id="fTipoMod"');
    expect(html).toContain('class="leyenda-mod"');
    expect(html).toMatch(/fTipo === 'dip'\) === esModalidadDiplomadoDash\(r\)/);
  });
  test('el modal de estado y el detalle explican cómo se valora', () => {
    expect(html).toContain('<div id="mEstRuta"></div>');
    expect(html).toContain('${rutaModalidadHtml(r)}');
  });
});

test('comité técnico marca los diplomados', () => {
  expect(leer('comite_tecnico.html')).toContain('mod-tag mod-dip');
});
test('estilos de diferenciación en tema.css', () => {
  const css = leer('tema.css');
  ['.mod-dip', '.mod-tg', 'tr.fila-dip', '.leyenda-mod', '.ruta-dip'].forEach(c => expect(css).toContain(c));
});
