/**
 * Reglas alineadas con validarJuradosSugeridosDiplomado (estudiante_dashboard) y crearRadicacion (appscript): un solo evaluador sugerido.
 */
function validarUnJuradoSugerido(slot) {
  const n = String(slot.n || '').trim();
  const e = String(slot.e || '').trim();
  const t = String(slot.t || '').trim();
  if (!n || !e || !t) return { ok: false };
  return { ok: true };
}

describe('Diplomado — un jurado sugerido', () => {
  it('exige nombre, email y teléfono', () => {
    expect(validarUnJuradoSugerido({ n: '', e: 'a@b.co', t: '1' })).toEqual({ ok: false });
    expect(validarUnJuradoSugerido({ n: 'Dr', e: '', t: '1' })).toEqual({ ok: false });
    expect(validarUnJuradoSugerido({ n: 'Dr', e: 'a@b.co', t: '' })).toEqual({ ok: false });
  });

  it('acepta datos completos', () => {
    expect(validarUnJuradoSugerido({ n: 'Dr A', e: 'a@usc.edu.co', t: '300' })).toEqual({ ok: true });
  });
});
