/**
 * Actas guardadas con «—» en vez del número de radicación:
 *  - actas_asesoria.html no debe enviar mientras el número no haya cargado.
 *  - Los paneles de coordinación/auxiliar deducen el número por correo.
 */
const fs = require('fs');
const path = require('path');

function extraer(html, nombre) {
  const ini = html.search(new RegExp('(async )?function ' + nombre + '\\('));
  if (ini === -1) throw new Error(nombre + ' no encontrada');
  let i = html.indexOf('{', ini), d = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') d++;
    else if (html[i] === '}' && --d === 0) break;
  }
  return html.slice(ini, i + 1);
}

describe('actas_asesoria.html — no envía sin número de radicación', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'actas_asesoria.html'), 'utf8');

  function montar({ numeroInicial, numeroTrasCargar }) {
    const calls = { cargar: 0, toast: [] };
    const src = `
      let numeroRadicacion = ${JSON.stringify(numeroInicial)};
      const toast = (m, t) => calls.toast.push([m, t]);
      async function cargarContexto() { calls.cargar++; numeroRadicacion = ${JSON.stringify(numeroTrasCargar)}; }
      ${extraer(html, 'numeroRadicacionValido')}
      ${extraer(html, 'asegurarNumeroRadicacion')}
      return { asegurarNumeroRadicacion, get numero() { return numeroRadicacion; } };`;
    return { api: new Function('calls', src)(calls), calls };
  }

  test('con número ya cargado, envía sin recargar', async () => {
    const { api, calls } = montar({ numeroInicial: 'CTTG-2026-0056', numeroTrasCargar: 'X' });
    await expect(api.asegurarNumeroRadicacion()).resolves.toBe(true);
    expect(calls.cargar).toBe(0);
  });

  test('con «—», espera la carga y usa el número real', async () => {
    const { api, calls } = montar({ numeroInicial: '—', numeroTrasCargar: 'CTTG-2026-0056' });
    await expect(api.asegurarNumeroRadicacion()).resolves.toBe(true);
    expect(calls.cargar).toBe(1);
    expect(api.numero).toBe('CTTG-2026-0056');
  });

  test('si no logra cargar el número, no envía y avisa', async () => {
    const { api, calls } = montar({ numeroInicial: '—', numeroTrasCargar: '—' });
    await expect(api.asegurarNumeroRadicacion()).resolves.toBe(false);
    expect(calls.toast[0][1]).toBe('err');
  });

  test('los dos envíos pasan por la verificación', () => {
    expect(extraer(html, 'solicitarFase2')).toContain('asegurarNumeroRadicacion()');
    expect(extraer(html, 'confirmarEnvio')).toContain('asegurarNumeroRadicacion()');
  });
});

describe.each(['coordinadora_dashboard.html', 'asistente_dashboard.html'])('%s — número deducido', (archivo) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const radicaciones = [
    { numero: 'CTTG-2026-0056', estado: 'Fase 2 Desbloqueada', emailEstudiante: 'anna.villota00@usc.edu.co' },
    { numero: 'CTTG-2026-0029', estado: 'Cancelado', emailEstudiante: 'carolina.builes00@usc.edu.co' },
    { numero: 'CTTG-2026-0058', estado: 'Tutores Avalados', emailEstudiante: 'carolina.builes00@usc.edu.co' },
    { numero: 'A', estado: 'Radicado', emailEstudiante: 'dos@usc.edu.co' },
    { numero: 'B', estado: 'Radicado', email2: 'dos@usc.edu.co' },
  ];
  const deducir = new Function('radicaciones', extraer(html, 'numeroActaDeducido') + '\nreturn numeroActaDeducido;')(radicaciones);

  test('respeta el número guardado', () => {
    expect(deducir({ numero: 'CTTG-2026-0010', emailEstudiante: 'x@usc.edu.co' })).toEqual({ numero: 'CTTG-2026-0010', deducido: false });
  });
  test('deduce por correo cuando la hoja tiene «—»', () => {
    expect(deducir({ numero: '—', emailEstudiante: 'Anna.Villota00@usc.edu.co' })).toEqual({ numero: 'CTTG-2026-0056', deducido: true });
  });
  test('ignora radicaciones canceladas', () => {
    expect(deducir({ numero: '—', emailEstudiante: 'carolina.builes00@usc.edu.co' }).numero).toBe('CTTG-2026-0058');
  });
  test('no adivina si hay varias radicaciones vigentes', () => {
    expect(deducir({ numero: '—', emailEstudiante: 'dos@usc.edu.co' }).numero).toBe('');
  });
});
