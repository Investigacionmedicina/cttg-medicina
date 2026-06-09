/**
 * Simula el bug de getDataRange() vs getLastRow() en hojas con fila vacía intermedia.
 * node tools/test-getdatarange-sim.mjs
 */

function simGetDataRange(rows) {
  // Rectángulo contiguo desde (0,0) hasta última fila/col con ALGÚN dato sin huecos en medio
  let lastR = -1;
  let lastC = -1;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length || 0); c++) {
      if (String(rows[r][c] ?? '').trim()) {
        if (r > lastR) lastR = r;
        if (c > lastC) lastC = c;
      }
    }
  }
  if (lastR < 0) return [];
  const out = [];
  for (let r = 0; r <= lastR; r++) {
    const row = [];
    let any = false;
    for (let c = 0; c <= lastC; c++) {
      const v = rows[r]?.[c] ?? '';
      row.push(v);
      if (String(v).trim()) any = true;
    }
    // getDataRange corta en primera fila totalmente vacía dentro del rectángulo
    if (!any && r > 0) break;
    out.push(row);
  }
  return out;
}

function simGetLastRow(rows) {
  for (let r = rows.length - 1; r >= 0; r--) {
    for (let c = 0; c < (rows[r]?.length || 0); c++) {
      if (String(rows[r][c] ?? '').trim()) return r + 1; // 1-based
    }
  }
  return 0;
}

function readFase1GetDataRange(rows) {
  const data = simGetDataRange(rows);
  const rads = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    rads.push({ rowIndex: i + 1, numero: data[i][1], estado: data[i][32] || 'Radicado' });
  }
  return rads;
}

function readFase1GetLastRow(rows) {
  const lr = simGetLastRow(rows);
  const rads = [];
  for (let i = 1; i < lr; i++) {
    const row = rows[i] || [];
    if (!row[0]) continue;
    rads.push({ rowIndex: i + 1, numero: row[1], estado: row[32] || 'Radicado' });
  }
  return rads;
}

// Hoja: filas 2-37 datos, fila 38 vacía, fila 39+ más radicaciones
const sheet = [
  ['ID', 'Numero', 'Email'], // header row 1
];
for (let i = 2; i <= 37; i++) {
  const r = new Array(33).fill('');
  r[0] = 'id' + i;
  r[1] = 'CTTG-old-' + i;
  r[2] = 'viejo@usc.edu.co';
  r[32] = 'Radicado';
  sheet.push(r);
}
sheet.push(new Array(33).fill('')); // fila 38 vacía
const r39 = new Array(33).fill('');
r39[0] = 'id39';
r39[1] = 'CTTG-2026-NEW';
r39[2] = 'nuevo@usc.edu.co';
r39[32] = 'Radicado';
sheet.push(r39);

const viaDataRange = readFase1GetDataRange(sheet);
const viaLastRow = readFase1GetLastRow(sheet);

console.log('── Simulación getDataRange vs getLastRow (Fase1) ──\n');
console.log('Filas en hoja (simulada):', sheet.length);
console.log('getDataRange → radicaciones visibles:', viaDataRange.length, '(última:', viaDataRange.at(-1)?.numero, ')');
console.log('getLastRow   → radicaciones visibles:', viaLastRow.length, '(última:', viaLastRow.at(-1)?.numero, ')');

const perdidas = viaLastRow.filter((x) => !viaDataRange.find((y) => y.numero === x.numero)).map((x) => x.numero);
const fixOk = viaLastRow.some((x) => x.numero === 'CTTG-2026-NEW');
let failed = 0;

console.log('');
if (perdidas.length) {
  console.log('❌ getDataRange (código viejo): pierde', perdidas.join(', '));
} else {
  console.log('✅ getDataRange: sin pérdidas en esta simulación');
}

if (fixOk) {
  console.log('✅ getLastRow / obtenerMatrizFase1 (código nuevo): incluye CTTG-2026-NEW');
} else {
  console.log('❌ getLastRow no incluye la radicación nueva');
  failed++;
}

process.exit(failed > 0 ? 1 : 0);
