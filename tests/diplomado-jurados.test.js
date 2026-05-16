/**
 * Reglas alineadas con validarJuradosSugeridosDiplomado (estudiante_dashboard) cuando el tutor sugirió jurado.
 */
function validarJuradoDiplomadoCompleto(slot) {
  const n = String(slot.n || '').trim();
  const e = String(slot.e || '').trim();
  const t = String(slot.t || '').trim();
  const esp = String(slot.esp || '').trim();
  const ac = String(slot.ac || '').trim();
  if (!n || !e || !t || !esp) return { ok: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false };
  if (String(t).replace(/\s/g, '').length < 7) return { ok: false };
  if (ac !== 'Sí' && ac !== 'No') return { ok: false };
  return { ok: true };
}

describe('Diplomado — jurado cuando el tutor sugiere', () => {
  it('exige nombre, correo, teléfono, especialidad y acuerdo Sí/No', () => {
    expect(validarJuradoDiplomadoCompleto({ n: '', e: 'a@b.co', t: '3001234567', esp: 'X', ac: 'Sí' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr', e: '', t: '3001234567', esp: 'X', ac: 'Sí' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr', e: 'a@usc.edu.co', t: '', esp: 'X', ac: 'Sí' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr', e: 'a@usc.edu.co', t: '3001234', esp: '', ac: 'Sí' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr', e: 'a@usc.edu.co', t: '3001234567', esp: 'Med', ac: '' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr', e: 'a@usc.edu.co', t: '3001234567', esp: 'Med', ac: 'Tal vez' }).ok).toBe(false);
  });

  it('rechaza correo inválido o teléfono corto', () => {
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr A', e: 'no-email', t: '3001234567', esp: 'Epi', ac: 'Sí' }).ok).toBe(false);
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr A', e: 'a@usc.edu.co', t: '12345', esp: 'Epi', ac: 'Sí' }).ok).toBe(false);
  });

  it('acepta datos completos con Sí o No', () => {
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr A', e: 'a@usc.edu.co', t: '300 123 4567', esp: 'Medicina interna', ac: 'Sí' })).toEqual({ ok: true });
    expect(validarJuradoDiplomadoCompleto({ n: 'Dr A', e: 'a@usc.edu.co', t: '3001234567', esp: 'Epi', ac: 'No' })).toEqual({ ok: true });
  });
});

function modoEvaluadorDiplomadoValido(m) {
  const v = String(m || '').trim().toLowerCase();
  return v === 'tutor_sugiere' || v === 'cttg_asigna';
}

describe('Diplomado — modo evaluador (tutor vs CTTG)', () => {
  it('solo acepta tutor_sugiere o cttg_asigna', () => {
    expect(modoEvaluadorDiplomadoValido('')).toBe(false);
    expect(modoEvaluadorDiplomadoValido('otro')).toBe(false);
    expect(modoEvaluadorDiplomadoValido('tutor_sugiere')).toBe(true);
    expect(modoEvaluadorDiplomadoValido('cttg_asigna')).toBe(true);
  });
});
