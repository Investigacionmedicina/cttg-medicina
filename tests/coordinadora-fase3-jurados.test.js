/**
 * Lógica espejo de coordinadora_fase3.html → juradosAprobados (evitar falsos positivos).
 * Si cambias la función en el HTML, actualiza esta copia.
 */
function juradosAprobados(r) {
  const est = String(r.estadoSolicitud || '').trim().toLowerCase();
  if (/\bjurados?\s+aprobados?\b/i.test(est)) return true;
  return !!(String(r.nombres || '').trim());
}

describe('juradosAprobados (Fase 3 coordinadora)', () => {
  test('no activa con textos que solo mencionan «jurados» en trámite', () => {
    expect(juradosAprobados({ estadoSolicitud: 'Pendiente asignación de jurados' })).toBe(false);
    expect(juradosAprobados({ estadoSolicitud: 'En revisión de jurados sugeridos' })).toBe(false);
    expect(juradosAprobados({ estadoSolicitud: 'Solicitud sustentación radicada' })).toBe(false);
    expect(juradosAprobados({ estadoSolicitud: 'Solicitud sustentación revisada' })).toBe(false);
  });

  test('sí activa con estado explícito de aprobación', () => {
    expect(juradosAprobados({ estadoSolicitud: 'Jurados aprobados' })).toBe(true);
    expect(juradosAprobados({ estadoSolicitud: 'JURADOS APROBADOS' })).toBe(true);
    expect(juradosAprobados({ estadoSolicitud: 'Jurado aprobado' })).toBe(true);
  });

  test('sí activa si la columna nombres tiene datos (compatibilidad Sheet)', () => {
    expect(juradosAprobados({ estadoSolicitud: 'Solicitud sustentación radicada', nombres: 'Dr. A, Dra. B' })).toBe(true);
  });
});
