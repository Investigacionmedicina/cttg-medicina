/**
 * CTTG — fragmentos para fusionar con tu Code.gs (Apps Script)
 *
 * EDITS OBLIGATORIOS en handleRequest, dentro del switch:
 *
 * 1) Añadir rama (la página fase3_sustentacion.html llama action: 'getJurados'):
 *    case "getJurados": result = obtenerJurados(); break;
 *
 *    No incluyas getJurados en accionesSoloCoordLectura: debe poder llamarlo
 *    el rol estudiante (igual que getFase2 / getFase3).
 *
 * 2) Corregir typo en registrarDecisionComite — el frontend envía motivoDevolucion:
 *    case "registrarDecisionComite": result = registrarDecisionComite(
 *      body.rowIndex,
 *      body.estado,
 *      body.motivoDevolucion,
 *      body.emailEvaluador,
 *      body.evaluador,
 *      body.numeroActa,
 *      body.avalCCEB,
 *      body.observaciones
 *    ); break;
 *
 * (Tu código actual usa body.motivoDevoluccion con triple «c» y el motivo
 *  de devolución llega vacío al servidor.)
 */

/**
 * Usada por esFilaValidaParaModificarFase3; si falta en el proyecto, Fase 3
 * lanza ReferenceError al asignar estado / fecha / completar.
 */
function ultimaFilaEscrituraFase3(sheet) {
  if (!sheet) return 1;
  var m = metricasColumnaRadicacionFase3(sheet);
  return Math.max(m.ultimaFilaNumeroEnColumnaB || 1, sheet.getLastRow() || 1);
}

/**
 * Catálogo de jurados (hoja «Jurados»). Misma idea que obtenerTutores.
 * Columnas sugeridas: A ID | B Nombre | C Email | D Teléfono | E Especialidad | F Estado
 */
function obtenerJurados() {
  var sheet = getSheet("Jurados");
  if (!sheet) {
    return { success: true, jurados: [], listaNota: "no_hoja" };
  }
  var data = sheet.getDataRange().getValues();
  var jurados = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var id = String(r[0] || i).trim();
    var nombre = String(r[1] || "").trim();
    var email = String(r[2] || "").trim();
    var telefono = String(r[3] || "").trim();
    var especialidad = String(r[4] || "").trim();
    var estado = String(r[5] || "").trim().toLowerCase();
    if (!nombre && !email) continue;
    if (estado === "inactivo") continue;
    jurados.push({
      id: id,
      nombre: nombre,
      email: email,
      telefono: telefono,
      especialidad: especialidad
    });
  }
  return {
    success: true,
    jurados: jurados,
    listaNota: jurados.length ? "" : "sin_filas"
  };
}
