/**
 * Pestaña Actas (coordinación y auxiliar): por defecto solo muestra las actas
 * por aprobar; el botón «Ver todas las actas» carga el resto.
 */
const fs = require('fs');
const path = require('path');

function extraer(html, nombre) {
  const ini = html.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error(nombre + ' no encontrada');
  let i = html.indexOf('{', ini), d = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') d++;
    else if (html[i] === '}' && --d === 0) break;
  }
  return html.slice(ini, i + 1);
}

const ACTAS = [
  { rowIndex: 2, numero: 'CTTG-2026-0001', emailEstudiante: 'a@usc.edu.co', nombreArchivo: 'acta1.pdf', estado: 'Aprobada' },
  { rowIndex: 3, numero: 'CTTG-2026-0001', emailEstudiante: 'a@usc.edu.co', nombreArchivo: 'acta2.pdf', estado: 'Pendiente revisión' },
  { rowIndex: 4, numero: 'CTTG-2026-0002', emailEstudiante: 'b@usc.edu.co', nombreArchivo: 'acta3.pdf', estado: 'Rechazada' },
  { rowIndex: 5, numero: 'CTTG-2026-0003', emailEstudiante: 'c@usc.edu.co', nombreArchivo: 'acta4.pdf', estado: 'Pendiente revisión' },
];

describe.each(['coordinadora_dashboard.html', 'asistente_dashboard.html'])('%s — actas', (archivo) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  let api;

  function montar(actas) {
    document.body.innerHTML = `
      <input id="searchActas" value=""><select id="fEstActas"><option value=""></option>
      <option value="Aprobada">Aprobada</option></select>
      <button id="btnVerTodasActas"></button><table><tbody id="tbodyActas"></tbody></table>`;
    const src = `
      let actas = ${JSON.stringify(actas)};
      let radicaciones = [{ numero: 'CTTG-2026-0003', estado: 'Sustentado' }];
      const esTerminado = r => ['Sustentado','Reprobado','Cancelado','Completado'].includes(r.estado);
      const calcularPlazo = () => ({ texto: '—', alerta: false });
      const contarActas = () => 1;
      const esc = s => String(s ?? '');
      const fmtFecha = s => String(s ?? '');
      let verTodasActas = false;
      ${extraer(html, 'numeroActaDeducido')}
      ${extraer(html, 'actaPorRevisar')}
      ${extraer(html, 'toggleVerTodasActas')}
      ${extraer(html, 'renderActas')}
      return { renderActas, toggleVerTodasActas };`;
    api = new Function(src)();
  }

  beforeEach(() => montar(ACTAS));

  const filas = () => [...document.querySelectorAll('#tbodyActas tr')].map(tr => tr.textContent);

  test('por defecto muestra solo las pendientes de radicaciones vigentes', () => {
    api.renderActas();
    const f = filas();
    expect(f).toHaveLength(1);
    expect(f[0]).toContain('acta2.pdf');
    expect(document.getElementById('btnVerTodasActas').textContent).toContain('Ver todas las actas (3)');
  });

  test('el botón carga todas y vuelve a solo pendientes', () => {
    api.toggleVerTodasActas();
    expect(filas()).toHaveLength(3);
    expect(document.getElementById('btnVerTodasActas').textContent).toContain('solo por aprobar');
    api.toggleVerTodasActas();
    expect(filas()).toHaveLength(1);
  });

  test('buscar encuentra también actas ya revisadas', () => {
    document.getElementById('searchActas').value = 'acta3';
    api.renderActas();
    const f = filas();
    expect(f).toHaveLength(1);
    expect(f[0]).toContain('acta3.pdf');
  });

  test('filtrar por estado busca en todas', () => {
    document.getElementById('fEstActas').value = 'Aprobada';
    api.renderActas();
    expect(filas()[0]).toContain('acta1.pdf');
  });

  test('mensaje claro cuando no hay pendientes', () => {
    montar(ACTAS.map(x => ({ ...x, estado: 'Aprobada' })));
    api.renderActas();
    expect(filas()[0]).toContain('No hay actas nuevas por aprobar');
  });
});
