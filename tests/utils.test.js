/**
 * Tests for pure utility functions extracted from estudiante_dashboard.html
 * These functions have no DOM dependencies.
 */

// --- Inline implementations (must stay in sync with HTML source) ---

function fmtFecha(s) {
  if (!s || s === '') return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function badgeEst(est) {
  const map = {
    'Radicado':                'b-radicado',
    'Revisión':                'b-revision',
    'Tutores Avalados':        'b-tutores',
    'Fase 2 Desbloqueada':     'b-comite',
    'Pendiente Comité Técnico':'b-comite',
    'Aprobado':                'b-aprobado',
    'Devuelto':                'b-devuelto',
    'Sustentado':              'b-aprobado',
    'Reprobado':               'b-devuelto',
  };
  return `<span class="badge ${map[est]||'b-radicado'}">${est||'Radicado'}</span>`;
}

function limpiarNotas(notas) {
  if (!notas) return '';
  return notas.split('|').map(s => s.trim())
    .filter(s => !s.startsWith('Evaluador:') && !s.startsWith('Fecha Comité'))
    .join(' | ').trim();
}

function addBusinessDays(fecha, days) {
  const d = new Date(fecha.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

function diffDias(fechaObjetivo) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin = new Date(fechaObjetivo.getTime()); fin.setHours(0,0,0,0);
  return Math.ceil((fin - hoy) / 86400000);
}

// --- Tests ---

describe('fmtFecha', () => {
  test('returns em dash for null', () => {
    expect(fmtFecha(null)).toBe('—');
  });

  test('returns em dash for empty string', () => {
    expect(fmtFecha('')).toBe('—');
  });

  test('formats ISO date string correctly (dd/mm/yyyy)', () => {
    const result = fmtFecha('2025-03-15');
    expect(result).toBe('15/03/2025');
  });

  test('formats ISO datetime string (strips time part)', () => {
    const result = fmtFecha('2025-01-05T10:30:00.000Z');
    // Exact output depends on TZ but must match dd/mm/yyyy
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('returns the original string for unparseable input', () => {
    expect(fmtFecha('not-a-date')).toBe('not-a-date');
  });

  test('pads day and month with leading zeros', () => {
    const result = fmtFecha('2025-01-05');
    expect(result).toBe('05/01/2025');
  });
});

// ---------------------------------------------------------------------------

describe('esc', () => {
  test('escapes < and >', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes ampersand', () => {
    expect(esc('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  test('escapes full XSS payload', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const result = esc(payload);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('returns empty string for null', () => {
    expect(esc(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(esc(undefined)).toBe('');
  });

  test('leaves safe text unchanged', () => {
    expect(esc('Título normal 123')).toBe('Título normal 123');
  });
});

// ---------------------------------------------------------------------------

describe('badgeEst', () => {
  const knownStates = [
    ['Radicado',                 'b-radicado'],
    ['Revisión',                 'b-revision'],
    ['Tutores Avalados',         'b-tutores'],
    ['Fase 2 Desbloqueada',      'b-comite'],
    ['Pendiente Comité Técnico', 'b-comite'],
    ['Aprobado',                 'b-aprobado'],
    ['Devuelto',                 'b-devuelto'],
    ['Sustentado',               'b-aprobado'],
    ['Reprobado',                'b-devuelto'],
  ];

  test.each(knownStates)('estado "%s" → clase CSS "%s"', (estado, cssClass) => {
    const html = badgeEst(estado);
    expect(html).toContain(cssClass);
    expect(html).toContain(estado);
  });

  test('unknown state falls back to b-radicado', () => {
    const html = badgeEst('EstadoDesconocido');
    expect(html).toContain('b-radicado');
    expect(html).toContain('EstadoDesconocido');
  });

  test('null/undefined shows "Radicado" with b-radicado', () => {
    expect(badgeEst(null)).toContain('b-radicado');
    expect(badgeEst(null)).toContain('Radicado');
  });

  test('output is a <span> element string', () => {
    expect(badgeEst('Aprobado')).toMatch(/^<span class="badge[^"]*">/);
  });
});

// ---------------------------------------------------------------------------

describe('limpiarNotas', () => {
  test('returns empty string for null', () => {
    expect(limpiarNotas(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(limpiarNotas(undefined)).toBe('');
  });

  test('returns plain note unchanged', () => {
    expect(limpiarNotas('Revisar bibliografía')).toBe('Revisar bibliografía');
  });

  test('filters out Evaluador: prefix entries', () => {
    const notas = 'Revisar redacción | Evaluador: Prof. García | Añadir conclusión';
    const result = limpiarNotas(notas);
    expect(result).not.toContain('Evaluador:');
    expect(result).toContain('Revisar redacción');
    expect(result).toContain('Añadir conclusión');
  });

  test('filters out Fecha Comité prefix entries', () => {
    const notas = 'Buen trabajo | Fecha Comité: 2025-03-10 | Ajustar metodología';
    const result = limpiarNotas(notas);
    expect(result).not.toContain('Fecha Comité');
    expect(result).toContain('Buen trabajo');
    expect(result).toContain('Ajustar metodología');
  });

  test('returns empty string when all entries are filtered', () => {
    const notas = 'Evaluador: X | Fecha Comité: Y';
    expect(limpiarNotas(notas)).toBe('');
  });

  test('joins remaining entries with " | "', () => {
    const notas = 'Nota 1 | Nota 2 | Evaluador: X | Nota 3';
    expect(limpiarNotas(notas)).toBe('Nota 1 | Nota 2 | Nota 3');
  });
});

// ---------------------------------------------------------------------------

describe('addBusinessDays', () => {
  test('adds exactly N weekdays skipping weekends', () => {
    // Monday 2025-01-06 + 5 business days = Monday 2025-01-13
    const start = new Date('2025-01-06T12:00:00');
    const result = addBusinessDays(start, 5);
    expect(result.getDay()).toBe(1); // Monday
    // 5 business days from Mon: Tue Wed Thu Fri Mon
    expect(result.toISOString().slice(0,10)).toBe('2025-01-13');
  });

  test('skips Saturday and Sunday', () => {
    // Friday 2025-01-10 + 1 business day = Monday 2025-01-13
    const friday = new Date('2025-01-10T12:00:00');
    const result = addBusinessDays(friday, 1);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.toISOString().slice(0,10)).toBe('2025-01-13');
  });

  test('does not mutate the original date', () => {
    const start = new Date('2025-01-06T12:00:00');
    const original = start.getTime();
    addBusinessDays(start, 10);
    expect(start.getTime()).toBe(original);
  });

  test('adding 15 business days to a Monday spans 3 weeks', () => {
    const monday = new Date('2025-01-06T12:00:00');
    const result = addBusinessDays(monday, 15);
    // 15 business days from Mon = 3 weeks later, Mon
    expect(result.toISOString().slice(0,10)).toBe('2025-01-27');
  });
});

// ---------------------------------------------------------------------------

describe('diffDias', () => {
  test('returns 0 for today', () => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    expect(diffDias(hoy)).toBe(0);
  });

  test('returns positive number for future date', () => {
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 5);
    expect(diffDias(futuro)).toBeGreaterThan(0);
  });

  test('returns negative number for past date', () => {
    const pasado = new Date();
    pasado.setDate(pasado.getDate() - 3);
    expect(diffDias(pasado)).toBeLessThan(0);
  });

  test('returns approximately 7 for a week from now', () => {
    const semana = new Date();
    semana.setDate(semana.getDate() + 7);
    const diff = diffDias(semana);
    expect(diff).toBeGreaterThanOrEqual(6);
    expect(diff).toBeLessThanOrEqual(8);
  });
});
