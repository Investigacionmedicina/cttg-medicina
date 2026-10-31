/** Sustentación: en las pestañas solo aparece lo pendiente, como en Actas y Protocolo. */
const fs = require('fs');
const path = require('path');
const S = require('../sustentacion_pendientes.js');

const fila = (o) => Object.assign({ rowIndex: 2, numero: 'CTTG-2026-0001', estadoSolicitud: 'Solicitud sustentación radicada',
  jurado1Nombre: 'Sugerido Uno', jurado2Nombre: 'Sugerido Dos', fechaCarga: '2026-10-01' }, o);

describe('paso de cada solicitud', () => {
  test('una solicitud recién radicada es «nueva» aunque traiga jurados sugeridos', () => {
    expect(S.juradosAprobados(fila())).toBe(false);
    expect(S.clasificar([fila()], {}).nueva).toHaveLength(1);
  });
  test('revisada → aprobar jurados → programar → nota', () => {
    expect(S.paso(fila({ estadoSolicitud: 'Solicitud sustentación revisada' }), '', true)).toBe('jurados');
    expect(S.paso(fila({ estadoSolicitud: 'Jurados aprobados' }), '', true)).toBe('programar');
    expect(S.paso(fila({ estadoSolicitud: 'Sustentación programada', fechaSustentacion: '2026-11-05' }), '', true)).toBe('nota');
    expect(S.paso(fila({ fechaSustentacion: '2026-11-05', nota: '4.5' }), '', true)).toBe('cerrada');
  });
  test('filas antiguas con fecha pero estado viejo van a «nota»', () => {
    expect(S.paso(fila({ fechaAsignada: '2026-11-05' }), '', true)).toBe('nota');
  });
  test('devuelta, radicación cerrada y envíos anteriores no son pendientes', () => {
    const c = S.clasificar([
      fila({ rowIndex: 2, estadoSolicitud: 'Solicitud sustentación devuelta' }),
      fila({ rowIndex: 9 }),                                                    // reenvío
      fila({ rowIndex: 3, numero: 'CTTG-2026-0002', estadoSolicitud: 'Solicitud sustentación devuelta' }),
      fila({ rowIndex: 4, numero: 'cttg-2026-0003' }),                          // ya Sustentado en Fase 1
    ], { 'CTTG-2026-0003': 'Sustentado' });
    expect(c.nueva.map(r => r.rowIndex)).toEqual([9]);
    expect(c.reemplazada.map(r => r.rowIndex)).toEqual([2]);
    expect(c.devuelta.map(r => r.rowIndex)).toEqual([3]);
    expect(c.cerrada.map(r => r.rowIndex)).toEqual([4]);
    expect(c.totalPendientes).toBe(1);
  });
});

describe('coordinadora_fase3.html — pestañas por paso', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'coordinadora_fase3.html'), 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i)[1];

  test('cada solicitud aparece solo en su pestaña y la devuelta no estorba', async () => {
    localStorage.setItem('cttg_admin', JSON.stringify({ nombre: 'C', email: 'c@usc.edu.co', rol: 'coordinadora' }));
    localStorage.setItem('cttg_token', 'tok');
    document.body.innerHTML = body;
    window.CTTGSust = S;
    const fase3 = [
      fila({ rowIndex: 2, numero: 'CTTG-1' }),
      fila({ rowIndex: 3, numero: 'CTTG-2', estadoSolicitud: 'Solicitud sustentación revisada' }),
      fila({ rowIndex: 4, numero: 'CTTG-3', estadoSolicitud: 'Jurados aprobados' }),
      fila({ rowIndex: 5, numero: 'CTTG-4', fechaSustentacion: '2026-11-05' }),
      fila({ rowIndex: 6, numero: 'CTTG-5', estadoSolicitud: 'Solicitud sustentación devuelta' }),
      fila({ rowIndex: 7, numero: 'CTTG-6', fechaSustentacion: '2026-09-05', nota: '4' }),
    ];
    global.fetch = jest.fn(async (url, opt) => {
      const a = JSON.parse(opt.body).action;
      return { json: async () => a === 'getFase3' ? { success: true, fase3 } : { success: true, radicaciones: [] } };
    });
    window.eval(script);
    await new Promise(r => setTimeout(r, 20));
    const nums = id => [...document.querySelectorAll('#' + id + ' .num-rad')].map(e => e.textContent);
    expect(nums('tbodyNueva')).toEqual(['CTTG-1']);
    expect(nums('tbodyJurados')).toEqual(['CTTG-2']);
    expect(nums('tbodyProgramar')).toEqual(['CTTG-3']);
    expect(nums('tbodyResultado')).toEqual(['CTTG-4']);
    expect(nums('tbodyTodas')).toHaveLength(6);
    expect(document.getElementById('tabNueva').textContent).toBe('📥 Nuevas (1)');
    expect(document.getElementById('avisoDevueltas').textContent).toContain('1 devuelta');
  });
});
