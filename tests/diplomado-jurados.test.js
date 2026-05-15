/**
 * Reglas alineadas con validarJuradosSugeridosDiplomado (estudiante_dashboard) y crearRadicacion (appscript).
 */
function validarSlotsDiplomado(slots) {
  const s1 = slots[0];
  if (!s1.n || !s1.e || !s1.t) return { ok: false, code: 'j1' };
  for (let i = 1; i < 3; i++) {
    const s = slots[i];
    const prev = slots[i - 1];
    const any = s.n || s.e || s.t;
    if (any) {
      if (!prev.n || !prev.e || !prev.t) return { ok: false, code: 'order' };
      if (!s.n || !s.e || !s.t) return { ok: false, code: 'partial' };
    }
  }
  return { ok: true };
}

describe('Diplomado — jurados sugeridos (1 a 3)', () => {
  it('exige jurado 1 completo', () => {
    expect(validarSlotsDiplomado([{ n: '', e: 'a@b.co', t: '1' }])).toEqual({ ok: false, code: 'j1' });
    expect(validarSlotsDiplomado([{ n: 'Dr', e: '', t: '1' }])).toEqual({ ok: false, code: 'j1' });
    expect(validarSlotsDiplomado([{ n: 'Dr', e: 'a@b.co', t: '' }])).toEqual({ ok: false, code: 'j1' });
  });

  it('acepta solo jurado 1', () => {
    expect(validarSlotsDiplomado([
      { n: 'Dr A', e: 'a@usc.edu.co', t: '300' },
      { n: '', e: '', t: '' },
      { n: '', e: '', t: '' }
    ])).toEqual({ ok: true });
  });

  it('no permite hueco entre jurado 1 y 3', () => {
    expect(validarSlotsDiplomado([
      { n: 'Dr A', e: 'a@usc.edu.co', t: '300' },
      { n: '', e: '', t: '' },
      { n: 'Dr C', e: 'c@usc.edu.co', t: '301' }
    ])).toEqual({ ok: false, code: 'order' });
  });

  it('acepta cadena 1–2–3 completa', () => {
    expect(validarSlotsDiplomado([
      { n: 'Dr A', e: 'a@usc.edu.co', t: '300' },
      { n: 'Dr B', e: 'b@usc.edu.co', t: '301' },
      { n: 'Dr C', e: 'c@usc.edu.co', t: '302' }
    ])).toEqual({ ok: true });
  });
});
