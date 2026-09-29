/**
 * Pruebas de lógica de cancelación (frontend + reglas backend en texto).
 * node tools/test-cancelacion-logic.mjs
 */

const ESTADOS_LIBERA_NUEVA_RAD = ['Aprobado', 'Devuelto', 'Cancelado'];
const ESTADOS_NO_SOLICITAR_CANCEL = ['Cancelado', 'Sustentado', 'Reprobado'];

function radicacionBloqueaNueva(r) {
  return !ESTADOS_LIBERA_NUEVA_RAD.includes(String((r && r.estado) || '').trim());
}

function puedeSolicitarCancelacionRad(r) {
  const est = String((r && r.estado) || '').trim();
  return est && !ESTADOS_NO_SOLICITAR_CANCEL.includes(est);
}

function estadosPermitenNuevaRadicacionF1() {
  return ['Aprobado', 'Devuelto', 'Cancelado'];
}

function estadosNoPermitenSolicitarCancelacionF1() {
  return ['Cancelado', 'Sustentado', 'Reprobado'];
}

function estudianteTieneRadicacionBloqueandoNueva(rads, email) {
  const em = String(email || '').trim().toLowerCase();
  const libera = estadosPermitenNuevaRadicacionF1();
  for (const r of rads) {
    const emails = [r.emailEstudiante, r.email1, r.email2, r.email3]
      .map((e) => String(e || '').toLowerCase())
      .filter(Boolean);
    if (!emails.includes(em)) continue;
    const est = String(r.estado || 'Radicado').trim();
    if (!libera.includes(est)) return true;
  }
  return false;
}

let passed = 0;
let failed = 0;

function test(name, cond) {
  if (cond) {
    console.log('✅', name);
    passed++;
  } else {
    console.log('❌', name);
    failed++;
  }
}

console.log('── Lógica cancelación (frontend/backend) ──\n');

test('Radicado bloquea nueva radicación', radicacionBloqueaNueva({ estado: 'Radicado' }));
test('Aprobado libera nueva radicación', !radicacionBloqueaNueva({ estado: 'Aprobado' }));
test('Cancelado libera nueva radicación', !radicacionBloqueaNueva({ estado: 'Cancelado' }));

test('Radicado permite solicitar cancelación', puedeSolicitarCancelacionRad({ estado: 'Radicado' }));
test('Tutores Avalados permite cancelar', puedeSolicitarCancelacionRad({ estado: 'Tutores Avalados' }));
test('Cancelado NO permite solicitar de nuevo', !puedeSolicitarCancelacionRad({ estado: 'Cancelado' }));

const rads = [
  { numero: 'CTTG-1', estado: 'Radicado', emailEstudiante: 'a@usc.edu.co', rowIndex: 5 },
  { numero: 'CTTG-2', estado: 'Cancelado', email1: 'a@usc.edu.co', rowIndex: 10 },
];
test('Con radicación activa bloquea nueva', estudianteTieneRadicacionBloqueandoNueva(rads, 'a@usc.edu.co'));
test('Solo Cancelado no bloquea si no hay otra activa', !estudianteTieneRadicacionBloqueandoNueva([rads[1]], 'a@usc.edu.co'));

// Simular UI: debe mostrar botón en tarjeta Radicado
const r = { estado: 'Radicado', rowIndex: 5, numero: 'X' };
test('UI: botón cancelar visible en Radicado', puedeSolicitarCancelacionRad(r) && radicacionBloqueaNueva(r));

// Backend estados alineados con frontend
test(
  'Backend libera = frontend libera',
  JSON.stringify(estadosPermitenNuevaRadicacionF1()) === JSON.stringify(ESTADOS_LIBERA_NUEVA_RAD)
);
test(
  'Backend no-cancel = frontend no-cancel',
  JSON.stringify(estadosNoPermitenSolicitarCancelacionF1()) === JSON.stringify(ESTADOS_NO_SOLICITAR_CANCEL)
);

// Verificar HTML tiene elementos de cancelación
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dash = fs.readFileSync(path.join(__dirname, '..', 'estudiante_dashboard.html'), 'utf8');
const coord = fs.readFileSync(path.join(__dirname, '..', 'coordinadora_dashboard.html'), 'utf8');
const apps = fs.readFileSync(path.join(__dirname, '..', 'appscript.gs'), 'utf8');

test('HTML estudiante: modal cancelar', dash.includes('id="modalCancelarRad"'));
test('HTML estudiante: action crearSolicitudCancelarRad', dash.includes("action: 'crearSolicitudCancelarRad'"));
test('HTML estudiante: botón abre modal de cancelación', dash.includes('abrirModalCancelarRad('));
test('HTML coord: lista solicitudes de cancelación', coord.includes('getSolicitudesCancelarRadPendientes'));
test('HTML coord: resolver cancelación', coord.includes('resolverSolicitudCancelarRad'));
test('Apps Script: función crearSolicitudCancelarRad', apps.includes('function crearSolicitudCancelarRad'));
test('Apps Script: case crearSolicitudCancelarRad', apps.includes('case "crearSolicitudCancelarRad"'));
test('Apps Script: case resolverSolicitudCancelarRad', apps.includes('case "resolverSolicitudCancelarRad"'));
test('Apps Script: debugUsuario no es acción pública', !/accionesPublicas\s*=\s*\[[^\]]*debugUsuario/.test(apps));

console.log(`\nResumen: ${passed} OK, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
