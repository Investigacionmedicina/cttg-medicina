// ============================================================
// CTTG MEDICINA — Apps Script FINAL v4.0
// Estructura real de hojas + notificaciones completas
// ============================================================

var SHEET_ID           = "1nIDkhKKIBDe9xS4yaJ_MISJmRpwu0VtIfGgjJQhKxMA";
/** GID de la pestaña (?gid= en la URL). Si es > 0, tiene prioridad sobre el nombre «Fase 3». Pon 0 si solo quieres buscar por nombre. */
var FASE3_SHEET_GID    = 109729144;
var COORDINADORA_EMAIL = "investigacionmedicina@usc.edu.co";
var DRIVE_FOLDER_ID    = "1DAygVArjy0uNMX4gAtv-HSYyOlmI3iBz";

// ── ENTRY POINT ──────────────────────────────────────────────
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch(err) {}
  return handleRequest(e, body);
}

function handleRequest(e, body) {
  var action = (body && body.action) ? body.action : "";
  var result = { success: false, error: "Acción no válida" };
  var accionesPublicas = ['login', 'debugUsuario', 'loginDebugListaUsuarios'];
  var sesion = null;

  if (accionesPublicas.indexOf(action) === -1) {
    sesion = verificarToken(body.token);
    if (!sesion) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Sesión inválida o expirada" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var accionesCoord = ['updateEstado','validarTutores','avalarProtocoloFase2','actualizarProtocolo','aprobarActasAsesoria','registrarDecisionComite','updateFase3Estado','updateFase3Asignacion','completarFase3','repararEstadosFase1','resolverSolicitudModRad','resolverSolicitudModRadComite','resolverSolicitudCancelarRad','enviarEmailAlertaCritica'];

    if (accionesCoord.indexOf(action) !== -1 && !sesionEsCoordinadoraOAsistente(sesion)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No autorizado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    /** getTrazabilidad también la usa el estudiante (solo su radicación); ver obtenerTrazabilidad. */
    var accionesSoloCoordLectura = ['getFase1','getTutores','getEvaluadores','getFechasComite','getEstadisticasTutores','getAlertasCriticas','getSolicitudesModRadPendientes','getSolicitudesModRadComite','getSolicitudesCancelarRadPendientes'];
    if (accionesSoloCoordLectura.indexOf(action) !== -1 && !sesionEsCoordinadoraOAsistente(sesion)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No autorizado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  try {
    switch(action) {
        case "login":                result = loginUsuario(body.email, body.password); break;
      case "debugUsuario":         result = debugUsuario(body.email); break;
      case "loginDebugListaUsuarios":
        result = loginDebugListaUsuarios(body.email, body.password);
        break;
      case "createRadicacion":     result = crearRadicacion(body.datos, body.emailEstudiante, sesion); break;
      case "getFase1":             result = obtenerFase1(); break;
      case "getFase1ByEmail":      result = obtenerFase1PorEmail(body.email, sesion); break;
      case "obtenerDatosEstudiante": result = obtenerDatosEstudiante(body.email, sesion); break;
      case "updateEstado":         result = actualizarEstado(body.rowIndex, body.estado, body.notas, body.emailCoord); break;
      case "validarTutores":       result = validarTutores(body.rowIndex, body.tutor1, body.tutor2, body.observaciones, body.emailCoord); break;
      case "getTutores":           result = obtenerTutores(); break;
      case "getEvaluadores":       result = obtenerEvaluadores(); break;
      case "getJurados":           result = obtenerJurados(); break;
      case "getFechasComite":      result = obtenerFechasComite(); break;
      case "subirArchivo":         result = subirArchivoAutorizado(body.base64, body.nombreArchivo, body.tipoArchivo, body.subcarpeta, sesion); break;
      case "crearProtocolo":       result = crearProtocolo(body.numeroRadicacion, body.emailEstudiante, body.nombreArchivo, body.urlArchivo, body.anexoCambio, body.observaciones, sesion); break;
      case "getFase2":             result = obtenerFase2(sesion); break;
      case "avalarProtocoloFase2": result = avalarProtocoloFase2(body.rowIndex, body.estado, body.motivo, body.evaluador, body.emailEvaluador, body.fechaComite, body.observaciones, body.emailCoord); break;
      case "registrarDecisionComite": result = registrarDecisionComite(body.rowIndex, body.estado, body.motivoDevolucion || body.motivoDevoluccion, body.emailEvaluador, body.evaluador, body.numeroActa, body.avalCCEB, body.observaciones); break;
      case "actualizarProtocolo":  result = actualizarEstadoProtocolo(body.rowIndex, body.estado, body.evaluador, body.emailEvaluador, body.fechaReunion, body.decision, body.motivo, body.emailCoord); break;
      case "crearActasAsesoria":   result = crearActasAsesoria(body.numeroRadicacion, body.emailEstudiante, body.nombreArchivo, body.base64, body.observaciones, sesion); break;
      case "getActasAsesoria":     result = obtenerActasAsesoria(sesion); break;
      case "getEstadisticasTutores": result = obtenerEstadisticasTutores(); break;
      case "getAlertasCriticas": result = obtenerAlertasCriticas(); break;
      case "enviarEmailAlertaCritica": result = enviarEmailAlertaCritica(body.numero, body.emailEstudiante, body.tipo, body.detalles); break;
      case "getTrazabilidad":    result = obtenerTrazabilidad(sesion, body.numeroRadicacion, body.limit); break;
      case "aprobarActasAsesoria": result = aprobarActasAsesoria(body.rowIndex, body.emailEstudiante, body.emailCoord, body.rechazar, body.motivo); break;
      case "crearFase3": result = crearFase3(body.numeroRadicacion, body.emailEstudiante, body.porcentajeTurnitin, body.jurado1Nombre, body.jurado1Email, body.jurado1Telefono, body.jurado2Nombre, body.jurado2Email, body.jurado2Telefono, body.jurado1Especialidad || "", body.jurado2Especialidad || "", body.anexoA7, body.articulo, body.guiaAutores, body.avalCCEB, body.turnitinDoc, sesion); break;
      case "getFase3":             result = obtenerFase3(sesion, { sinDedupe: body.sinDedupe === true, debugFase3: body.debugFase3 === true }); break;
      case "updateFase3Estado": result = updateFase3Estado(body.rowIndex, body.estado, body.observaciones, body.emailCoord); break;
      case "updateFase3Asignacion": result = updateFase3Asignacion(body.rowIndex, body.fechaSustentacion, body.horaSustentacion, body.lugar, body.jurado1, body.jurado2, body.emailCoord); break;
      case "completarFase3":       result = completarFase3(body.rowIndex, body.nota, body.numeroActa, body.producto, body.descripcion, body.emailCoord); break;
      case "registrarResultadoDiplomado": result = registrarResultadoDiplomado(body.rowIndexF1, body.nota, body.numeroActa, sesion); break;
      case "repararEstadosFase1":  result = repararEstadosFase1(); break;
      case "crearSolicitudModificarRad": result = crearSolicitudModificarRad(sesion, body); break;
      case "getMisSolicitudesModRad": result = getMisSolicitudesModRad(sesion); break;
      case "getSolicitudesModRadPendientes": result = getSolicitudesModRadPendientes(sesion); break;
      case "resolverSolicitudModRad": result = resolverSolicitudModRad(sesion, body); break;
      case "getSolicitudesModRadComite": result = getSolicitudesModRadComite(sesion); break;
      case "resolverSolicitudModRadComite": result = resolverSolicitudModRadComite(sesion, body); break;
      case "crearSolicitudCancelarRad": result = crearSolicitudCancelarRad(sesion, body); break;
      case "getMisSolicitudesCancelarRad": result = getMisSolicitudesCancelarRad(sesion); break;
      case "getSolicitudesCancelarRadPendientes": result = getSolicitudesCancelarRadPendientes(sesion); break;
      case "resolverSolicitudCancelarRad": result = resolverSolicitudCancelarRad(sesion, body); break;
      case "getHistorialRadicacion": result = getHistorialRadicacion(body.numeroRadicacion, sesion); break;
      case "logout": cerrarSesion(body.token); result = { success: true }; break;
      default: result = { success: false, error: "Acción no reconocida: " + action };
    }
  } catch(err) {
    registrarAuditoria("SISTEMA", "ERROR", err.toString());
    result = { success: false, error: "Error interno: " + err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Coordinadora, Asistente o Auxiliar: mismo permiso operativo (estados, actas, Fase 2/3, etc.). Rol en Sesiones en minúsculas. */
function sesionEsCoordinadoraOAsistente(sesion) {
  var r = sesion && String(sesion.rol || "").trim().toLowerCase();
  return r === "coordinadora" || r === "asistente" || r === "auxiliar";
}

// ── HELPERS ──────────────────────────────────────────────────
function getSheet(nombre) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(nombre);
}

/** Pestaña de sustentación: por gid de URL primero; si no, por nombre («Fase 3», variantes). */
function getSheetFase3() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ss.getSheets();
  var gi;
  if (typeof FASE3_SHEET_GID === "number" && FASE3_SHEET_GID > 0) {
    for (gi = 0; gi < sheets.length; gi++) {
      if (sheets[gi].getSheetId() === FASE3_SHEET_GID) return sheets[gi];
    }
  }
  var candidates = ["Fase 3", "Fase3", "FASE 3", "fase 3", "Fase  3"];
  var i;
  for (i = 0; i < candidates.length; i++) {
    var sh = ss.getSheetByName(candidates[i]);
    if (sh) return sh;
  }
  for (i = 0; i < sheets.length; i++) {
    var nm = String(sheets[i].getName() || "").replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
    if (nm === "fase 3" || nm === "fase3") return sheets[i];
  }
  return ss.getSheetByName("Fase 3");
}

function hoy() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function formatearFecha(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if (typeof val === "number" && isFinite(val)) {
    var serial = Math.floor(val);
    if (serial > 2000 && serial < 1200000) {
      var epoch = new Date(1899, 11, 30);
      var dn = new Date(epoch.getTime() + serial * 86400000);
      if (!isNaN(dn.getTime())) {
        return Utilities.formatDate(dn, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
    }
    return "";
  }
  var str = String(val).trim();
  if (!str || str === "-" || str === "—") return "";
  if (/^\d{5,7}(\.\d+)?$/.test(str)) {
    var sn = parseFloat(str);
    return formatearFecha(sn);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    var head = str.split(/[T\s]/)[0];
    var p = head.split("-");
    if (p.length === 3) {
      var y = parseInt(p[0], 10);
      var mo = parseInt(p[1], 10);
      var da = parseInt(p[2], 10);
      if (y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
        return p[0] + "-" + String(mo).padStart(2, "0") + "-" + String(da).padStart(2, "0");
      }
    }
  }
  var d2 = new Date(str);
  if (!isNaN(d2.getTime())) {
    var y2 = d2.getFullYear();
    if (y2 >= 1990 && y2 <= 2100) {
      return Utilities.formatDate(d2, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  }
  return "";
}

function formatearHora(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
  }
  var s = String(val).trim();
  if (!s) return "";
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "HH:mm");
  }
  return s;
}

function registrarTrazabilidadSustentacion(numeroRadicacion, rowIndex, accion, estado, actor, detalle) {
  try {
    var sheet = getSheet("Historial Sustentacion");
    if (!sheet) {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      sheet = ss.insertSheet("Historial Sustentacion");
      sheet.appendRow(["Timestamp", "NumeroRadicacion", "RowFase3", "Accion", "Estado", "Actor", "Detalle"]);
    }
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      timestamp,
      String(numeroRadicacion || ""),
      String(rowIndex || ""),
      String(accion || ""),
      String(estado || ""),
      String(actor || ""),
      String(detalle || "")
    ]);
  } catch (e) {
    Logger.log("Error trazabilidad sustentacion: " + e);
  }
}

function asegurarColumnasEstadoFase3(sheet) {
  if (!sheet) return;
  var minCols = 34;
  if (sheet.getMaxColumns() < minCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), minCols - sheet.getMaxColumns());
  }
  if (!sheet.getRange(1, 29).getValue()) sheet.getRange(1, 29).setValue("Estado Solicitud");
  if (!sheet.getRange(1, 30).getValue()) sheet.getRange(1, 30).setValue("Observaciones Estado");
  if (!sheet.getRange(1, 15).getValue()) sheet.getRange(1, 15).setValue("Jurado 1 Tel");
  if (!sheet.getRange(1, 18).getValue()) sheet.getRange(1, 18).setValue("Jurado 2 Tel");
  if (!sheet.getRange(1, 31).getValue()) sheet.getRange(1, 31).setValue("Jurado 1 Tel");
  if (!sheet.getRange(1, 32).getValue()) sheet.getRange(1, 32).setValue("Jurado 2 Tel");
  if (!sheet.getRange(1, 33).getValue()) sheet.getRange(1, 33).setValue("Jurado 1 Especialidad");
  if (!sheet.getRange(1, 34).getValue()) sheet.getRange(1, 34).setValue("Jurado 2 Especialidad");
}

/** Evita mostrar #ERROR! u otros valores corruptos de celda como texto útil */
function valorCeldaLegible(val) {
  var s = String(val === undefined || val === null ? "" : val).trim();
  if (!s) return "";
  if (/^#/.test(s) && /error/i.test(s)) return "";
  if (/^error$/i.test(s)) return "";
  return s;
}

function generarNumero(prefijo, nombreHoja) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(e) {
    return null;
  }

  try {
    var sheet = getSheet(nombreHoja);
    if (!sheet) return null;

    var data = sheet.getDataRange().getValues();
    var numeroMaximo = 0;

    for (var i = 1; i < data.length; i++) {
      var numero = String(data[i][1] || "").trim();
      if (!numero) continue;
      var match = numero.match(/(\d+)$/);
      if (match) {
        var num = parseInt(match[1]);
        if (num > numeroMaximo) numeroMaximo = num;
      }
    }

    var year = new Date().getFullYear();
    var numeroGenerado = prefijo + "-" + year + "-" + String(numeroMaximo + 1).padStart(4, "0");
    Logger.log("Número generado: " + numeroGenerado);
    return numeroGenerado;

  } finally {
    lock.releaseLock();
  }
}

function registrarAuditoria(email, accion, detalle) {
  try {
    var sheet = getSheet("Auditorias");
    if (!sheet) return;
    sheet.appendRow([sheet.getLastRow(), hoy(), email || "", accion || "", detalle || ""]);
    registrarTrazabilidadGlobal(email, accion, detalle);
  } catch(e) {}
}

function inferirModuloTrazabilidad(accion) {
  var a = String(accion || "").toUpperCase();
  if (a.indexOf("LOGIN") !== -1 || a.indexOf("SESION") !== -1 || a.indexOf("LOGOUT") !== -1) return "AUTH";
  if (a.indexOf("SOL_MOD") !== -1 || a.indexOf("SOLICITUD_MOD") !== -1 || a.indexOf("MOD_RAD") !== -1) return "FASE1";
  if (a.indexOf("RADICACION") !== -1 || a.indexOf("TUTORES") !== -1 || a.indexOf("FASE1") !== -1) return "FASE1";
  if (a.indexOf("PROTOCOLO") !== -1 || a.indexOf("COMITE") !== -1 || a.indexOf("FASE2") !== -1) return "FASE2";
  if (a.indexOf("ACTA") !== -1) return "ACTAS";
  if (a.indexOf("FASE3") !== -1 || a.indexOf("SUSTENT") !== -1 || a.indexOf("JURADOS") !== -1) return "SUSTENTACION";
  if (a.indexOf("ERROR") !== -1) return "SISTEMA";
  return "GENERAL";
}

function extraerNumeroRadicacion(texto) {
  var t = String(texto || "");
  var m = t.match(/CTTG-\d{4}-\d{3,5}/i);
  return m ? m[0].toUpperCase() : "";
}

function registrarTrazabilidadGlobal(email, accion, detalle) {
  try {
    var sheet = getSheet("Trazabilidad");
    if (!sheet) {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      sheet = ss.insertSheet("Trazabilidad");
      sheet.appendRow(["ID", "Timestamp", "Fecha", "Email", "Accion", "Modulo", "NumeroRadicacion", "Detalle"]);
    }
    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      sheet.getLastRow(),
      timestamp,
      hoy(),
      String(email || ""),
      String(accion || ""),
      inferirModuloTrazabilidad(accion),
      extraerNumeroRadicacion(detalle),
      String(detalle || "")
    ]);
  } catch (e) {
    Logger.log("Error trazabilidad global: " + e);
  }
}

// ── HISTORIAL UNIFICADO DE NEGOCIO ──────────────────────────────────────────
// Hoja "Historial": A=Timestamp | B=NumeroRadicacion | C=Fase | D=Accion
//                   E=EstadoAnterior | F=EstadoNuevo | G=Actor | H=Motivo | I=Detalle
function registrarHistorial(numeroRadicacion, fase, accion, estadoAnterior, estadoNuevo, actor, motivo, detalle) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName("Historial");
    if (!sheet) {
      sheet = ss.insertSheet("Historial");
      sheet.appendRow(["Timestamp","NumeroRadicacion","Fase","Accion","EstadoAnterior","EstadoNuevo","Actor","Motivo","Detalle"]);
      sheet.setFrozenRows(1);
    }
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      timestamp,
      String(numeroRadicacion || ""),
      String(fase || ""),
      String(accion || ""),
      String(estadoAnterior || ""),
      String(estadoNuevo || ""),
      String(actor || ""),
      String(motivo || ""),
      String(detalle || "")
    ]);
  } catch(e) {
    Logger.log("Error registrarHistorial: " + e);
  }
}

function getHistorialRadicacion(numeroRadicacion, sesion) {
  if (!sesion) return { success: false, error: "No autorizado" };
  var numero = String(numeroRadicacion || "").trim().toUpperCase();
  if (!numero) return { success: false, error: "Número de radicación requerido" };
  if (!sesionEsCoordinadoraOAsistente(sesion)) {
    if (String(sesion.rol || "").trim().toLowerCase() !== "estudiante")
      return { success: false, error: "No autorizado" };
    if (!estudiantePuedeVerRadicacionPorNumero(sesion.email, numero))
      return { success: false, error: "No autorizado para esta radicación" };
  }
  // Eventos reales de la hoja Historial
  var sheet = getSheet("Historial");
  var eventosReales = [];
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (String(r[1] || "").trim().toUpperCase() !== numero) continue;
      eventosReales.push({
        timestamp:      String(r[0] || ""),
        fase:           String(r[2] || ""),
        accion:         String(r[3] || ""),
        estadoAnterior: String(r[4] || ""),
        estadoNuevo:    String(r[5] || ""),
        actor:          String(r[6] || ""),
        motivo:         String(r[7] || ""),
        detalle:        String(r[8] || ""),
        reconstruido:   false
      });
    }
  }
  // Reconstruir desde hojas para radicaciones existentes (llena los huecos)
  var reconstruidos = reconstruirHistorialDesdeSheets(numero);
  // Agregar reconstruidos solo si no hay un evento real con la misma accion+fase+estadoNuevo
  var llaves = {};
  eventosReales.forEach(function(e) { llaves[e.fase + "|" + e.accion + "|" + e.estadoNuevo] = true; });
  reconstruidos.forEach(function(ev) {
    var k = ev.fase + "|" + ev.accion + "|" + ev.estadoNuevo;
    if (!llaves[k]) { llaves[k] = true; eventosReales.push(ev); }
  });
  eventosReales.sort(function(a, b) {
    var ta = String(a.timestamp || ""); var tb = String(b.timestamp || "");
    if (ta === "—" || ta === "") return 1;
    if (tb === "—" || tb === "") return -1;
    return ta.localeCompare(tb);
  });
  return { success: true, numeroRadicacion: numero, eventos: eventosReales };
}

function reconstruirHistorialDesdeSheets(numero) {
  var eventos = [];
  var num = String(numero || "").trim().toUpperCase();
  if (!num) return eventos;
  var tz = Session.getScriptTimeZone();

  function fmt(v) {
    if (!v) return "";
    try {
      var d = new Date(v);
      if (!isNaN(d.getTime())) return Utilities.formatDate(d, tz, "yyyy-MM-dd HH:mm:ss");
    } catch(e) {}
    return String(v);
  }

  // === FASE 1 ===
  var shF1 = getSheet("Fase1");
  if (shF1) {
    var d1 = shF1.getDataRange().getValues();
    for (var i = 1; i < d1.length; i++) {
      var r = d1[i];
      if (String(r[1] || "").trim().toUpperCase() !== num) continue;
      var fechaRad = fmt(r[33]);
      eventos.push({
        timestamp: fechaRad || "—",
        fase: "FASE1", accion: "RADICACION",
        estadoAnterior: "", estadoNuevo: "Radicado",
        actor: String(r[2] || ""),
        motivo: String(r[35] || ""),
        detalle: "Modalidad: " + String(r[22] || "") + " | Área: " + String(r[23] || "") +
                 " | Tutor1: " + String(r[24] || "") + " | Tutor2: " + String(r[28] || ""),
        reconstruido: true
      });
      var estadoActual = String(r[32] || "");
      var aprobadoPor  = String(r[36] || "");
      var fechaAprobF1 = fmt(r[34]);
      if (estadoActual && estadoActual !== "Radicado") {
        eventos.push({
          timestamp: fechaAprobF1 || fechaRad || "—",
          fase: "FASE1", accion: "ACTUALIZAR_ESTADO",
          estadoAnterior: "Radicado", estadoNuevo: estadoActual,
          actor: aprobadoPor,
          motivo: String(r[35] || ""),
          detalle: "Estado actual registrado en Fase1",
          reconstruido: true
        });
      }
      // Tutores: si hay tutor1Email y el estado menciona tutores
      var tutor1Email = String(r[25] || "").trim();
      var tutor2Email = String(r[29] || "").trim();
      if (tutor1Email || tutor2Email) {
        var estadoTutores = estadoActual.toLowerCase();
        if (estadoTutores.indexOf("tutor") !== -1 || estadoTutores.indexOf("aval") !== -1) {
          eventos.push({
            timestamp: fechaAprobF1 || fechaRad || "—",
            fase: "FASE1", accion: "VALIDAR_TUTORES",
            estadoAnterior: "Radicado", estadoNuevo: estadoActual,
            actor: aprobadoPor,
            motivo: "",
            detalle: "T1: " + String(r[24] || "") + " (" + tutor1Email + ") | T2: " + String(r[28] || "") + " (" + tutor2Email + ")",
            reconstruido: true
          });
        }
      }
      break;
    }
  }

  // === FASE 2 — todas las filas (sin deduplicar) ===
  var shF2 = getSheet("Fase2");
  if (shF2) {
    var d2 = shF2.getDataRange().getValues();
    for (var i = 1; i < d2.length; i++) {
      var r = d2[i];
      if (!r[0]) continue;
      if (String(r[1] || "").trim().toUpperCase() !== num) continue;
      var fSol = fmt(r[3]);
      var fAprobP = fmt(r[9]);
      var estadoP = String(r[8] || "Cargado");
      var evaluador = String(r[6] || "");
      var observP = String(r[10] || "");
      eventos.push({
        timestamp: fSol || "—",
        fase: "FASE2", accion: "CREAR_PROTOCOLO",
        estadoAnterior: "", estadoNuevo: "Cargado",
        actor: String(r[2] || r[13] || ""),
        motivo: "",
        detalle: "Archivo: " + String(r[5] || ""),
        reconstruido: true
      });
      if (estadoP !== "Cargado") {
        var accionP = estadoP.toLowerCase().indexOf("devuelt") !== -1 ? "ACTUALIZAR_PROTOCOLO" :
                      estadoP.toLowerCase().indexOf("comit") !== -1 ? "REGISTRAR_DECISION_COMITE" :
                      "AVALAR_PROTOCOLO_FASE2";
        eventos.push({
          timestamp: fAprobP || fSol || "—",
          fase: "FASE2", accion: accionP,
          estadoAnterior: "Cargado", estadoNuevo: estadoP,
          actor: evaluador || String(r[13] || ""),
          motivo: observP,
          detalle: "Evaluador: " + evaluador + (r[16] ? " | Acta: " + String(r[16] || "") : "") + (r[17] ? " | Aval CCEB: " + String(r[17] || "") : ""),
          reconstruido: true
        });
      }
    }
  }

  // === ACTAS DE ASESORÍA ===
  var shActas = getSheet("Acta asesoria");
  if (shActas) {
    var dA = shActas.getDataRange().getValues();
    for (var i = 1; i < dA.length; i++) {
      var r = dA[i];
      if (!r[0]) continue;
      if (String(r[1] || "").trim().toUpperCase() !== num) continue;
      var fCargaA = fmt(r[5]);
      var estadoA = String(r[6] || "Pendiente revisión");
      var observA = String(r[7] || "");
      eventos.push({
        timestamp: fCargaA || "—",
        fase: "ACTAS", accion: "CREAR_ACTA",
        estadoAnterior: "", estadoNuevo: "Pendiente revisión",
        actor: String(r[2] || ""),
        motivo: "",
        detalle: "Archivo: " + String(r[3] || ""),
        reconstruido: true
      });
      if (estadoA !== "Pendiente revisión") {
        eventos.push({
          timestamp: fCargaA || "—",
          fase: "ACTAS", accion: estadoA === "Rechazada" ? "RECHAZAR_ACTA" : "APROBAR_ACTA",
          estadoAnterior: "Pendiente revisión", estadoNuevo: estadoA,
          actor: "",
          motivo: observA,
          detalle: "Archivo: " + String(r[3] || ""),
          reconstruido: true
        });
      }
    }
  }

  // === FASE 3 ===
  var shF3 = getSheetFase3();
  if (shF3) {
    try { asegurarColumnasEstadoFase3(shF3); } catch(e) {}
    var d3 = shF3.getDataRange().getDisplayValues();
    var carryN = "";
    for (var i = 1; i < d3.length; i++) {
      var r = d3[i];
      var rawB = String(r[1] || "").trim();
      var numF3 = (rawB ? (extraerNumeroRadicacion(rawB) || rawB) : carryN);
      if (rawB) carryN = numF3;
      if (!numF3) continue;
      if (numF3.toUpperCase() !== num) continue;
      var fCargaF3 = String(r[12] || "");
      var fSustF3  = String(r[3] || "");
      var estadoF3 = String(r[28] || "");
      var j1 = String(r[13] || "");
      var j2 = String(r[16] || "");
      if (fCargaF3) {
        eventos.push({
          timestamp: fCargaF3,
          fase: "FASE3", accion: "CREAR_FASE3",
          estadoAnterior: "", estadoNuevo: "Solicitud sustentación radicada",
          actor: String(r[2] || ""),
          motivo: "",
          detalle: "Turnitin: " + String(r[11] || "") + "% | J1 propuesto: " + j1,
          reconstruido: true
        });
      }
      if (fSustF3 && j1) {
        eventos.push({
          timestamp: fSustF3,
          fase: "FASE3", accion: "ASIGNAR_JURADOS",
          estadoAnterior: "Solicitud sustentación radicada", estadoNuevo: "Sustentación programada",
          actor: "",
          motivo: "",
          detalle: "Fecha: " + fSustF3 + " | Hora: " + String(r[26] || "") + " | J1: " + j1 + " | J2: " + j2,
          reconstruido: true
        });
      }
      var estadoF3Low = estadoF3.toLowerCase();
      if (estadoF3 && estadoF3Low !== "solicitud sustentación radicada" && estadoF3Low !== "sustentación programada" && estadoF3Low !== "solicitud sustentacion radicada" && estadoF3Low !== "sustentacion programada") {
        eventos.push({
          timestamp: fSustF3 || fCargaF3 || "—",
          fase: "FASE3", accion: "COMPLETAR_FASE3",
          estadoAnterior: "Sustentación programada", estadoNuevo: estadoF3,
          actor: "",
          motivo: String(r[29] || ""),
          detalle: "Nota: " + String(r[22] || "") + " | Acta: " + String(r[21] || "") + " | Producto: " + String(r[23] || ""),
          reconstruido: true
        });
      }
      break;
    }
  }

  return eventos;
}

function estudiantePuedeVerRadicacionPorNumero(emailEstudiante, numeroRadicacion) {
  var emailLower = String(emailEstudiante || "").trim().toLowerCase();
  var numero = String(numeroRadicacion || "").trim().toUpperCase();
  if (!emailLower || !numero) return false;
  var sheet = getSheet("Fase1");
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var n = String(row[1] || "").trim().toUpperCase();
    if (n !== numero) continue;
    var emails = [
      String(row[2] || "").trim().toLowerCase(),
      String(row[5] || "").trim().toLowerCase(),
      String(row[11] || "").trim().toLowerCase(),
      String(row[17] || "").trim().toLowerCase()
    ];
    var j;
    for (j = 0; j < emails.length; j++) {
      if (emails[j] && emails[j] === emailLower) return true;
    }
    return false;
  }
  return false;
}

function obtenerTrazabilidad(sesion, numeroRadicacion, limit) {
  if (!sesion) return { success: false, error: "No autorizado" };

  var max = parseInt(limit, 10);
  if (isNaN(max) || max <= 0) max = 200;
  if (max > 1000) max = 1000;

  var esStaff = sesionEsCoordinadoraOAsistente(sesion);
  var numeroFiltro = String(numeroRadicacion || "").trim().toUpperCase();

  if (!esStaff) {
    var rolEst = String(sesion.rol || "").trim().toLowerCase();
    if (rolEst !== "estudiante") return { success: false, error: "No autorizado" };
    if (!numeroFiltro) return { success: false, error: "Indica el número de radicación para ver movimientos" };
    if (!estudiantePuedeVerRadicacionPorNumero(sesion.email, numeroFiltro)) {
      return { success: false, error: "No autorizado para esta radicación" };
    }
  }

  var sheet = getSheet("Trazabilidad");
  if (!sheet) return { success: true, registros: [] };
  var data = sheet.getDataRange().getValues();
  var registros = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var r = data[i];
    var numero = String(r[6] || "").trim().toUpperCase();
    if (numeroFiltro && numero !== numeroFiltro) continue;
    registros.push({
      id: String(r[0] || ""),
      timestamp: String(r[1] || ""),
      fecha: String(r[2] || ""),
      email: String(r[3] || ""),
      accion: String(r[4] || ""),
      modulo: String(r[5] || ""),
      numeroRadicacion: numero,
      detalle: String(r[7] || "")
    });
    if (registros.length >= max) break;
  }
  return { success: true, registros: registros };
}
function generarToken() {
  return Utilities.getUuid();
}

/** Garantiza pestaña Sesiones en el libro configurado (evita «sesión inválida» si falta la hoja). */
function getSheetSesiones() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName("Sesiones");
  if (sh) return sh;
  try {
    sh = ss.insertSheet("Sesiones");
    sh.getRange(1, 1, 1, 7).setValues([[
      "ID", "Token", "Email", "Rol", "Creado", "Expira", "Estado"
    ]]);
    sh.setFrozenRows(1);
  } catch (e) {
    Logger.log("getSheetSesiones: " + e);
    return null;
  }
  return sh;
}

/** Parseo estable de fecha de expiración (valor en hoja o Date serial). */
function parseExpiracionSesion(val) {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number" && isFinite(val)) {
    var epoch = new Date(1899, 11, 30);
    var dn = new Date(epoch.getTime() + Math.floor(val) * 86400000);
    if (!isNaN(dn.getTime())) return dn;
  }
  var d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  var s = String(val === undefined || val === null ? "" : val).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    return new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10),
      parseInt(m[4], 10),
      parseInt(m[5], 10),
      parseInt(m[6], 10)
    );
  }
  return new Date(NaN);
}

function crearSesion(email, rol) {
  var sheet = getSheetSesiones();
  if (!sheet) return null;

  // Invalidar sesiones anteriores del mismo usuario — escritura en lote
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var statusCol = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
    var emailCol  = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    var emailLow  = email.toLowerCase();
    var changed   = false;
    for (var i = 0; i < emailCol.length; i++) {
      if (String(emailCol[i][0] || "").toLowerCase() === emailLow) {
        statusCol[i][0] = "inactivo";
        changed = true;
      }
    }
    if (changed) sheet.getRange(2, 7, lastRow - 1, 1).setValues(statusCol);
  }

  var token = generarToken();
  var ahora = new Date();
  var expiracion = new Date(ahora.getTime() + 72 * 60 * 60 * 1000); // 72 horas

  sheet.appendRow([
    lastRow,
    token,
    email,
    rol,
    Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    Utilities.formatDate(expiracion, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    "activo"
  ]);

  return token;
}

function verificarToken(token) {
  if (!token) return null;
  var sheet = getSheetSesiones();
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var ahora = new Date();

  for (var i = 1; i < data.length; i++) {
    var rowToken  = String(data[i][1] || "").trim();
    var rowEmail  = String(data[i][2] || "").trim();
    var rowRol    = String(data[i][3] || "").trim();
    var rowExpira = parseExpiracionSesion(data[i][5]);
    var rowActivo = String(data[i][6] || "").trim();

    if (rowToken === token && rowActivo === "activo" && !isNaN(rowExpira.getTime()) && rowExpira.getTime() > ahora.getTime()) {
      return { email: rowEmail, rol: rowRol };
    }
  }
  return null;
}

function cerrarSesion(token) {
  if (!token) return;
  var sheet = getSheetSesiones();
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1] || "").trim() === token) {
      sheet.getRange(i + 1, 7).setValue("inactivo");
      break;
    }
  }
}

// ── NOTIFICACIONES CENTRALIZADAS ─────────────────────────────
// Hoja Fase1 columnas base-1:
// B(2)=Numero | C(3)=EmailEst | E(5)=Nombre1 | V(22)=Titulo
// Y(25)=T1Nombre | Z(26)=T1Email | AC(29)=T2Nombre | AD(30)=T2Email

function notificarCambioEstado(rowIndex, estado, extras) {
  var sheet = getSheet("Fase1");
  var ri    = parseInt(rowIndex);
  extras    = extras || {};

  var numero   = String(sheet.getRange(ri, 2).getValue()  || "");
  var emailEst = String(sheet.getRange(ri, 3).getValue()  || "");
  var nombre1  = String(sheet.getRange(ri, 5).getValue()  || "");
  var titulo   = String(sheet.getRange(ri, 22).getValue() || "Sin título");
  var t1Nombre = String(sheet.getRange(ri, 25).getValue() || "");
  var t1Email  = String(sheet.getRange(ri, 26).getValue() || "");
  var t2Nombre = String(sheet.getRange(ri, 29).getValue() || "");
  var t2Email  = String(sheet.getRange(ri, 30).getValue() || "");
  var notas    = extras.notas    || "";
  var nota     = extras.nota     || "";
  var acta     = extras.acta     || "";
  var j1Email  = extras.j1Email  || "";
  var j1Nombre = extras.j1Nombre || "";
  var j2Email  = extras.j2Email  || "";
  var j2Nombre = extras.j2Nombre || "";

  var modalidadDip = String(sheet.getRange(ri, 23).getValue() || "").trim().toLowerCase() === "diplomado";
  var dipModoJurado = "";
  if (modalidadDip) {
    try {
      dipModoJurado = String(sheet.getRange(ri, 52).getValue() || "").trim().toLowerCase();
    } catch (eDipM) {}
  }
  var dipEsCttg = dipModoJurado === "cttg_asigna";

  var msgEst = "", msgCoord = "", msgT1 = "", msgT2 = "", msgJ1 = "", msgJ2 = "";

  if (estado === "Radicado") {
    if (modalidadDip) {
      if (dipEsCttg) {
        msgEst   = "Tu solicitud de modalidad Diplomado fue radicada.\n\nNúmero: " + numero + "\nPrograma / título: " + titulo + "\n\nIndicaste que el tutor no sugirió jurado: el Comité Técnico de Trabajos de Grado, con la coordinación, asignará evaluador(a) para la sesión cuando corresponda. Esta modalidad no incluye tutores ni sustentación.";
        msgCoord = "Nueva radicación Diplomado.\n\nNúmero: " + numero + "\nEstudiante: " + nombre1 + "\nPrograma: " + titulo + "\n\nSin jurado sugerido en Fase 1 (modo CTTG). Revise fechas del diplomado. Pendiente aval de coordinación; luego asignación de evaluador con el comité.";
      } else {
        msgEst   = "Tu solicitud de modalidad Diplomado fue radicada.\n\nNúmero: " + numero + "\nPrograma / título: " + titulo + "\n\nRegistraste un jurado sugerido por el tutor para cuando el producto pase por el Comité Técnico de Trabajos de Grado. La coordinación revisará la solicitud; podrá designar como evaluador(a) a esa persona u otra para la sesión de comité. Esta modalidad no incluye tutores ni sustentación.";
        msgCoord = "Nueva radicación Diplomado.\n\nNúmero: " + numero + "\nEstudiante: " + nombre1 + "\nPrograma: " + titulo + "\n\nRevise fechas y datos del jurado sugerido por el tutor (Fase 1). Pendiente aval de coordinación.";
      }
    } else {
      msgEst   = "Tu proyecto ha sido radicado exitosamente.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nLa coordinadora revisará tus tutores pronto. Te notificaremos cuando haya novedades.";
      msgCoord = "Nueva radicación recibida.\n\nNúmero: " + numero + "\nEstudiante: " + nombre1 + "\nTítulo: " + titulo + "\n\nPendiente revisión de tutores.";
    }
   var nombre2 = String(sheet.getRange(ri, 11).getValue() || "");
var nombre3 = String(sheet.getRange(ri, 17).getValue() || "");
msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nHas sido registrado como tutor del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\n--- ESTUDIANTE(S) ---\nEstudiante 1: " + nombre1 + " · Cédula: " + sheet.getRange(ri, 4).getValue() + " · Email: " + sheet.getRange(ri, 6).getValue() + " · Teléfono: " + sheet.getRange(ri, 7).getValue() + " · Semestre: " + sheet.getRange(ri, 8).getValue() + (nombre2 ? "\n\nEstudiante 2: " + nombre2 + " · Cédula: " + sheet.getRange(ri, 10).getValue() + " · Email: " + sheet.getRange(ri, 12).getValue() + " · Teléfono: " + sheet.getRange(ri, 13).getValue() + " · Semestre: " + sheet.getRange(ri, 14).getValue() : "") + (nombre3 ? "\n\nEstudiante 3: " + nombre3 + " · Cédula: " + sheet.getRange(ri, 16).getValue() + " · Email: " + sheet.getRange(ri, 18).getValue() + " · Teléfono: " + sheet.getRange(ri, 19).getValue() + " · Semestre: " + sheet.getRange(ri, 20).getValue() : "") + "\n\nLa coordinadora confirmará tu vinculación pronto." : "";
   msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nHas sido registrado como tutor del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\n--- ESTUDIANTE(S) ---\nEstudiante 1: " + nombre1 + " · Cédula: " + sheet.getRange(ri, 4).getValue() + " · Email: " + sheet.getRange(ri, 6).getValue() + " · Teléfono: " + sheet.getRange(ri, 7).getValue() + " · Semestre: " + sheet.getRange(ri, 8).getValue() + (nombre2 ? "\n\nEstudiante 2: " + nombre2 + " · Cédula: " + sheet.getRange(ri, 10).getValue() + " · Email: " + sheet.getRange(ri, 12).getValue() + " · Teléfono: " + sheet.getRange(ri, 13).getValue() + " · Semestre: " + sheet.getRange(ri, 14).getValue() : "") + (nombre3 ? "\n\nEstudiante 3: " + nombre3 + " · Cédula: " + sheet.getRange(ri, 16).getValue() + " · Email: " + sheet.getRange(ri, 18).getValue() + " · Teléfono: " + sheet.getRange(ri, 19).getValue() + " · Semestre: " + sheet.getRange(ri, 20).getValue() : "") + "\n\nLa coordinadora confirmará tu vinculación pronto." : "";
    if (modalidadDip) { msgT1 = ""; msgT2 = ""; }
  }
  else if (estado === "Tutores Avalados") {
    msgEst   = "¡Buenas noticias! Tus tutores han sido avalados por la coordinadora.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nYa puedes cargar tus actas de asesoría desde el portal.";
    msgCoord = "Tutores avalados para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo;
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nTu vinculación como tutor ha sido confirmada para el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nTu vinculación como tutor ha sido confirmada para el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero : "";
  }
  else if (estado === "Fase 2 Desbloqueada") {
    if (modalidadDip) {
      if (dipEsCttg) {
        msgEst   = "Tu diplomado fue avalado por la coordinación.\n\nNúmero: " + numero + "\nPrograma: " + titulo + "\n\nYa puedes cargar el producto final en Fase 2. El Comité Técnico de Trabajos de Grado lo valorará; la coordinación asignará evaluador(a) para la sesión (no registraste jurado sugerido por el tutor). No aplica sustentación.";
        msgCoord = "Diplomado avalado (Fase 2 desbloqueada) · " + numero + ".\n\nEstudiante: " + nombre1 + "\nModo jurado: asignación CTTG. Puede cargar producto para el comité técnico de trabajos de grado.";
      } else {
        msgEst   = "Tu diplomado fue avalado por la coordinación.\n\nNúmero: " + numero + "\nPrograma: " + titulo + "\n\nYa puedes cargar el producto final en Fase 2. El Comité Técnico de Trabajos de Grado lo valorará; la coordinación puede asignar como evaluador(a) al jurado que registraste en la radicación u otra persona. No aplica sustentación.";
        msgCoord = "Diplomado avalado (Fase 2 desbloqueada) · " + numero + ".\n\nEstudiante: " + nombre1 + "\nPuede cargar producto para el comité técnico de trabajos de grado.";
      }
    } else {
      msgEst   = "¡Tus actas de asesoría fueron aprobadas!\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nYa puedes ingresar al portal y subir tu protocolo en la Fase 2.";
      msgCoord = "Actas aprobadas para " + numero + ".\n\nEstudiante: " + nombre1 + "\nEl estudiante ya puede subir su protocolo.";
    }
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nLas actas de asesoría del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nHan sido aprobadas. El estudiante procederá con la Fase 2." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nLas actas de asesoría del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nHan sido aprobadas. El estudiante procederá con la Fase 2." : "";
    if (modalidadDip) { msgT1 = ""; msgT2 = ""; }
  }
  else if (estado === "Pendiente Comité Técnico") {
    if (modalidadDip) {
      if (dipEsCttg) {
        msgEst   = "Tu producto de diplomado fue recibido.\n\nNúmero: " + numero + "\nPrograma: " + titulo + "\n\nQuedó en cola del Comité Técnico de Trabajos de Grado. La coordinación asignará fecha de sesión y evaluador(a) (no había jurado sugerido por el tutor en la radicación). Luego el comité registrará el aval. No hay sustentación.";
        msgCoord = "Nuevo producto diplomado (Fase 2) para " + numero + ".\n\nEstudiante: " + nombre1 + "\n\nAsigne fecha de comité y evaluador. Modo radicación: CTTG asigna evaluador.";
      } else {
        msgEst   = "Tu producto de diplomado fue recibido.\n\nNúmero: " + numero + "\nPrograma: " + titulo + "\n\nQuedó en cola del Comité Técnico de Trabajos de Grado. La coordinación asignará fecha de sesión y evaluador(a): puede ser el jurado que registraste en la radicación u otra persona. Luego el comité registrará el aval. No hay sustentación.";
        msgCoord = "Nuevo producto diplomado (Fase 2) para " + numero + ".\n\nEstudiante: " + nombre1 + "\n\nAsigne fecha de comité y evaluador. Jurado sugerido por el tutor en Fase 1.";
      }
    } else {
      msgEst   = "Tu protocolo fue recibido correctamente.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nEstá pendiente de evaluación por el comité técnico. Te notificaremos cuando haya una decisión.";
      msgCoord = "Nuevo protocolo recibido para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo + "\n\nPendiente asignación de evaluador y fecha de comité.";
    }
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nEstá en revisión por el comité técnico." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nEstá en revisión por el comité técnico." : "";
    if (modalidadDip) { msgT1 = ""; msgT2 = ""; }
  }
  else if (estado === "Aprobado") {
    if (modalidadDip) {
      msgEst   = "¡Felicitaciones! El Comité Técnico de Trabajos de Grado avaló tu producto de diplomado.\n\nNúmero: " + numero + "\nPrograma: " + titulo + (notas ? "\n\nObservaciones: " + notas : "") + "\n\nCon esto se cierra el trámite en esta modalidad (no requiere sustentación).";
      msgCoord = "Producto diplomado aprobado por el comité técnico de trabajos de grado · " + numero + ".\n\nEstudiante: " + nombre1;
    } else {
      msgEst   = "¡Felicitaciones! Tu protocolo fue aprobado por el comité técnico.\n\nNúmero: " + numero + "\nTítulo: " + titulo + (notas ? "\n\nObservaciones: " + notas : "") + "\n\nYa puedes solicitar tu sustentación desde el portal.";
      msgCoord = "Protocolo aprobado para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo;
    }
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue aprobado por el comité técnico. El estudiante procederá con la sustentación." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue aprobado por el comité técnico. El estudiante procederá con la sustentación." : "";
    if (modalidadDip) { msgT1 = ""; msgT2 = ""; }
  }
  else if (estado === "Devuelto por Comité Técnico") {
    if (modalidadDip) {
      msgEst   = "Tu producto de diplomado fue devuelto por el Comité Técnico de Trabajos de Grado para una nueva valoración.\n\nNúmero: " + numero + "\nPrograma: " + titulo + (notas ? "\n\nMotivo: " + notas : "") + "\n\nAjusta el documento y vuelve a cargarlo desde Fase 2 del portal.";
      msgCoord = "Producto diplomado devuelto por el comité técnico de trabajos de grado · " + numero + ".\n\nEstudiante: " + nombre1 + (notas ? "\nMotivo: " + notas : "");
    } else {
      msgEst   = "Tu protocolo fue devuelto por el Comité Técnico para una nueva valoración.\n\nNúmero: " + numero + "\nTítulo: " + titulo + (notas ? "\n\nMotivo: " + notas : "") + "\n\nRealiza los ajustes indicados y vuelve a cargar el protocolo desde la Fase 2 del portal.";
      msgCoord = "Protocolo devuelto por Comité Técnico para " + numero + ".\n\nEstudiante: " + nombre1 + (notas ? "\nMotivo: " + notas : "");
    }
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue devuelto por el Comité Técnico y requiere una nueva valoración." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue devuelto por el Comité Técnico y requiere una nueva valoración." : "";
  }
  else if (estado === "Devuelto") {
    msgEst   = "Tu protocolo fue devuelto para correcciones.\n\nNúmero: " + numero + "\nTítulo: " + titulo + (notas ? "\n\nMotivo: " + notas : "") + "\n\nRealiza los ajustes indicados y vuelve a cargarlo en el portal.";
    msgCoord = "Protocolo devuelto para " + numero + ".\n\nEstudiante: " + nombre1 + (notas ? "\nMotivo: " + notas : "");
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nRequiere correcciones antes de ser evaluado por el comité." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nRequiere correcciones antes de ser evaluado por el comité." : "";
  }
  else if (estado === "Sustentado") {
    msgEst   = "¡Felicitaciones! Has completado tu proceso de grado exitosamente.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\nNota final: " + nota + "\nNúmero de acta: " + acta + "\n\n¡Muchos éxitos en tu vida profesional!";
    msgCoord = "Sustentación completada para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo + "\nNota: " + nota + "\nActa: " + acta;
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl estudiante " + nombre1 + " sustentó exitosamente el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\nNota final: " + nota : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl estudiante " + nombre1 + " sustentó exitosamente el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\nNota final: " + nota : "";
    msgJ1    = j1Email  ? "Hola " + j1Nombre + ",\n\nGracias por su participación como jurado en la sustentación del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\nNota registrada: " + nota : "";
    msgJ2    = j2Email  ? "Hola " + j2Nombre + ",\n\nGracias por su participación como jurado en la sustentación del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\nNota registrada: " + nota : "";
  }
  else if (estado === "Reprobado") {
    msgEst   = "Tu sustentación ha sido evaluada.\n\nNúmero: " + numero + "\nNota: " + nota + "\nNúmero de acta: " + acta + "\n\nComunícate con la coordinadora para conocer los siguientes pasos.";
    msgCoord = "Sustentación reprobada para " + numero + ".\n\nEstudiante: " + nombre1 + "\nNota: " + nota + "\nActa: " + acta;
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nLa sustentación del proyecto \"" + titulo + "\" · " + numero + " obtuvo nota: " + nota + "." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nLa sustentación del proyecto \"" + titulo + "\" · " + numero + " obtuvo nota: " + nota + "." : "";
  }

  var subject = "📋 CTTG Medicina · " + numero + " · " + estado;
  try { if (emailEst)           MailApp.sendEmail({ to: emailEst,            subject: subject, body: msgEst }); }   catch(e) { Logger.log("Error correo est: " + e); }
  try { if (COORDINADORA_EMAIL) MailApp.sendEmail({ to: COORDINADORA_EMAIL,  subject: subject, body: msgCoord }); } catch(e) { Logger.log("Error correo coord: " + e); }
  try { if (t1Email && msgT1)   MailApp.sendEmail({ to: t1Email,             subject: subject, body: msgT1 }); }    catch(e) { Logger.log("Error correo t1: " + e); }
  try { if (t2Email && msgT2)   MailApp.sendEmail({ to: t2Email,             subject: subject, body: msgT2 }); }    catch(e) { Logger.log("Error correo t2: " + e); }
  try { if (j1Email && msgJ1)   MailApp.sendEmail({ to: j1Email,             subject: subject, body: msgJ1 }); }    catch(e) { Logger.log("Error correo j1: " + e); }
  try { if (j2Email && msgJ2)   MailApp.sendEmail({ to: j2Email,             subject: subject, body: msgJ2 }); }    catch(e) { Logger.log("Error correo j2: " + e); }

  registrarAuditoria("SISTEMA", "NOTIFICACION_" + estado, numero);
}

// ── AUTH ─────────────────────────────────────────────────────
// Hoja Usuarios: A=ID | B=Email | C=Contraseña | D=Nombre | E=Rol | F=FechaCreacion | G=Estado
function norm_(s) {
  // Elimina espacios normales, non-breaking spaces y otros Unicode whitespace
  return String(s || "").replace(/[ ​‌‍﻿\t\r\n]+/g, "").trim();
}
function leerFilasUsuarios_(sheet) {
  // Usa getMaxRows() para leer TODAS las filas incluyendo las que getLastRow() omite
  var totalFilas = Math.max(sheet.getLastRow(), sheet.getMaxRows(), 100);
  return sheet.getRange(1, 1, totalFilas, 7).getValues();
}
/** Resolución contra hoja «Usuarios» sin crear sesión (reutilizada por login y depuración). */
function resolverUsuarioCredenciales_(email, password) {
  if (!email || !password) return { success: false, error: "Credenciales incompletas" };
  var sheet = getSheet("Usuarios");
  if (!sheet) return { success: false, error: "Hoja Usuarios no encontrada" };
  var data = leerFilasUsuarios_(sheet);
  var inputEmail = norm_(email).toLowerCase();
  var inputPass = norm_(password);
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    var rowEmail = norm_(String(row[1] || "")).toLowerCase();
    var rowPass = norm_(String(row[2] || ""));
    var rowNombre = norm_(String(row[3] || ""));
    var rowRol = norm_(String(row[4] || "")).toLowerCase();
    var rowEstado = norm_(String(row[6] || "")).toLowerCase();
    if (!rowEmail) continue;
    if (rowEstado === "inactivo") continue;
    if (rowEmail === inputEmail && rowPass === inputPass) {
      return { success: true, user: { id: i + 1, email: rowEmail, rol: rowRol, nombre: rowNombre } };
    }
  }
  return { success: false, error: "Credenciales incorrectas" };
}

function loginUsuario(email, password) {
  var chk = resolverUsuarioCredenciales_(email, password);
  if (!chk.success) {
    if (chk.error === "Credenciales incorrectas") {
      registrarAuditoria(email, "LOGIN_FAIL", "Credenciales incorrectas");
    }
    return chk;
  }
  registrarAuditoria(email, "LOGIN", "Acceso exitoso · rol: " + chk.user.rol);
  var token = crearSesion(chk.user.email, chk.user.rol);
  if (!token) {
    return { success: false, error: "No se pudo crear la sesión. Cree una pestaña «Sesiones» en el libro o revise permisos del script sobre el archivo." };
  }
  return { success: true, user: chk.user, token: token };
}

/**
 * Solo coordinadora/asistente: mismo criterio de credenciales que login, sin crear token.
 * Devuelve resumen por fila (sin contraseñas) para usar desde la consola del navegador.
 */
function obtenerResumenTodosUsuariosParaConsola_(sheet) {
  if (!sheet) return [];
  var totalFilas = Math.max(sheet.getLastRow(), sheet.getMaxRows(), 100);
  var vals = sheet.getRange(1, 1, totalFilas, 7).getValues();
  var disp = sheet.getRange(1, 1, totalFilas, 7).getDisplayValues();
  var out = [];
  var idx;
  for (idx = 1; idx < vals.length; idx++) {
    var row = vals[idx];
    var rowEmail = norm_(String(row[1] || "")).toLowerCase();
    if (!rowEmail || rowEmail.indexOf("@") < 0) continue;
    var rawC = row[2];
    var tipoPass = "";
    if (rawC instanceof Date) tipoPass = "fecha";
    else if (typeof rawC === "number") tipoPass = "numero";
    else if (rawC === "" || rawC === null || rawC === undefined) tipoPass = "vacio";
    else tipoPass = "texto";
    var comparableLogin = norm_(String(row[2] || ""));
    out.push({
      fila: idx + 1,
      email: rowEmail,
      nombre: norm_(String(row[3] || "")),
      rol: norm_(String(row[4] || "")).toLowerCase(),
      estado: norm_(String(row[6] || "")),
      tipo_pass_celda: tipoPass,
      long_pass_compara_login: comparableLogin.length,
      display_c_primero_40:
        tipoPass === "fecha" ? String(disp[idx][2] || "").slice(0, 40) : ""
    });
  }
  return out;
}

function loginDebugListaUsuarios(email, password) {
  var chk = resolverUsuarioCredenciales_(email, password);
  if (!chk.success) return chk;
  var rl = String(chk.user.rol || "").toLowerCase();
  if (rl !== "coordinadora" && rl !== "asistente" && rl !== "auxiliar") {
    return {
      success: false,
      error: "Para listar usuarios usa una cuenta coordinadora, asistente o auxiliar en el mismo formulario."
    };
  }
  var sheet = getSheet("Usuarios");
  if (!sheet) return { success: false, error: "Hoja Usuarios no encontrada" };
  var lista = obtenerResumenTodosUsuariosParaConsola_(sheet);
  var lr = sheet.getLastRow();
  var mr = sheet.getMaxRows();
  var filasLeidasMath = Math.max(lr, mr, 100);
  registrarAuditoria(norm_(String(email)), "DEBUG_LIST_USERS", lista.length + " filas_con_email");
  return {
    success: true,
    total: lista.length,
    usuarios: lista,
    avisoListadoSinSecretos:
      "Listado diagnostico sin contraseñas. Coordinación ya puede ver usuarios también en Google Sheets.",
    diagnostico_lectura_hoja_usuarios: {
      nombre_pestana: sheet.getName(),
      getLastRow: lr,
      getMaxRows_pestana: mr,
      filas_que_entran_en_getValues: filasLeidasMath,
      columnas_en_login_listado_ag: "A:G (columna B=correo, C=clave, E=rol, G=estado). Datos más a la derecha NO se miran.",
      advertencia_filas_sin_email_b: lista.length +
        " cuenta filas donde la columna B tiene un texto con «@». Si en Sheets tienes usuarios pero no aparecen, revisá si el correo quedó en otra columna."
    }
  };
}
function debugUsuario(email) {
  var sheet = getSheet("Usuarios");
  if (!sheet) return { success: false, error: "Hoja no encontrada" };
  var data = leerFilasUsuarios_(sheet);
  var totalFilasSheet = sheet.getLastRow();
  var inputEmail = norm_(email).toLowerCase();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var colBRaw = String(row[1] || "");
    var colBNorm = norm_(colBRaw).toLowerCase();
    if (colBNorm === inputEmail || colBRaw.toLowerCase().trim() === email.toLowerCase().trim()) {
      rows.push({
        fila: i + 1,
        colA: JSON.stringify(row[0]),
        colB_raw: colBRaw,
        colB_norm: colBNorm,
        colC_raw: String(row[2] || ""),
        colC_norm: norm_(String(row[2] || "")),
        colC_len: String(row[2] || "").length,
        colE: String(row[4] || ""),
        colG: String(row[6] || ""),
        chars_email: colBRaw.split('').map(function(c){return c.charCodeAt(0);}).join(',')
      });
    }
  }
  return { success: true, totalFilas: data.length - 1, encontradas: rows };
}
function verificarRol(email, rolRequerido) {
  if (!email) return false;
  var sheet = getSheet("Usuarios");
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var emailBus = norm_(email).toLowerCase();
  var rolReq = String(rolRequerido || "").trim().toLowerCase();
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    var hasId = (row[0] !== "" && row[0] !== null && row[0] !== undefined);
    var colOffset = 0;
    if (!hasId && norm_(row[0]).indexOf("@") !== -1 && norm_(row[1]).indexOf("@") === -1) {
      colOffset = -1;
    }
    var rowEmail = norm_(row[1 + colOffset]).toLowerCase();
    if (rowEmail !== emailBus) continue;
    var rowEstado = norm_(row[6 + colOffset]).toLowerCase();
    if (rowEstado === "inactivo") continue;
    var rowRol = norm_(row[4 + colOffset]).toLowerCase();
    return rowRol === rolReq;
  }
  return false;
}

/**
 * Ejecutar una vez desde el editor Apps Script tras problemas en filas tardías del login:
 * revisa formato de email/pass y omite Estado inactivo. No imprime secretos completos en log.
 */
function diagnosticarFilasLoginUsuarios() {
  var sheet = getSheet("Usuarios");
  if (!sheet) {
    Logger.log('Sin hoja Usuarios');
    return;
  }
  var data = sheet.getDataRange().getValues();
  var dispAll = sheet.getDataRange().getDisplayValues();
  Logger.log('Usuarios filas datos (aprox sin cabecera): ' + (data.length - 1));
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    var rowDisp = dispAll[i];
    var hasId = (row[0] !== "" && row[0] !== null && row[0] !== undefined);
    var colOffset = 0;
    if (!hasId && norm_(row[0]).indexOf("@") !== -1 && norm_(row[1]).indexOf("@") === -1) {
      colOffset = -1;
    }
    var mail = norm_(String(row[1 + colOffset] || ""));
    if (!mail) continue;
    var tipoC = "";
    var rawC = row[2 + colOffset];
    if (rawC instanceof Date) tipoC = 'Date';
    else if (typeof rawC === 'number') tipoC = 'number';
    else if (typeof rawC === 'string') tipoC = 'string';
    else if (rawC != null && rawC !== '') tipoC = typeof rawC;
    var marcaPass = '';
    var showC = String(rowDisp[2 + colOffset] || "");
    var passComparable = norm_(rawC instanceof Date ? showC : (rawC != null ? String(rawC) : ""));
    if (tipoC === 'Date') marcaPass = '¡COLUMNA C ES FECHA! Corregir a texto.';
    else if (tipoC === 'number') marcaPass = 'C es número; visible «' + showC + '»';

    Logger.log(
      'Fila ' + (i + 1) + ' · email_ok=' + (mail.indexOf('@') !== -1) +
      ' · pass_norm_len=' + passComparable.length +
      ' · tipoC_raw=' + tipoC +
      ' · estado=' + String(rowDisp[6 + colOffset] || '').trim() +
      ' · ' + marcaPass
    );
  }
}

// ── FASE 1: RADICACIÓN ───────────────────────────────────────
// Hoja Fase1 — columnas base 1–38 (A–AL) + extensión diplomado 39–49 (AM–AW):
// … AL(38)=DiasRestantes | AM(39)=Diplomado inicio | AN(40)=Diplomado fin
// AO–AQ jurado sugerido 1 | AR–AT jurado 2 | AU–AW jurado 3 (nombre, email, tel c/u)

/** Garantiza columnas para fechas diplomado, datos del jurado y resultado (nota/acta). */
function asegurarColumnasFase1DiplomadoJurados(sheet) {
  if (!sheet) return;
  var need = 55;
  if (sheet.getMaxColumns() < need) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), need - sheet.getMaxColumns());
  }
  var hdrs = [
    [39, "Diplomado inicio"],
    [40, "Diplomado fin"],
    [41, "Dip jurado1 nombre"],
    [42, "Dip jurado1 email"],
    [43, "Dip jurado1 tel"],
    [44, "Dip jurado2 nombre"],
    [45, "Dip jurado2 email"],
    [46, "Dip jurado2 tel"],
    [47, "Dip jurado3 nombre"],
    [48, "Dip jurado3 email"],
    [49, "Dip jurado3 tel"],
    [50, "Dip jurado1 especialidad"],
    [51, "Dip jurado1 acuerdo propuesta"],
    [52, "Dip jurado modo"],
    [53, "Dip nota"],
    [54, "Dip acta"],
    [55, "Dip fecha resultado"]
  ];
  for (var h = 0; h < hdrs.length; h++) {
    var col = hdrs[h][0];
    if (!String(sheet.getRange(1, col).getValue() || "").trim()) {
      sheet.getRange(1, col).setValue(hdrs[h][1]);
    }
  }
}

function juradosSugeridosDiplomadoDesdeFilaF1(r) {
  var out = [];
  if (!r || r.length < 43) return out;
  var modo = r.length >= 52 ? String(r[51] || "").trim().toLowerCase() : "";
  if (modo === "cttg_asigna") return out;
  for (var k = 0; k < 3; k++) {
    var base = 40 + k * 3;
    var nombre = String(r[base] || "").trim();
    var email = String(r[base + 1] || "").trim();
    var tel = String(r[base + 2] || "").trim();
    if (nombre || email || tel) {
      var slot = { nombre: nombre, email: email, telefono: tel };
      if (k === 0) {
        if (r.length > 49) slot.especialidad = String(r[49] || "").trim();
        if (r.length > 50) slot.aceptaPropuesta = String(r[50] || "").trim();
      }
      out.push(slot);
    }
  }
  return out;
}

function correoRadicacionPareceValido(em) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(em || "").trim());
}

function telefonoRadicacionLongitudOk(tel) {
  return String(tel || "").replace(/\s/g, "").length >= 7;
}

function enriquecerProtocolosConRadicacionDiplomado(protocolos) {
  var sheet = getSheet("Fase1");
  if (!sheet || !protocolos || !protocolos.length) return protocolos;
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    map[String(data[i][1] || "").trim()] = data[i];
  }
  for (var j = 0; j < protocolos.length; j++) {
    var p = protocolos[j];
    var row = map[String(p.numero || "").trim()];
    if (!row) continue;
    p.modalidadRadicacion = String(row[22] || "");
    p.esDiplomado = String(p.modalidadRadicacion || "").trim().toLowerCase() === "diplomado";
    p.diplomadoFechaInicio = formatearFecha(row[38] || "");
    p.diplomadoFechaFin = formatearFecha(row[39] || "");
    p.diplomadoJuradoModo = row.length >= 52 ? String(row[51] || "").trim() : "";
    p.juradosSugeridosDiplomado = juradosSugeridosDiplomadoDesdeFilaF1(row);
  }
  return protocolos;
}

function crearRadicacion(datos, emailEstudiante, sesion) {
  if (!sesion || sesion.rol !== "estudiante") {
    return { success: false, error: "No autorizado" };
  }
  if (String(emailEstudiante || "").trim().toLowerCase() !== String(sesion.email || "").trim().toLowerCase()) {
    return { success: false, error: "No autorizado" };
  }
  if (!datos) return { success: false, error: "Datos vacíos" };
  var modLower = String(datos.modalidad || "").trim().toLowerCase();
  var dipModoJur = "";
  if (modLower === "diplomado") {
    dipModoJur = String(datos.diplomadoJuradoModo || datos.dipJuradoModo || "").trim().toLowerCase();
    if (dipModoJur !== "tutor_sugiere" && dipModoJur !== "cttg_asigna") {
      return { success: false, error: "Diplomado: indique si el tutor sugirió un jurado o si el Comité Técnico de Trabajos de Grado debe asignar el evaluador." };
    }
    if (dipModoJur === "tutor_sugiere") {
      var djn = String(datos.dipJurado1Nombre || "").trim();
      var dje = String(datos.dipJurado1Email || "").trim();
      var djt = String(datos.dipJurado1Telefono || "").trim();
      var djesp = String(datos.dipJurado1Especialidad || "").trim();
      var djac = String(datos.dipJurado1AceptaPropuesta || "").trim();
      if (!djn || !dje || !djt || !djesp) {
        return { success: false, error: "Diplomado: complete todos los datos del jurado sugerido por el tutor (nombre, correo, teléfono y especialidad o área)." };
      }
      if (!correoRadicacionPareceValido(dje)) {
        return { success: false, error: "Diplomado: indique un correo electrónico válido para el jurado sugerido." };
      }
      if (!telefonoRadicacionLongitudOk(djt)) {
        return { success: false, error: "Diplomado: el teléfono del jurado debe tener al menos 7 dígitos." };
      }
      if (djac !== "Sí" && djac !== "No") {
        return { success: false, error: 'Diplomado: indique si el jurado está de acuerdo en evaluar ante su propuesta («Sí» o «No»).' };
      }
    }
  }
  var sheet  = getSheet("Fase1");
  if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
  asegurarColumnasFase1DiplomadoJurados(sheet);
  var numero = generarNumero("CTTG", "Fase1");
  var fecha  = hoy();
  var nuevoId = sheet.getLastRow();

  var dipIni = String(datos.diplomadoFechaInicio || "").trim();
  var dipFin = String(datos.diplomadoFechaFin || "").trim();
  var d1n = String(datos.dipJurado1Nombre || "").trim();
  var d1e = String(datos.dipJurado1Email || "").trim();
  var d1t = String(datos.dipJurado1Telefono || "").trim();
  var d2n = String(datos.dipJurado2Nombre || "").trim();
  var d2e = String(datos.dipJurado2Email || "").trim();
  var d2t = String(datos.dipJurado2Telefono || "").trim();
  var d3n = String(datos.dipJurado3Nombre || "").trim();
  var d3e = String(datos.dipJurado3Email || "").trim();
  var d3t = String(datos.dipJurado3Telefono || "").trim();
  var d1Esp = modLower === "diplomado" ? String(datos.dipJurado1Especialidad || "").trim() : "";
  var d1Ace = modLower === "diplomado" ? String(datos.dipJurado1AceptaPropuesta || "").trim() : "";
  var dipModoGuardar = modLower === "diplomado" ? dipModoJur : "";

  if (modLower === "diplomado" && dipModoJur === "cttg_asigna") {
    d1n = "";
    d1e = "";
    d1t = "";
    d1Esp = "";
    d1Ace = "";
  }

  sheet.appendRow([
    nuevoId,                    // 1  ID
    numero,                     // 2  Número Radicación
    emailEstudiante || "",      // 3  Email Estudiante
    datos.cedula1    || "",     // 4  Cédula 1
    datos.nombre1    || "",     // 5  Nombre 1
    datos.email1     || "",     // 6  Email 1
    datos.telefono1  || "",     // 7  Teléfono 1
    datos.semestre1  || "",     // 8  Semestre 1
    datos.semillero1 || "",     // 9  Semillero 1
    datos.cedula2    || "",     // 10 Cédula 2
    datos.nombre2    || "",     // 11 Nombre 2
    datos.email2     || "",     // 12 Email 2
    datos.telefono2  || "",     // 13 Teléfono 2
    datos.semestre2  || "",     // 14 Semestre 2
    datos.semillero2 || "",     // 15 Semillero 2
    datos.cedula3    || "",     // 16 Cédula 3
    datos.nombre3    || "",     // 17 Nombre 3
    datos.email3     || "",     // 18 Email 3
    datos.telefono3  || "",     // 19 Teléfono 3
    datos.semestre3  || "",     // 20 Semestre 3
    datos.semillero3 || "",     // 21 Semillero 3
    datos.titulo     || "",     // 22 Título
    datos.modalidad  || "",     // 23 Modalidad
    datos.area       || "",     // 24 Área
    datos.tutor1Nombre   || "", // 25 Tutor 1 Nombre
    datos.tutor1Email    || "", // 26 Tutor 1 Email
    datos.tutor1Telefono || "", // 27 Tutor 1 Teléfono
    datos.tutor1Relacion || "", // 28 Tutor 1 Relación
    datos.tutor2Nombre   || "", // 29 Tutor 2 Nombre
    datos.tutor2Email    || "", // 30 Tutor 2 Email
    datos.tutor2Telefono || "", // 31 Tutor 2 Teléfono
    datos.tutor2Relacion || "", // 32 Tutor 2 Relación
    "Radicado",                 // 33 Estado
    fecha,                      // 34 Fecha Radicación
    "",                         // 35 Fecha Aprobación
    datos.observaciones || "",  // 36 Notas
    "",                         // 37 Aprobado Por
    "",                         // 38 Días Restantes
    dipIni,                     // 39 Diplomado inicio
    dipFin,                     // 40 Diplomado fin
    d1n, d1e, d1t,              // 41–43 Jurado sugerido 1
    d2n, d2e, d2t,              // 44–46 Jurado 2
    d3n, d3e, d3t,              // 47–49 Jurado 3
    d1Esp,                      // 50 Especialidad jurado 1
    d1Ace,                      // 51 Acuerdo (Sí/No)
    dipModoGuardar              // 52 tutor_sugiere | cttg_asigna
  ]);

  // Notificar usando función centralizada
  var newRow = sheet.getLastRow();
  notificarCambioEstado(newRow, "Radicado", {});
  registrarAuditoria(emailEstudiante, "CREAR_RADICACION", numero);
  return { success: true, numero: numero };
}

function mapearFilaFase1(r, rowIndex) {
  return {
    rowIndex:        rowIndex,
    id:              String(r[0]  || ""),
    numero:          String(r[1]  || ""),
    emailEstudiante: String(r[2]  || ""),
    cedula1:         String(r[3]  || ""),
    nombre1:         String(r[4]  || ""),
    email1:          String(r[5]  || ""),
    telefono1:       String(r[6]  || ""),
    semestre1:       String(r[7]  || ""),
    semillero1:      String(r[8]  || ""),
    cedula2:         String(r[9]  || ""),
    nombre2:         String(r[10] || ""),
    email2:          String(r[11] || ""),
    telefono2:       String(r[12] || ""),
    semestre2:       String(r[13] || ""),
    semillero2:      String(r[14] || ""),
    cedula3:         String(r[15] || ""),
    nombre3:         String(r[16] || ""),
    email3:          String(r[17] || ""),
    telefono3:       String(r[18] || ""),
    semestre3:       String(r[19] || ""),
    semillero3:      String(r[20] || ""),
    titulo:          String(r[21] || ""),
    modalidad:       String(r[22] || ""),
    area:            String(r[23] || ""),
    tutor1Nombre:    String(r[24] || ""),
    tutor1Email:     String(r[25] || ""),
    tutor1Telefono:  String(r[26] || ""),
    tutor1Relacion:  String(r[27] || ""),
    tutor2Nombre:    String(r[28] || ""),
    tutor2Email:     String(r[29] || ""),
    tutor2Telefono:  String(r[30] || ""),
    tutor2Relacion:  String(r[31] || ""),
    estado:          String(r[32] || "Radicado"),
    fechaRadicacion: formatearFecha(r[33]),
    fechaAprobacion: formatearFecha(r[34]),
    notas:           String(r[35] || ""),
    aprobadoPor:     String(r[36] || ""),
    diasRestantes:   String(r[37] || ""),
    diplomadoFechaInicio: formatearFecha(r[38] || ""),
    diplomadoFechaFin:  formatearFecha(r[39] || ""),
    dipJurado1Nombre:    String(r[40] || ""),
    dipJurado1Email:     String(r[41] || ""),
    dipJurado1Telefono:  String(r[42] || ""),
    dipJurado2Nombre:    String(r[43] || ""),
    dipJurado2Email:     String(r[44] || ""),
    dipJurado2Telefono:  String(r[45] || ""),
    dipJurado3Nombre:    String(r[46] || ""),
    dipJurado3Email:     String(r[47] || ""),
    dipJurado3Telefono:  String(r[48] || ""),
    dipJurado1Especialidad:   String(r[49] || ""),
    dipJurado1AceptaPropuesta: String(r[50] || ""),
    diplomadoJuradoModo:      String(r[51] || ""),
    dipNota:              r.length > 52 ? String(r[52] || "") : "",
    dipActa:              r.length > 53 ? String(r[53] || "") : "",
    dipFechaResultado:    r.length > 54 ? formatearFecha(r[54] || "") : ""
  };
}

function obtenerFase1() {
  var sheet = getSheet("Fase1");
  if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
  var data = sheet.getDataRange().getValues();
  var radicaciones = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    radicaciones.push(mapearFilaFase1(data[i], i + 1));
  }
  return { success: true, radicaciones: radicaciones };
}

function obtenerFase1PorEmail(email, sesion) {
  if (!email) return { success: false, error: "Email requerido" };
  if (sesion && sesion.rol === "estudiante") {
    if (String(email).trim().toLowerCase() !== String(sesion.email).trim().toLowerCase()) {
      return { success: false, error: "No autorizado" };
    }
  }
  var sheet = getSheet("Fase1");
  if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
  var data = sheet.getDataRange().getValues();
  var radicaciones = [];
 var emailLower = email.trim().toLowerCase();

  var todasActas = listaActasAsesoriaCompleta();
  var todosProtocolos = listaProtocolosFase2Completa();
  var todasFase3 = listaFase3Completa();
  
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var emails = [
      String(data[i][2]  || "").toLowerCase(),
      String(data[i][5]  || "").toLowerCase(),
      String(data[i][11] || "").toLowerCase(),
      String(data[i][17] || "").toLowerCase()
    ];
    if (emails.indexOf(emailLower) !== -1) {
      var rad = mapearFilaFase1(data[i], i + 1);
      
      // ── PLAZO TOTAL ──
      var semestre = parseInt(data[i][7] || 0);
      var plazoTotal = calcularPlazoTotal(semestre);
      var fechaRad = data[i][33];
      var diasTranscurridos = calcularDiasHabilesTranscurridos(fechaRad, new Date());
      var diasRestantesTotales = Math.max(0, plazoTotal - diasTranscurridos);
      var vencidoTotal = diasRestantesTotales <= 0;
      
      rad.plazoTotal = plazoTotal;
      rad.diasTranscurridos = diasTranscurridos;
      rad.diasRestantesTotales = diasRestantesTotales;
      rad.vencidoTotal = vencidoTotal;
      rad.porcentajePlazo = plazoTotal > 0 ? Math.round((diasTranscurridos / plazoTotal) * 100) : 0;
      
      // ── FASE 1: Tutores (15 días hábiles) ──
      var diasParaAvaluarTutores = 15;
      var diasRestantesTutores = Math.max(0, diasParaAvaluarTutores - diasTranscurridos);
      var vencidoTutores = diasRestantesTutores <= 0 && (rad.estado === 'Radicado');
      rad.diasRestantesTutores = diasRestantesTutores;
      rad.vencidoTutores = vencidoTutores;
      
      // ── ACTAS (8 días hábiles desde que tutores avalados) ──
      var actas = todasActas;
      var actasEste = actas.filter(a => String(a.numero) === String(rad.numero));
      rad.actasTotal = actasEste.length;
      rad.actasAprobadas = actasEste.filter(a => a.estado === 'Aprobada').length;
      rad.actasPendientes = actasEste.filter(a => a.estado === 'Pendiente revisión').length;
      
      // Calcular plazo actas (8 días desde que tutores fueron avalados)
      var acta = actasEste[0];
      if (rad.estado !== 'Radicado' && acta) {
        var diasParaAprobarActas = 8;
        var diasDesdeAvalTutores = calcularDiasHabilesTranscurridos(
          acta.fechaCarga, 
          new Date()
        );
        var diasRestantesActas = Math.max(0, diasParaAprobarActas - diasDesdeAvalTutores);
        var vencidoActas = diasRestantesActas <= 0 && (rad.estado !== 'Fase 2 Desbloqueada');
        rad.diasRestantesActas = diasRestantesActas;
        rad.vencidoActas = vencidoActas;
      }
      
      // ── PROTOCOLO (8 días hábiles) ──
      var protocolos = todosProtocolos;
      var protocoloEste = protocolos.find(p => String(p.numero) === String(rad.numero));
      if (protocoloEste) {
        rad.protocoloEstado = protocoloEste.estado;
        rad.protocoloDiasRestantes = protocoloEste.diasRestantes;
        rad.protocoloVencido = protocoloEste.vencido;
        rad.protocoloEvaluador = protocoloEste.evaluador;
        rad.protocoloFechaComite = protocoloEste.fechaComite;
      }
      
      // ── SUSTENTACIÓN (15 días hábiles) ──
      var fase3 = todasFase3;
      var sust = fase3.find(s => String(s.numero) === String(rad.numero));
      if (sust) {
        rad.sustentacionEstado = sust.estado;
        // Calcular 15 días desde que documentos se carguen
        var diasParaSustentacion = 15;
        var diasRestantesSust = diasParaSustentacion; // Placeholder
        rad.diasRestantesSustentacion = diasRestantesSust;
      }
      
      radicaciones.push(rad);
    }
  }
  return { success: true, radicaciones: radicaciones };
}

/** ── Solicitudes de modificación de datos de radicación (Fase 1), con aval de coordinación ── */
var NOMBRE_HOJA_SOL_MOD_RAD = "Solicitudes_Mod_Radicacion";

function asegurarHojaSolModRad() {
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (sheet) return sheet;
  var ss = SpreadsheetApp.openById(SHEET_ID);
  sheet = ss.insertSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  sheet.appendRow([
    "TsCreacion",
    "EmailEstudiante",
    "RowFase1",
    "NumeroRad",
    "EstadoSolicitud",
    "Resultado",
    "JsonCambios",
    "MotivoEstudiante",
    "JsonDelta",
    "TsResolucion",
    "EmailCoord",
    "ObsCoord"
  ]);
  return sheet;
}

function emailEstudiantePerteneceFilaFase1(emailLower, dataRowJs) {
  var emails = [
    String(dataRowJs[2]  || "").toLowerCase(),
    String(dataRowJs[5]  || "").toLowerCase(),
    String(dataRowJs[11] || "").toLowerCase(),
    String(dataRowJs[17] || "").toLowerCase()
  ];
  return emails.indexOf(String(emailLower || "").trim().toLowerCase()) !== -1;
}

function obtenerMapColumnasModRad() {
  return {
    titulo: 22,
    modalidad: 23,
    area: 24,
    cedula2: 10,
    nombre2: 11,
    email2: 12,
    telefono2: 13,
    semestre2: 14,
    semillero2: 15,
    cedula3: 16,
    nombre3: 17,
    email3: 18,
    telefono3: 19,
    semestre3: 20,
    semillero3: 21,
    tutor1Nombre: 25,
    tutor1Email: 26,
    tutor1Telefono: 27,
    tutor1Relacion: 28,
    tutor2Nombre: 29,
    tutor2Email: 30,
    tutor2Telefono: 31,
    tutor2Relacion: 32,
    diplomadoFechaInicio: 39,
    diplomadoFechaFin: 40,
    dipJurado1Nombre: 41,
    dipJurado1Email: 42,
    dipJurado1Telefono: 43,
    dipJurado2Nombre: 44,
    dipJurado2Email: 45,
    dipJurado2Telefono: 46,
    dipJurado3Nombre: 47,
    dipJurado3Email: 48,
    dipJurado3Telefono: 49,
    dipJurado1Especialidad: 50,
    dipJurado1AceptaPropuesta: 51,
    diplomadoJuradoModo: 52
  };
}

function numeroRadCerroEtapaFinalFase3_(numeroRad) {
  var n = String(numeroRad || "").trim();
  if (!n) return false;
  var todos = listaFase3TodasLasFilasSinDedupe();
  for (var i = 0; i < todos.length; i++) {
    if (String(todos[i].numero || "").trim() !== n) continue;
    if (String(todos[i].nota || "").trim()) return true;
    var es = String(todos[i].estadoSolicitud || "").toLowerCase();
    if (es.indexOf("sustentado") !== -1 || es.indexOf("reprobado") !== -1) return true;
  }
  return false;
}

function haySolicitudModRadPendienteMismaFila_(sheetSol, rowF1) {
  var data = sheetSol.getDataRange().getValues();
  var rf = parseInt(rowF1, 10);
  for (var i = 1; i < data.length; i++) {
    if (parseInt(data[i][2], 10) !== rf) continue;
    var est = String(data[i][4] || "").trim().toLowerCase();
    if (est === "pendiente" || est === "pendiente_comite") return true;
  }
  return false;
}

function sanitizarYFiltrarCambiosModRad_(cambiosRaw, filaArr0) {
  var mapCols = obtenerMapColumnasModRad();
  var out = {};
  if (!cambiosRaw || typeof cambiosRaw !== "object") return out;
  var keys = Object.keys(cambiosRaw);
  for (var ki = 0; ki < keys.length; ki++) {
    var key = keys[ki];
    var colNum = mapCols[key];
    if (!colNum) continue;
    var v = cambiosRaw[key];
    var s = v === undefined || v === null ? "" : String(v).trim();
    var curCell = filaArr0[colNum - 1];
    var curStr = curCell === undefined || curCell === null ? "" : String(curCell).trim();
    var sFmt = key.indexOf("diplomadoFecha") === 0 ? formatearFecha(s) : s;
    var curFmt = key.indexOf("diplomadoFecha") === 0 ? formatearFecha(curCell) : curStr;
    if (sFmt === curFmt) continue;
    out[key] = sFmt || s;
  }
  return out;
}

function validarReglasDiplomadoModRad_(filaArr0, deltas) {
  var modActual = String(filaArr0[22] || "").trim().toLowerCase();
  var modNuevo = deltas.modalidad !== undefined ? String(deltas.modalidad || "").trim().toLowerCase() : modActual;
  if (modNuevo !== "diplomado") return { ok: true };
  var dipModo = String(deltas.diplomadoJuradoModo !== undefined ? deltas.diplomadoJuradoModo : (filaArr0[51] || "")).trim().toLowerCase();
  if (dipModo !== "tutor_sugiere" && dipModo !== "cttg_asigna") {
    return { ok: false, error: "Diplomado: indique tutor_sugiere o cttg_asigna en diplomadoJuradoModo." };
  }
  var ini = deltas.diplomadoFechaInicio !== undefined ? String(formatearFecha(deltas.diplomadoFechaInicio) || "").trim() : formatearFecha(filaArr0[38] || "");
  var fin = deltas.diplomadoFechaFin !== undefined ? String(formatearFecha(deltas.diplomadoFechaFin) || "").trim() : formatearFecha(filaArr0[39] || "");
  if (!ini || !fin) {
    return { ok: false, error: "Diplomado: indique fecha inicio y fin del diplomado." };
  }
  if (dipModo === "tutor_sugiere") {
    var jn = String(deltas.dipJurado1Nombre !== undefined ? deltas.dipJurado1Nombre : (filaArr0[40] || "")).trim();
    var je = String(deltas.dipJurado1Email !== undefined ? deltas.dipJurado1Email : (filaArr0[41] || "")).trim();
    var jt = String(deltas.dipJurado1Telefono !== undefined ? deltas.dipJurado1Telefono : (filaArr0[42] || "")).trim();
    var jesp = String(deltas.dipJurado1Especialidad !== undefined ? deltas.dipJurado1Especialidad : (filaArr0[49] || "")).trim();
    var jac = String(deltas.dipJurado1AceptaPropuesta !== undefined ? deltas.dipJurado1AceptaPropuesta : (filaArr0[50] || "")).trim();
    if (!jn || !je || !jesp || !telefonoRadicacionLongitudOk(jt)) {
      return { ok: false, error: "Diplomado (tutor sugiere): complete jurado sugerido: nombre, email, teléfono (≥7 dígitos), especialidad y Si/No de aceptación." };
    }
    if (!correoRadicacionPareceValido(je)) return { ok: false, error: "Diplomado: email del jurado sugerido no válido." };
    if (jac !== "Sí" && jac !== "No") return { ok: false, error: "Diplomado: ¿El jurado acepta propuesta? Debe ser «Sí» o «No»." };
  }
  return { ok: true };
}

function aplicarDeltasAFase1_(sheetF1, rowIndex1, deltas) {
  var mapCols = obtenerMapColumnasModRad();
  var keys = Object.keys(deltas);
  var antes = {};
  var despues = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var col = mapCols[k];
    if (!col) continue;
    var nueva = deltas[k];
    var prev = sheetF1.getRange(rowIndex1, col).getValue();
    antes[k] = prev === undefined || prev === null ? "" : String(prev);
    sheetF1.getRange(rowIndex1, col).setValue(nueva);
    despues[k] = nueva === undefined || nueva === null ? "" : String(nueva);
  }
  return { antes: antes, despues: despues };
}

function filaSolModRadToObj_(r, sheetRowIdx) {
  var cambiosStr = String(r[6] || "{}");
  var deltaStr = String(r[8] || "{}");
  var cambios = {};
  var delta = {};
  try { cambios = JSON.parse(cambiosStr); } catch(e1) { cambios = {}; }
  try { delta = JSON.parse(deltaStr); } catch(e2) { delta = {}; }
  return {
    rowSol: sheetRowIdx,
    tsCreacion: String(r[0] || ""),
    emailEstudiante: String(r[1] || ""),
    rowFase1: parseInt(r[2], 10),
    numero: String(r[3] || ""),
    estado: String(r[4] || ""),
    resultado: String(r[5] || ""),
    cambios: cambios,
    motivoEstudiante: String(r[7] || ""),
    deltaResolucion: delta,
    tsResolucion: String(r[9] || ""),
    emailCoord: String(r[10] || ""),
    obsCoord: String(r[11] || "")
  };
}

function crearSolicitudModificarRad(sesion, body) {
  if (!sesion || sesion.rol !== "estudiante") return { success: false, error: "Solo estudiantes pueden crear esta solicitud." };
  var emailEst = String(sesion.email || "").trim().toLowerCase();
  var sheetF1 = getSheet("Fase1");
  if (!sheetF1) return { success: false, error: "Hoja Fase1 no encontrada" };
  var ri = parseInt(body && body.rowIndexFase1, 10);
  if (!ri || ri < 2) return { success: false, error: "Fila Fase 1 inválida." };
  var lastF1 = sheetF1.getLastRow();
  if (ri > lastF1) return { success: false, error: "Fila Fase 1 fuera de rango." };
  var rowVals = sheetF1.getRange(ri, 1, ri, Math.max(sheetF1.getLastColumn(), 52)).getValues()[0];
  if (!emailEstudiantePerteneceFilaFase1(emailEst, rowVals)) return { success: false, error: "No autorizado sobre esta radicación." };
  var numero = String(rowVals[1] || "").trim();
  if (!numero) return { success: false, error: "Sin número de radicación." };
  var estadoF1 = String(rowVals[32] || "").trim();
  var elow = estadoF1.toLowerCase();
  if (elow.indexOf("sustentado") !== -1 || elow.indexOf("reprobado") !== -1) {
    return { success: false, error: "No se permite modificar una radicación ya cerrada con resultado final." };
  }
  if (numeroRadCerroEtapaFinalFase3_(numero)) return { success: false, error: "El trámite de sustentación ya tiene resultado final." };
  var motivo = body && body.motivoEstudiante !== undefined ? String(body.motivoEstudiante || "").trim() : "";
  if (motivo.length < 12) return { success: false, error: "Describa el motivo de los cambios (mínimo 12 caracteres)." };
  var deltas = sanitizarYFiltrarCambiosModRad_(body && body.cambios ? body.cambios : {}, rowVals);
  if (!Object.keys(deltas).length) return { success: false, error: "No hay cambios respecto a los datos actuales." };
  var valDip = validarReglasDiplomadoModRad_(rowVals, deltas);
  if (!valDip.ok) return { success: false, error: valDip.error };

  var sheetSol = asegurarHojaSolModRad();
  if (haySolicitudModRadPendienteMismaFila_(sheetSol, ri)) {
    return { success: false, error: "Ya tienes una solicitud de cambios pendiente para esta radicación." };
  }
  var sheetCancel = getSheet("Solicitudes_Cancelacion_Rad");
  if (sheetCancel && haySolCancelPendienteMismaFila_(sheetCancel, ri)) {
    return { success: false, error: "Tienes una solicitud de cancelación pendiente para esta radicación. Espera la respuesta de la coordinación." };
  }
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheetSol.appendRow([
    ts,
    emailEst,
    ri,
    numero,
    "pendiente",
    "",
    JSON.stringify(deltas),
    motivo,
    "",
    "",
    "",
    ""
  ]);
  var detAudit = numero + " | fila " + ri + " | cambios:" + JSON.stringify(deltas).slice(0, 320);
  registrarAuditoria(emailEst, "SOLICITUD_MOD_RAD_CREAR", detAudit);
  return { success: true, numero: numero, rowSol: sheetSol.getLastRow() };
}

function getMisSolicitudesModRad(sesion) {
  if (!sesion || sesion.rol !== "estudiante") return { success: false, error: "No autorizado" };
  var em = String(sesion.email || "").trim().toLowerCase();
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (!sheet) return { success: true, solicitudes: [] };
  var data = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1] || "").trim().toLowerCase() !== em) continue;
    lista.push(filaSolModRadToObj_(data[i], i + 1));
  }
  return { success: true, solicitudes: lista };
}

function getSolicitudesModRadPendientes(sesion) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (!sheet) return { success: true, solicitudes: [], totalPendientes: 0 };
  var data = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var est = String(data[i][4] || "").trim().toLowerCase();
    if (est !== "pendiente") continue;
    lista.push(filaSolModRadToObj_(data[i], i + 1));
  }
  return { success: true, solicitudes: lista, totalPendientes: lista.length };
}

function resolverSolicitudModRad(sesion, body) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (!sheet) return { success: false, error: "Hoja solicitudes no disponible." };
  var rs = parseInt(body && body.rowSol, 10);
  var decision = String(body && body.decision || "").trim().toLowerCase();
  var obsCoord = body && body.observacionesCoord !== undefined ? String(body.observacionesCoord || "").trim() : "";
  if (!rs || rs < 2) return { success: false, error: "Fila de solicitud inválida." };
  var last = sheet.getLastRow();
  if (rs > last) return { success: false, error: "Solicitud no encontrada." };

  var r = sheet.getRange(rs, 1, rs, 12).getValues()[0];
  var estSol = String(r[4] || "").trim().toLowerCase();
  if (estSol !== "pendiente") return { success: false, error: "Esta solicitud ya fue resuelta." };
  var emailCoord = String(sesion.email || "").trim();

  var rowF1 = parseInt(r[2], 10);
  var numero = String(r[3] || "").trim();
  var cambiosJson = String(r[6] || "{}");
  var deltas = {};
  try { deltas = JSON.parse(cambiosJson); } catch (ex) {
    return { success: false, error: "JSON de cambios inválido." };
  }

  if (decision === "devolver") {
    if (obsCoord.length < 12) return { success: false, error: "Indique el motivo de devolución (mín. 12 caracteres)." };
    var tsDv = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rs, 5).setValue("resuelta");
    sheet.getRange(rs, 6).setValue("devolver");
    sheet.getRange(rs, 9).setValue("{}");
    sheet.getRange(rs, 10).setValue(tsDv);
    sheet.getRange(rs, 11).setValue(emailCoord);
    sheet.getRange(rs, 12).setValue(obsCoord);
    registrarAuditoria(emailCoord, "RESOLVER_SOL_MOD_DEVOLVER", numero + " | sol fila " + rs + " | " + obsCoord.slice(0, 200));
    registrarHistorial(numero, "FASE1", "SOL_MOD_DEVOLVER", "", "Devuelta", emailCoord, obsCoord, "Sol. fila " + rs);
    try {
      var sf1Dv = getSheet("Fase1");
      var emailEs = sf1Dv ? String(sf1Dv.getRange(rowF1, 3).getValue() || "").trim() : "";
      var subjDv = "[CTTG] Devolución de solicitud de cambios · " + numero;
      var bodyDv = "La coordinación devolvió su solicitud de modificación de datos de la radicación " + numero + ".\n\nMotivo:\n" + obsCoord + "\n\nRevise los datos indicados en el Portal y puede enviar una nueva solicitud si corresponde.";
      if (emailEs) MailApp.sendEmail(emailEs, subjDv, bodyDv);
    } catch(eM) {}
    return { success: true, resultado: "devolver" };
  }

  if (decision !== "aprobar_directo" && decision !== "derivar_ct") {
    return { success: false, error: "Decisión inválida. Use «devolver», «aprobar_directo» o «derivar_ct»." };
  }

  // Para derivar a comité: solo se cambia el estado de la solicitud; NO se aplican cambios todavía.
  if (decision === "derivar_ct") {
    var tsDer = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rs, 5).setValue("pendiente_comite");
    sheet.getRange(rs, 6).setValue("derivar_ct");
    sheet.getRange(rs, 10).setValue(tsDer);
    sheet.getRange(rs, 11).setValue(emailCoord);
    sheet.getRange(rs, 12).setValue(obsCoord);
    registrarAuditoria(emailCoord, "RESOLVER_SOL_MOD_DER_CT", numero + " | sol fila " + rs + " | derivada a comité");
    registrarHistorial(numero, "FASE1", "SOL_MOD_DERIVAR_CT", "", "Pendiente comité", emailCoord, obsCoord, "Sol. fila " + rs);
    try {
      var sheetF1Der = getSheet("Fase1");
      var emailEstDer = sheetF1Der ? String(sheetF1Der.getRange(rowF1, 3).getValue() || "").trim() : "";
      if (emailEstDer) MailApp.sendEmail(emailEstDer, "[CTTG] Solicitud de cambios en revisión por comité · " + numero,
        "Su solicitud de modificación de la radicación " + numero + " fue recibida por la coordinación y derivada al Comité Técnico para su evaluación.\n\n" +
        (obsCoord ? "Nota coordinación:\n" + obsCoord + "\n\n" : "") +
        "Recibirá un correo con la decisión del comité una vez sea resuelta.");
    } catch(eDer) {}
    return { success: true, resultado: "derivar_ct" };
  }

  // Aprobar directo: aplicar cambios inmediatamente.
  var sheetF1 = getSheet("Fase1");
  if (!sheetF1) return { success: false, error: "Fase 1 no encontrada" };
  asegurarColumnasFase1DiplomadoJurados(sheetF1);
  var rowVals = sheetF1.getRange(rowF1, 1, rowF1, Math.max(sheetF1.getLastColumn(), 52)).getValues()[0];
  var deltasFinales = sanitizarYFiltrarCambiosModRad_(deltas, rowVals);
  if (!Object.keys(deltasFinales).length) {
    return { success: false, error: "Los datos ya coinciden con la hoja (nada que aplicar). Devuelva la solicitud con una nota aclaratoria si es necesario." };
  }
  var valDip2 = validarReglasDiplomadoModRad_(rowVals, deltasFinales);
  if (!valDip2.ok) return { success: false, error: valDip2.error };

  if (deltasFinales.diplomadoJuradoModo === "cttg_asigna") {
    deltasFinales.dipJurado1Nombre = "";
    deltasFinales.dipJurado1Email = "";
    deltasFinales.dipJurado1Telefono = "";
    deltasFinales.dipJurado1Especialidad = "";
    deltasFinales.dipJurado1AceptaPropuesta = "";
  }

  var applied = aplicarDeltasAFase1_(sheetF1, rowF1, deltasFinales);
  var tsOk = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var deltaPayload = { antes: applied.antes || {}, despues: applied.despues || {}, decision: decision, observacionesCoord: obsCoord };
  var deltaStrRes = JSON.stringify(deltaPayload);

  sheet.getRange(rs, 5).setValue("resuelta");
  sheet.getRange(rs, 6).setValue("aprobado_directo");
  sheet.getRange(rs, 9).setValue(deltaStrRes.length <= 48000 ? deltaStrRes : deltaStrRes.substring(0, 48000));
  sheet.getRange(rs, 10).setValue(tsOk);
  sheet.getRange(rs, 11).setValue(emailCoord);
  sheet.getRange(rs, 12).setValue(obsCoord);

  registrarAuditoria(emailCoord, "RESOLVER_SOL_MOD_APROBAR", numero + " | F1 row " + rowF1 + " | Δ " + JSON.stringify(applied.despues || {}).slice(0, 400));
  registrarHistorial(numero, "FASE1", "SOL_MOD_APROBAR_DIRECTO", JSON.stringify(applied.antes || {}).slice(0, 300), JSON.stringify(applied.despues || {}).slice(0, 300), emailCoord, obsCoord, "Sol. fila " + rs);

  try {
    var emailEst2 = String(sheetF1.getRange(rowF1, 3).getValue() || "").trim();
    var estadoAnterior = String(rowVals[32] || "").trim();
    var subjOk = "[CTTG] Cambios aprobados en radicación · " + numero;
    var bodyOk = numero + "\n\nSe aplicaron los cambios solicitados en su radicación. El estado administrativo («" + estadoAnterior + "») no fue modificado por este trámite." + (obsCoord ? "\n\nNota coordinación:\n" + obsCoord : "");
    if (emailEst2) MailApp.sendEmail(emailEst2, subjOk, bodyOk);
  } catch(eM2) {}

  return { success: true, resultado: "aprobado_directo" };
}

function getSolicitudesModRadComite(sesion) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (!sheet) return { success: true, solicitudes: [], total: 0 };
  var data = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var est = String(data[i][4] || "").trim().toLowerCase();
    if (est !== "pendiente_comite") continue;
    lista.push(filaSolModRadToObj_(data[i], i + 1));
  }
  return { success: true, solicitudes: lista, total: lista.length };
}

function resolverSolicitudModRadComite(sesion, body) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_MOD_RAD);
  if (!sheet) return { success: false, error: "Hoja solicitudes no disponible." };
  var rs = parseInt(body && body.rowSol, 10);
  var decision = String(body && body.decision || "").trim().toLowerCase();
  var obsComite = body && body.observacionesComite !== undefined ? String(body.observacionesComite || "").trim() : "";
  if (!rs || rs < 2) return { success: false, error: "Fila de solicitud inválida." };
  if (rs > sheet.getLastRow()) return { success: false, error: "Solicitud no encontrada." };

  var r = sheet.getRange(rs, 1, rs, 12).getValues()[0];
  if (String(r[4] || "").trim().toLowerCase() !== "pendiente_comite") return { success: false, error: "Esta solicitud no está en estado pendiente de comité." };

  var emailCoord = String(sesion.email || "").trim();
  var rowF1 = parseInt(r[2], 10);
  var numero = String(r[3] || "").trim();
  var deltas = {};
  try { deltas = JSON.parse(String(r[6] || "{}")); } catch(ex) { return { success: false, error: "JSON de cambios inválido." }; }

  if (decision === "rechazar") {
    if (obsComite.length < 12) return { success: false, error: "Indique el motivo del rechazo (mín. 12 caracteres)." };
    var tsRech = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rs, 5).setValue("resuelta");
    sheet.getRange(rs, 6).setValue("rechazado_comite");
    sheet.getRange(rs, 10).setValue(tsRech);
    sheet.getRange(rs, 11).setValue(emailCoord);
    sheet.getRange(rs, 12).setValue(obsComite);
    registrarAuditoria(emailCoord, "COMITE_SOL_MOD_RECHAZAR", numero + " | sol fila " + rs + " | " + obsComite.slice(0, 200));
    registrarHistorial(numero, "FASE1", "SOL_MOD_COMITE_RECHAZAR", "", "Rechazada por comité", emailCoord, obsComite, "Sol. fila " + rs);
    try {
      var sheetF1R = getSheet("Fase1");
      var emailEstR = sheetF1R ? String(sheetF1R.getRange(rowF1, 3).getValue() || "").trim() : "";
      if (emailEstR) MailApp.sendEmail(emailEstR, "[CTTG] Solicitud de cambios rechazada por comité · " + numero,
        "El Comité Técnico revisó su solicitud de modificación de la radicación " + numero + " y decidió NO aprobar los cambios solicitados.\n\nMotivo:\n" + obsComite + "\n\nPuede contactar a la coordinación para más información.");
    } catch(eR) {}
    return { success: true, resultado: "rechazado_comite" };
  }

  if (decision !== "aprobar") return { success: false, error: "Decisión inválida. Use «aprobar» o «rechazar»." };

  var sheetF1 = getSheet("Fase1");
  if (!sheetF1) return { success: false, error: "Fase 1 no encontrada" };
  asegurarColumnasFase1DiplomadoJurados(sheetF1);
  var rowVals = sheetF1.getRange(rowF1, 1, rowF1, Math.max(sheetF1.getLastColumn(), 52)).getValues()[0];
  var deltasFinales = sanitizarYFiltrarCambiosModRad_(deltas, rowVals);
  if (!Object.keys(deltasFinales).length) {
    return { success: false, error: "Los datos ya coinciden con la hoja. Rechace la solicitud con una nota aclaratoria." };
  }
  var valDip = validarReglasDiplomadoModRad_(rowVals, deltasFinales);
  if (!valDip.ok) return { success: false, error: valDip.error };

  if (deltasFinales.diplomadoJuradoModo === "cttg_asigna") {
    deltasFinales.dipJurado1Nombre = "";
    deltasFinales.dipJurado1Email = "";
    deltasFinales.dipJurado1Telefono = "";
    deltasFinales.dipJurado1Especialidad = "";
    deltasFinales.dipJurado1AceptaPropuesta = "";
  }

  var applied = aplicarDeltasAFase1_(sheetF1, rowF1, deltasFinales);
  var tsApr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var deltaPayload = { antes: applied.antes || {}, despues: applied.despues || {}, decision: "aprobado_comite", observacionesComite: obsComite };
  var deltaStrRes = JSON.stringify(deltaPayload);

  sheet.getRange(rs, 5).setValue("resuelta");
  sheet.getRange(rs, 6).setValue("aprobado_comite");
  sheet.getRange(rs, 9).setValue(deltaStrRes.length <= 48000 ? deltaStrRes : deltaStrRes.substring(0, 48000));
  sheet.getRange(rs, 10).setValue(tsApr);
  sheet.getRange(rs, 11).setValue(emailCoord);
  sheet.getRange(rs, 12).setValue(obsComite);

  registrarAuditoria(emailCoord, "COMITE_SOL_MOD_APROBAR", numero + " | F1 row " + rowF1 + " | Δ " + JSON.stringify(applied.despues || {}).slice(0, 400));
  registrarHistorial(numero, "FASE1", "SOL_MOD_COMITE_APROBAR", JSON.stringify(applied.antes || {}).slice(0, 300), JSON.stringify(applied.despues || {}).slice(0, 300), emailCoord, obsComite, "Sol. fila " + rs);

  try {
    var emailEst3 = String(sheetF1.getRange(rowF1, 3).getValue() || "").trim();
    if (emailEst3) MailApp.sendEmail(emailEst3, "[CTTG] Cambios aprobados por Comité Técnico · " + numero,
      "El Comité Técnico aprobó los cambios solicitados en su radicación " + numero + " y fueron aplicados.\n" + (obsComite ? "\nNota comité:\n" + obsComite : ""));
  } catch(eA) {}

  return { success: true, resultado: "aprobado_comite" };
}

// ── CANCELACIÓN DE RADICACIÓN ─────────────────────────────────

var NOMBRE_HOJA_SOL_CANCEL_RAD = "Solicitudes_Cancelacion_Rad";

function asegurarHojaSolCancelRad() {
  var sheet = getSheet(NOMBRE_HOJA_SOL_CANCEL_RAD);
  if (sheet) return sheet;
  var ss = SpreadsheetApp.openById(SHEET_ID);
  sheet = ss.insertSheet(NOMBRE_HOJA_SOL_CANCEL_RAD);
  sheet.appendRow([
    "TsCreacion",
    "EmailEstudiante",
    "RowFase1",
    "NumeroRad",
    "EstadoSolicitud",
    "Resultado",
    "MotivoEstudiante",
    "TsResolucion",
    "EmailCoord",
    "ObsCoord"
  ]);
  return sheet;
}

function filaSolCancelRadToObj_(r, rowSol) {
  return {
    rowSol:          rowSol,
    tsCreacion:      String(r[0] || ""),
    emailEstudiante: String(r[1] || ""),
    rowFase1:        parseInt(r[2], 10) || 0,
    numero:          String(r[3] || ""),
    estadoSolicitud: String(r[4] || ""),
    resultado:       String(r[5] || ""),
    motivoEstudiante: String(r[6] || ""),
    tsResolucion:    String(r[7] || ""),
    emailCoord:      String(r[8] || ""),
    obsCoord:        String(r[9] || "")
  };
}

function haySolCancelPendienteMismaFila_(sheet, rowFase1) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (parseInt(data[i][2], 10) === rowFase1 && String(data[i][4] || "").trim().toLowerCase() === "pendiente") {
      return true;
    }
  }
  return false;
}

function crearSolicitudCancelarRad(sesion, body) {
  if (!sesion || sesion.rol !== "estudiante") return { success: false, error: "Solo estudiantes pueden crear esta solicitud." };
  var emailEst = String(sesion.email || "").trim().toLowerCase();
  var sheetF1 = getSheet("Fase1");
  if (!sheetF1) return { success: false, error: "Hoja Fase1 no encontrada" };
  var ri = parseInt(body && body.rowIndexFase1, 10);
  if (!ri || ri < 2) return { success: false, error: "Fila Fase 1 inválida." };
  if (ri > sheetF1.getLastRow()) return { success: false, error: "Fila Fase 1 fuera de rango." };
  var rowVals = sheetF1.getRange(ri, 1, 1, Math.max(sheetF1.getLastColumn(), 52)).getValues()[0];
  if (!emailEstudiantePerteneceFilaFase1(emailEst, rowVals)) return { success: false, error: "No autorizado sobre esta radicación." };
  var numero = String(rowVals[1] || "").trim();
  if (!numero) return { success: false, error: "Sin número de radicación." };
  var estadoF1 = String(rowVals[32] || "").trim().toLowerCase();
  if (estadoF1 === "sustentado" || estadoF1 === "reprobado") {
    return { success: false, error: "No se puede cancelar una radicación con resultado final (Sustentado/Reprobado)." };
  }
  if (estadoF1 === "cancelado") {
    return { success: false, error: "Esta radicación ya está cancelada." };
  }
  if (numeroRadCerroEtapaFinalFase3_(numero)) return { success: false, error: "El trámite de sustentación ya tiene resultado final." };
  var motivo = body && body.motivoEstudiante !== undefined ? String(body.motivoEstudiante || "").trim() : "";
  if (motivo.length < 12) return { success: false, error: "Describa el motivo de la cancelación (mínimo 12 caracteres)." };
  var sheetSol = asegurarHojaSolCancelRad();
  if (haySolCancelPendienteMismaFila_(sheetSol, ri)) {
    return { success: false, error: "Ya tienes una solicitud de cancelación pendiente para esta radicación." };
  }
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheetSol.appendRow([ts, emailEst, ri, numero, "pendiente", "", motivo, "", "", ""]);
  registrarAuditoria(emailEst, "SOLICITUD_CANCEL_RAD_CREAR", numero + " | fila " + ri);
  return { success: true, numero: numero, rowSol: sheetSol.getLastRow() };
}

function getMisSolicitudesCancelarRad(sesion) {
  if (!sesion || sesion.rol !== "estudiante") return { success: false, error: "No autorizado" };
  var em = String(sesion.email || "").trim().toLowerCase();
  var sheet = getSheet(NOMBRE_HOJA_SOL_CANCEL_RAD);
  if (!sheet) return { success: true, solicitudes: [] };
  var data = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1] || "").trim().toLowerCase() !== em) continue;
    lista.push(filaSolCancelRadToObj_(data[i], i + 1));
  }
  return { success: true, solicitudes: lista };
}

function getSolicitudesCancelarRadPendientes(sesion) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_CANCEL_RAD);
  if (!sheet) return { success: true, solicitudes: [], totalPendientes: 0 };
  var data = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][4] || "").trim().toLowerCase() !== "pendiente") continue;
    lista.push(filaSolCancelRadToObj_(data[i], i + 1));
  }
  return { success: true, solicitudes: lista, totalPendientes: lista.length };
}

function resolverSolicitudCancelarRad(sesion, body) {
  if (!sesionEsCoordinadoraOAsistente(sesion)) return { success: false, error: "No autorizado" };
  var sheet = getSheet(NOMBRE_HOJA_SOL_CANCEL_RAD);
  if (!sheet) return { success: false, error: "Hoja de solicitudes no disponible." };
  var rs = parseInt(body && body.rowSol, 10);
  var decision = String(body && body.decision || "").trim().toLowerCase();
  var obsCoord = body && body.observacionesCoord !== undefined ? String(body.observacionesCoord || "").trim() : "";
  if (!rs || rs < 2) return { success: false, error: "Fila de solicitud inválida." };
  if (rs > sheet.getLastRow()) return { success: false, error: "Solicitud no encontrada." };
  var r = sheet.getRange(rs, 1, 1, 10).getValues()[0];
  if (String(r[4] || "").trim().toLowerCase() !== "pendiente") return { success: false, error: "Esta solicitud ya fue resuelta." };
  var emailCoord = String(sesion.email || "").trim();
  var rowF1 = parseInt(r[2], 10);
  var numero = String(r[3] || "").trim();
  var emailEst = String(r[1] || "").trim();
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  if (decision === "rechazar") {
    if (obsCoord.length < 12) return { success: false, error: "Indique el motivo del rechazo (mín. 12 caracteres)." };
    sheet.getRange(rs, 5).setValue("resuelta");
    sheet.getRange(rs, 6).setValue("rechazada");
    sheet.getRange(rs, 8).setValue(ts);
    sheet.getRange(rs, 9).setValue(emailCoord);
    sheet.getRange(rs, 10).setValue(obsCoord);
    registrarAuditoria(emailCoord, "RESOLVER_SOL_CANCEL_RECHAZAR", numero + " | " + obsCoord.slice(0, 200));
    registrarHistorial(numero, "FASE1", "SOL_CANCEL_RECHAZAR", "", "Rechazada", emailCoord, obsCoord, "Sol. fila " + rs);
    try {
      var subj = "[CTTG] Solicitud de cancelación rechazada · " + numero;
      var bodyEmail = "La coordinación rechazó su solicitud de cancelación de la radicación " + numero + ".\n\nMotivo:\n" + obsCoord + "\n\nSu radicación continúa activa. Si tiene dudas, comuníquese con la coordinación.";
      if (emailEst) MailApp.sendEmail(emailEst, subj, bodyEmail);
    } catch(eM) {}
    return { success: true, resultado: "rechazada" };
  }

  if (decision === "aprobar") {
    var sheetF1 = getSheet("Fase1");
    if (!sheetF1 || rowF1 < 2 || rowF1 > sheetF1.getLastRow()) {
      return { success: false, error: "Fila de radicación inválida." };
    }
    var estadoActual = String(sheetF1.getRange(rowF1, 33).getValue() || "").trim();
    if (estadoActual.toLowerCase() === "cancelado") {
      return { success: false, error: "La radicación ya estaba cancelada." };
    }
    sheetF1.getRange(rowF1, 33).setValue("Cancelado");
    sheetF1.getRange(rowF1, 36).setValue(obsCoord ? "[Cancelado] " + obsCoord : "[Cancelado por coordinación]");
    sheet.getRange(rs, 5).setValue("resuelta");
    sheet.getRange(rs, 6).setValue("aprobada");
    sheet.getRange(rs, 8).setValue(ts);
    sheet.getRange(rs, 9).setValue(emailCoord);
    sheet.getRange(rs, 10).setValue(obsCoord);
    registrarAuditoria(emailCoord, "RESOLVER_SOL_CANCEL_APROBAR", numero + " | fila " + rowF1);
    registrarHistorial(numero, "FASE1", "SOL_CANCEL_APROBAR", estadoActual, "Cancelado", emailCoord, obsCoord, "Sol. fila " + rs);
    try {
      var subj2 = "[CTTG] Cancelación aprobada · " + numero;
      var bodyEmail2 = "La coordinación aprobó la cancelación de su radicación " + numero + ".\n\n" +
        (obsCoord ? "Nota de coordinación:\n" + obsCoord + "\n\n" : "") +
        "Ya puede crear una nueva radicación ingresando al Portal.";
      if (emailEst) MailApp.sendEmail(emailEst, subj2, bodyEmail2);
    } catch(eM) {}
    return { success: true, resultado: "aprobada" };
  }

  return { success: false, error: "Decisión no válida. Use 'aprobar' o 'rechazar'." };
}

function actualizarEstado(rowIndex, estado, notas, emailCoord) {
  var sheet = getSheet("Fase1");
  var ri    = parseInt(rowIndex);
  var numeroRad = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var estadoAnteriorF1 = String(sheet.getRange(ri, 33).getValue() || "");
  sheet.getRange(ri, 33).setValue(estado || "");
  if (notas) sheet.getRange(ri, 36).setValue(notas);

  var semestre     = parseInt(sheet.getRange(ri, 8).getValue()) || 1;
  var diasVigencia = semestre >= 11 ? 180 : 365;
  var fechaRad     = sheet.getRange(ri, 34).getValue();
  if (fechaRad) {
    var fR    = new Date(fechaRad);
    var fVenc = new Date(fR.getTime());
    fVenc.setDate(fVenc.getDate() + diasVigencia);
    var diff  = Math.ceil((fVenc - new Date()) / 86400000);
    sheet.getRange(ri, 38).setValue(diff > 0 ? diff : 0);
  }
  if (estado === "Aprobado") {
    sheet.getRange(ri, 35).setValue(hoy());
    sheet.getRange(ri, 37).setValue(emailCoord || "");
  }

 
 notificarCambioEstado(ri, estado, { notas: notas });
  registrarAuditoria(emailCoord, "ACTUALIZAR_ESTADO", numeroRad + " | Fila " + rowIndex + " → " + estado);
  registrarHistorial(numeroRad, "FASE1", "ACTUALIZAR_ESTADO", estadoAnteriorF1, estado || "", emailCoord || "", notas || "", "Fila " + rowIndex);
  try { verificarVencimientosYAlertar(ri); } catch(e) { Logger.log("Error alertas: " + e); }
  return { success: true };
}

function verificarVencimientosYAlertar(rowIndex) {
  var sheet = getSheet("Fase1");
  var ri = parseInt(rowIndex);
  var numero = String(sheet.getRange(ri, 2).getValue());
  var emailEst = String(sheet.getRange(ri, 3).getValue());
  var estado = String(sheet.getRange(ri, 33).getValue());
  var semestre = parseInt(sheet.getRange(ri, 8).getValue() || 0);
  var plazoTotal = calcularPlazoTotal(semestre);
  var fechaRad = sheet.getRange(ri, 34).getValue();
  var diasTranscurridos = calcularDiasHabilesTranscurridos(fechaRad, new Date());
  var diasRestantes = Math.max(0, plazoTotal - diasTranscurridos);
  var directoremail = "director@usc.edu.co"; // Cambiar por email real del director
  var notasActuales = String(sheet.getRange(ri, 36).getValue() || "");
  var yaNotificadoVencimiento = notasActuales.indexOf("[VENCIMIENTO NOTIFICADO]") !== -1;

  // ALERTA: Vencimiento general (plazo total)
  if (diasRestantes <= 0 && !yaNotificadoVencimiento) {
    try {
      MailApp.sendEmail({
        to: COORDINADORA_EMAIL,
        cc: directoremail,
        subject: "🚨 ALERTA CRÍTICA — Plazo vencido · " + numero,
        body: "El plazo total para finalizar todas las fases ha vencido.\n\n" +
              "Radicación: " + numero + "\n" +
              "Estudiante: " + emailEst + "\n" +
              "Semestre: " + semestre + "\n" +
              "Plazo total: " + plazoTotal + " días hábiles\n" +
              "Días transcurridos: " + diasTranscurridos + "\n\n" +
              "El director de programa ha sido notificado sobre la posibilidad de que el estudiante no pueda cumplir con el grado en este semestre.\n\n" +
              "Comité de Trabajos de Grado — Medicina USC"
      });
      var marcaV = "[VENCIMIENTO NOTIFICADO]";
      sheet.getRange(ri, 36).setValue(notasActuales ? (notasActuales + " | " + marcaV) : marcaV);
    } catch(e) { Logger.log("Error correo vencimiento: " + e); }
  }
  
  // ALERTA: Vencimiento Fase 1 (15 días para tutores)
  if (estado === 'Radicado') {
    var diasParaTutores = 15;
    if (diasTranscurridos > diasParaTutores) {
      try {
        MailApp.sendEmail({
          to: COORDINADORA_EMAIL,
          subject: "⚠️ ALERTA — Vencimiento Fase 1 (Tutores) · " + numero,
          body: "El plazo de 15 días hábiles para avaluar tutores ha vencido.\n\n" +
                "Radicación: " + numero + "\nEstudiante: " + emailEst + "\n" +
                "Días desde radicación: " + diasTranscurridos
        });
      } catch(e) { Logger.log("Error correo tutores vencido: " + e); }
    }
  }
  
  // ALERTA: Vencimiento Fase 1B (8 días para actas)
  if (estado !== 'Radicado' && estado !== 'Fase 2 Desbloqueada') {
    var sheetActas = getSheet("Acta asesoria");
    var dataActas = sheetActas.getDataRange().getValues();
    for (var j = 1; j < dataActas.length; j++) {
      if (String(dataActas[j][1]) === numero) {
        var diasDesdeActa = calcularDiasHabilesTranscurridos(dataActas[j][5], new Date());
        if (diasDesdeActa > 8) {
          try {
            MailApp.sendEmail({
              to: COORDINADORA_EMAIL,
              subject: "⚠️ ALERTA — Vencimiento Fase 1B (Actas) · " + numero,
              body: "El plazo de 8 días hábiles para revisar actas ha vencido.\n\n" +
                    "Radicación: " + numero + "\nEstudiante: " + emailEst + "\n" +
                    "Días desde carga de acta: " + diasDesdeActa
            });
          } catch(e) { Logger.log("Error correo actas vencido: " + e); }
        }
        break;
      }
    }
  }
  
  // ALERTA: Vencimiento Fase 2 (8 días para protocolo)
  var sheetFase2 = getSheet("Fase2");
  if (sheetFase2) {
    var dataFase2 = sheetFase2.getDataRange().getValues();
    for (var k = 1; k < dataFase2.length; k++) {
      if (String(dataFase2[k][1]) === numero && String(dataFase2[k][8]) === 'Cargado') {
        var diasDesdeProto = calcularDiasHabilesTranscurridos(dataFase2[k][4], new Date());
        if (diasDesdeProto > 8) {
          try {
            MailApp.sendEmail({
              to: COORDINADORA_EMAIL,
              subject: "⚠️ ALERTA — Vencimiento Fase 2 (Protocolo) · " + numero,
              body: "El plazo de 8 días hábiles para revisar protocolo ha vencido.\n\n" +
                    "Radicación: " + numero + "\nEstudiante: " + emailEst + "\n" +
                    "Días desde carga de protocolo: " + diasDesdeProto
            });
          } catch(e) { Logger.log("Error correo protocolo vencido: " + e); }
        }
        break;
      }
    }
  }
} 

function validarTutores(rowIndex, tutor1, tutor2, observaciones, emailCoord) {
  var sheet = getSheet("Fase1");
  var ri    = parseInt(rowIndex);
  var numeroRad = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var estadoAnteriorF1 = String(sheet.getRange(ri, 33).getValue() || "");
  if (tutor1) {
    sheet.getRange(ri, 25).setValue(tutor1.nombre   || "");
    sheet.getRange(ri, 26).setValue(tutor1.email    || "");
    sheet.getRange(ri, 27).setValue(tutor1.telefono || "");
    sheet.getRange(ri, 28).setValue(tutor1.vinculo  || "");
  }
  if (tutor2 && tutor2.nombre) {
    sheet.getRange(ri, 29).setValue(tutor2.nombre   || "");
    sheet.getRange(ri, 30).setValue(tutor2.email    || "");
    sheet.getRange(ri, 31).setValue(tutor2.telefono || "");
    sheet.getRange(ri, 32).setValue(tutor2.vinculo  || "");
  }
  if (observaciones) sheet.getRange(ri, 36).setValue(observaciones);
  var modalidadLower = String(sheet.getRange(ri, 23).getValue() || "").trim().toLowerCase();
  var esDipl = modalidadLower === "diplomado";
  if (!esDipl) {
    sheet.getRange(ri, 33).setValue("Tutores Avalados");
    notificarCambioEstado(ri, "Tutores Avalados", {});
  }
  registrarAuditoria(emailCoord, "VALIDAR_TUTORES", numeroRad + " | Fila " + rowIndex);
  var estadoNuevoTutores = esDipl ? estadoAnteriorF1 : "Tutores Avalados";
  registrarHistorial(numeroRad, "FASE1", "VALIDAR_TUTORES", estadoAnteriorF1, estadoNuevoTutores, emailCoord || "", observaciones || "", "T1: " + ((tutor1 && tutor1.nombre) || "") + " | T2: " + ((tutor2 && tutor2.nombre) || ""));
  return { success: true };
}

function obtenerTutores() {
  var sheet = getSheet("Tutores");

  // Si no existe la hoja Tutores, no debe romper la página
  if (!sheet) {
    return { success: true, tutores: [] };
  }

  var data = sheet.getDataRange().getValues();
  var tutores = [];

  for (var i = 1; i < data.length; i++) {
    var r = data[i];

    var id       = String(r[0] || i).trim();
    var nombre   = String(r[1] || "").trim();
    var email    = String(r[2] || "").trim();
    var telefono = String(r[3] || "").trim();
    var estado   = String(r[4] || "").trim().toLowerCase();

    if (!nombre && !email) continue;
    if (estado === "inactivo") continue;

    tutores.push({
      id: id,
      nombre: nombre,
      email: email,
      telefono: telefono
    });
  }

  return {
    success: true,
    tutores: tutores
  };
}

// Hoja Evaluadores: A=ID | B=Nombre | C=Email | D=Teléfono | E=Especialidad | F=Estado
function obtenerEvaluadores() {
  var sheet = getSheet("Evaluadores");
  if (!sheet) return { success: true, evaluadores: [] };
  var data = sheet.getDataRange().getValues();
  var evaluadores = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[1] && !r[2]) continue;
    var est = String(r[5]||"").trim().toLowerCase();
    if (est === "inactivo") continue;
    evaluadores.push({ id: String(r[0]||""), nombre: String(r[1]||"").trim(), email: String(r[2]||"").trim(), telefono: String(r[3]||"").trim(), especialidad: String(r[4]||"").trim() });
  }
  return { success: true, evaluadores: evaluadores };
}

// Hoja Jurados: A=ID | B=Nombre | C=Email | D=Teléfono | E=Especialidad | F=Estado (inactivo = omitir)
function obtenerJurados() {
  var sheet = getSheet("Jurados");
  if (!sheet) return { success: true, jurados: [], listaNota: "no_hoja" };
  var data = sheet.getDataRange().getValues();
  var jurados = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var nombre = String(r[1] || "").trim();
    var email = String(r[2] || "").trim();
    if (!nombre && !email) continue;
    var estado = String(r[5] || "").trim().toLowerCase();
    if (estado === "inactivo") continue;
    jurados.push({
      id: String(r[0] || i).trim(),
      nombre: nombre,
      email: email,
      telefono: String(r[3] || "").trim(),
      especialidad: String(r[4] || "").trim()
    });
  }
  return { success: true, jurados: jurados, listaNota: jurados.length ? "" : "sin_filas" };
}

// Hoja Fecha reuniones: A=ID | B=Año | C=Mes | D=Fecha Reunión 1 | E=Fecha Reunión 2 | F=Estado
function obtenerFechasComite() {
  var sheet = getSheet("Fecha reuniones");
  if (!sheet) return { success: true, fechas: [] };
  var data = sheet.getDataRange().getValues();
  var fechas = [];
  for (var i = 1; i < data.length; i++) {
    [data[i][3], data[i][4]].forEach(function(val) {
      if (!val) return;
      var fmt = (val instanceof Date)
        ? Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy")
        : String(val).trim();
      if (fmt) fechas.push({ fecha: fmt, estado: String(data[i][5]||"").trim() });
    });
  }
  return { success: true, fechas: fechas };
}

// ── ARCHIVOS / DRIVE ─────────────────────────────────────────
function subirArchivoAutorizado(base64, nombreArchivo, tipoArchivo, subcarpeta, sesion) {
  if (!sesion || (!sesionEsCoordinadoraOAsistente(sesion) && sesion.rol !== "estudiante")) {
    return { success: false, error: "No autorizado" };
  }
  return subirArchivo(base64, nombreArchivo, tipoArchivo, subcarpeta);
}

function subirArchivo(base64, nombreArchivo, tipoArchivo, subcarpeta) {
  if (!base64 || !nombreArchivo) return { success: false, error: "Datos incompletos" };
  try {
    var carpeta = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    if (subcarpeta) {
      var iter = carpeta.getFoldersByName(subcarpeta);
      carpeta  = iter.hasNext() ? iter.next() : carpeta.createFolder(subcarpeta);
    }
    var bytes   = Utilities.base64Decode(base64);
    var blob    = Utilities.newBlob(bytes, tipoArchivo || "application/pdf", nombreArchivo);
    var archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, url: archivo.getUrl(), id: archivo.getId() };
  } catch(e) {
    return { success: false, error: "Error al subir: " + e.toString() };
  }
}

// ── FASE 2: PROTOCOLO ────────────────────────────────────────
// Hoja Fase 2 (18 columnas):
// A(1)=ID | B(2)=Número Radicación | C(3)=Email Estudiante | D(4)=Nombre Archivo
// E(5)=URL Archivo | F(6)=Fecha Carga | G(7)=Qué Anexo Cambió
// H(8)=Evaluador Asignado | I(9)=Fecha Reunión Comité | J(10)=Estado
// K(11)=Fecha Evaluación | L(12)=Decisión Comité | M(13)=Motivo Devolución
// N(14)=Fecha Aprobación | O(15)=Enviado Por Correo | P(16)=Fecha Envío Correo
// Q(17)=Observaciones Coordinadora | R(18)=Aprobado Por

function crearProtocolo(numeroRadicacion, emailEstudiante, nombreArchivo, urlArchivo, anexoCambio, observaciones, sesion) {
  if (!sesion || sesion.rol !== "estudiante") {
    return { success: false, error: "No autorizado" };
  }
  if (String(emailEstudiante || "").trim().toLowerCase() !== String(sesion.email || "").trim().toLowerCase()) {
    return { success: false, error: "No autorizado" };
  }
  if (!numeroRadicacion || !emailEstudiante) {
    return { success: false, error: "Datos incompletos" };
  }

  var sheet = getSheet("Fase2");
  if (!sheet) {
    return { success: false, error: "Hoja Fase2 no encontrada" };
  }

  var id = sheet.getLastRow();

  sheet.appendRow([
    id,                              // A ID
    numeroRadicacion,                // B Número Radicación
    emailEstudiante,                 // C Email Estudiante
    nombreArchivo || "",             // D Fecha de Solicitud forms / nombre lógico que estás usando
    Utilities.formatDate(new Date(), SpreadsheetApp.openById(SHEET_ID).getSpreadsheetTimeZone(), "yyyy-MM-dd"),
      anexoCambio || "Protocolo Completo", // F Documento radicado
    "",                              // G Evaluadores
    "",                              // H Fecha Comité
    "Cargado",                       // I Estado
    "",                              // J Fecha Aprobación
    observaciones || "",             // K Observaciones
    "",                              // L Fecha extra
    "",                              // M Observaciones2
    COORDINADORA_EMAIL               // N correo que radica
  ]);

  var sheetF1 = getSheet("Fase1");
  var dataF1 = sheetF1.getDataRange().getValues();

  for (var i = 1; i < dataF1.length; i++) {
    if (String(dataF1[i][1]) === String(numeroRadicacion)) {
      sheetF1.getRange(i + 1, 33).setValue("Pendiente Comité Técnico");
      notificarCambioEstado(i + 1, "Pendiente Comité Técnico", {});
      break;
    }
  }

  registrarAuditoria(emailEstudiante, "CREAR_PROTOCOLO", numeroRadicacion);
  registrarHistorial(numeroRadicacion, "FASE2", "CREAR_PROTOCOLO", "", "Cargado", emailEstudiante || "", observaciones || "", "Archivo: " + (nombreArchivo || ""));
  return { success: true };
}
/** Lista completa de protocolos Fase 2 (sin filtrar por rol). Uso interno + API con sesión. */
function listaProtocolosFase2Completa() {
  var sheet = getSheet("Fase2");
  if (!sheet) {
    return [];
  }
  var data = sheet.getDataRange().getValues();
  var protocolos = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var estado = String(r[8] || "Cargado");
    var diasRestantes = 0;
    var vencido = false;
    if (estado === "Cargado") {
      var fechaRadicacion = r[4];
      diasRestantes = calcularDiasHabilesRestantes(fechaRadicacion);
      vencido = diasRestantes <= 0;
    }
    protocolos.push({
      rowIndex: i + 1,
      id: String(r[0] || ""),
      numero: String(r[1] || ""),
      emailEstudiante: String(r[2] || ""),
      fechaSolicitud: formatearFecha(r[3]),
      fechaRadicacion: formatearFecha(r[4]),
      documento: String(r[5] || ""),
      evaluador: String(r[6] || ""),
      fechaComite: formatearFecha(r[7]),
      estado: estado,
      fechaAprobacion: formatearFecha(r[9]),
      observaciones: String(r[10] || ""),
      correoRadica: String(r[13] || ""),
      diasRestantes: diasRestantes,
      vencido: vencido,
      numeroActa: String(r[16] || ""),
      avalCCEB: String(r[17] || "")
    });
  }
  var estadoPrioridad = { "Aprobado": 3, "Aprobado Directo": 3, "Pendiente Comité": 2, "Cargado": 2, "Devuelto": 1, "Devuelto por Comité Técnico": 1 };
  var visto = {};
  protocolos.forEach(function(p) {
    var prioridad = estadoPrioridad[p.estado] || 0;
    if (!visto[p.numero] || prioridad > (estadoPrioridad[visto[p.numero].estado] || 0)) {
      visto[p.numero] = p;
    }
  });
  return Object.values(visto);
}

function obtenerFase2(sesion) {
  if (!sesion) return { success: false, error: "Sesión requerida" };
  var protocolos = listaProtocolosFase2Completa();
  protocolos = enriquecerProtocolosConRadicacionDiplomado(protocolos);
  if (sesion.rol === "estudiante") {
    var em = String(sesion.email || "").trim().toLowerCase();
    protocolos = protocolos.filter(function(p) {
      return String(p.emailEstudiante || "").trim().toLowerCase() === em;
    });
  } else if (!sesionEsCoordinadoraOAsistente(sesion)) {
    return { success: false, error: "No autorizado" };
  }
  return { success: true, protocolos: protocolos };
}
function actualizarEstadoProtocolo(rowIndex, estado, evaluador, emailEvaluador, fechaReunion, decision, motivo, emailCoord) {
  var sheet = getSheet("Fase2");
  var ri = parseInt(rowIndex);
  var estadoAnteriorF2 = String(sheet.getRange(ri, 9).getValue() || "");
  var numRadProt = String(sheet.getRange(ri, 2).getValue() || "").trim();

  // Hoja real:
  // G=7 Evaluadores
  // H=8 Fecha Comité
  // I=9 Estado
  // J=10 Fecha Aprobación
  // K=11 Observaciones
  // N=14 correo que radica

  sheet.getRange(ri, 7).setValue(evaluador || "");
  sheet.getRange(ri, 8).setValue(fechaReunion || "");
  sheet.getRange(ri, 9).setValue(estado || "");
  sheet.getRange(ri, 10).setValue(hoy());
  sheet.getRange(ri, 11).setValue(motivo || decision || "");
  sheet.getRange(ri, 14).setValue(emailCoord || "");

  var numRad = String(sheet.getRange(ri, 2).getValue());
  var aprobado = (estado === "Aprobado" || estado === "Pendiente Comité");
  var estadoFase1 = (estado === "Devuelto") ? "Devuelto" : "Aprobado";

  var sheetF1 = getSheet("Fase1");
  var dataF1 = sheetF1.getDataRange().getValues();

  for (var i = 1; i < dataF1.length; i++) {
    if (String(dataF1[i][1]) === numRad) {
      sheetF1.getRange(i + 1, 33).setValue(estadoFase1);
      notificarCambioEstado(i + 1, estadoFase1, { notas: motivo });
      break;
    }
  }

  try {
    if (emailEvaluador && evaluador) {
      MailApp.sendEmail({
        to: emailEvaluador,
        subject: "📋 Asignación como evaluador · Comité CTTG · " + numRad,
        body:
          "Estimado/a " + evaluador + ",\n\n" +
          "Se le ha asignado la evaluación del protocolo: " + numRad +
          "\nFecha del comité: " + (fechaReunion || "Por confirmar") +
          "\n\nComité de Trabajos de Grado — Medicina USC"
      });
    }
  } catch (e) {
    Logger.log("Error correo evaluador: " + e);
  }

  registrarAuditoria(emailCoord, "ACTUALIZAR_PROTOCOLO", numRad + " | Fila " + rowIndex + " → " + estado);
  registrarHistorial(numRadProt, "FASE2", "ACTUALIZAR_PROTOCOLO", estadoAnteriorF2, estado || "", emailCoord || "", motivo || decision || "", "Evaluador: " + (evaluador || "") + " | Reunión: " + (fechaReunion || ""));
  return { success: true };
}
// ── ACTAS DE ASESORÍA ────────────────────────────────────────
// Hoja Acta asesoria: A(1)=ID | B(2)=Número Radicación | C(3)=Email Estudiante
// D(4)=Nombre Archivo | E(5)=URL Archivo | F(6)=Fecha Carga | G(7)=Estado | H(8)=Observaciones

function crearActasAsesoria(numeroRadicacion, emailEstudiante, nombreArchivo, base64, observaciones, sesion) {
  if (!sesion || sesion.rol !== "estudiante") {
    return { success: false, error: "No autorizado" };
  }
  if (String(emailEstudiante || "").trim().toLowerCase() !== String(sesion.email || "").trim().toLowerCase()) {
    return { success: false, error: "No autorizado" };
  }
  if (!numeroRadicacion || !emailEstudiante) return { success: false, error: "Datos incompletos" };
  var sheet = getSheet("Acta asesoria");
  if (!sheet) return { success: false, error: "Hoja Acta asesoria no encontrada" };

  var urlArchivo = "";
  try {
    var r = subirArchivo(base64, nombreArchivo, "application/pdf", "ActasAsesoria");
    if (r.success) urlArchivo = r.url;
  } catch(e) { Logger.log("Error subida acta: " + e); }

  var id = sheet.getLastRow();
  sheet.appendRow([
    id,                   // 1  ID
    numeroRadicacion,     // 2  Número Radicación
    emailEstudiante,      // 3  Email Estudiante
    nombreArchivo || "",  // 4  Nombre Archivo
    urlArchivo,           // 5  URL Archivo
    hoy(),                // 6  Fecha Carga
    "Pendiente revisión", // 7  Estado
    observaciones || ""   // 8  Observaciones
  ]);

  try {
    MailApp.sendEmail({
      to: COORDINADORA_EMAIL,
      subject: "📋 Nueva Acta de Asesoría — " + numeroRadicacion,
      body: "El estudiante " + emailEstudiante + " cargó un acta para " + numeroRadicacion +
            "\nArchivo: " + (nombreArchivo || "") +
            (observaciones ? "\nObservaciones: " + observaciones : "")
    });
  } catch(e) { Logger.log("Error correo acta: " + e); }

  registrarAuditoria(emailEstudiante, "CREAR_ACTA", numeroRadicacion);
  registrarHistorial(numeroRadicacion, "ACTAS", "CREAR_ACTA", "", "Pendiente revisión", emailEstudiante || "", observaciones || "", "Archivo: " + (nombreArchivo || ""));
  return { success: true };
}

function listaActasAsesoriaCompleta() {
  var sheet = getSheet("Acta asesoria");
  if (!sheet) return [];
  var data  = sheet.getDataRange().getValues();
  var actas = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    actas.push({
      rowIndex:        i + 1,
      id:              String(r[0] || ""),
      numero:          String(r[1] || ""),
      emailEstudiante: String(r[2] || ""),
      nombreArchivo:   String(r[3] || ""),
      urlArchivo:      String(r[4] || ""),
      fechaCarga:      formatearFecha(r[5]),
      estado:          String(r[6] || "Pendiente revisión"),
      observaciones:   String(r[7] || "")
    });
  }
  return actas;
}

function obtenerActasAsesoria(sesion) {
  if (!sesion) return { success: false, error: "Sesión requerida" };
  var actas = listaActasAsesoriaCompleta();
  if (sesion.rol === "estudiante") {
    var em = String(sesion.email || "").trim().toLowerCase();
    actas = actas.filter(function(a) {
      return String(a.emailEstudiante || "").trim().toLowerCase() === em;
    });
  } else if (!sesionEsCoordinadoraOAsistente(sesion)) {
    return { success: false, error: "No autorizado" };
  }
  return { success: true, actas: actas };
}

function aprobarActasAsesoria(rowIndex, emailEstudiante, emailCoord, rechazar, motivo) {
  var sheetActas = getSheet("Acta asesoria");
  var ri         = parseInt(rowIndex);
  var nombreActa = String(sheetActas.getRange(ri, 4).getValue() || "");
  var numeroRad  = String(sheetActas.getRange(ri, 2).getValue() || "").trim();
  var esSolicitudFase2 = nombreActa === "Solicitud activación Fase 2";
  var estado     = rechazar ? "Rechazada" : "Aprobada";
  var estadoAnteriorActa = String(sheetActas.getRange(ri, 7).getValue() || "");

  sheetActas.getRange(ri, 7).setValue(estado);
  if (motivo) sheetActas.getRange(ri, 8).setValue(motivo);

  if (!rechazar && esSolicitudFase2) {
    var sheetF1 = getSheet("Fase1");
    var numeroRad = String(sheetActas.getRange(ri, 2).getValue() || "").trim();
    var dataF1  = sheetF1.getDataRange().getValues();
    
    for (var i = 1; i < dataF1.length; i++) {
      if (String(dataF1[i][1]).trim() === numeroRad) {
        sheetF1.getRange(i + 1, 33).setValue("Fase 2 Desbloqueada");
        Logger.log("Actualizó fila " + (i + 1) + " a Fase 2 Desbloqueada para " + numeroRad);
        notificarCambioEstado(i + 1, "Fase 2 Desbloqueada", {});
        break;
      }
    }
  }
   else if (rechazar) {
    try {
      MailApp.sendEmail({
        to: emailEstudiante,
        subject: "❌ Acta rechazada — CTTG Medicina",
        body: "Tu acta fue rechazada.\n\nMotivo: " + (motivo || "") + "\n\nPor favor corrige y vuelve a cargarla."
      });
    } catch(e) { Logger.log("Error correo rechazo acta: " + e); }
  }

 registrarAuditoria(emailCoord, rechazar ? "RECHAZAR_ACTA" : "APROBAR_ACTA", numeroRad + " | Fila " + rowIndex);
  registrarHistorial(numeroRad, "ACTAS", rechazar ? "RECHAZAR_ACTA" : "APROBAR_ACTA", estadoAnteriorActa, estado, emailCoord || "", motivo || "", "Acta: " + nombreActa + (esSolicitudFase2 ? " | Solicitud Fase 2" : ""));
  return { success: true };
}
// ── FASE 3: SUSTENTACIÓN ─────────────────────────────────────
// Hoja Fase 3: tel jurado en O(15) y R(18); réplica en AE/AF; especialidad opcional en AG/AH (34 cols).

function crearFase3(numeroRadicacion, emailEstudiante, porcentajeTurnitin, jurado1Nombre, jurado1Email, jurado1Telefono, jurado2Nombre, jurado2Email, jurado2Telefono, jurado1Especialidad, jurado2Especialidad, anexoA7, articulo, guiaAutores, avalCCEB, turnitinDoc, sesion) {
  if (!sesion || sesion.rol !== "estudiante") {
    return { success: false, error: "No autorizado" };
  }
  if (String(emailEstudiante || "").trim().toLowerCase() !== String(sesion.email || "").trim().toLowerCase()) {
    return { success: false, error: "No autorizado" };
  }
  if (!numeroRadicacion || !emailEstudiante) return { success: false, error: "Datos incompletos" };
  
  var pct = parseFloat(porcentajeTurnitin || 0);
  if (pct >= 20) return { success: false, error: "El porcentaje Turnitin debe ser menor al 20%" };
  
  var sheet = getSheetFase3();
  if (!sheet) return { success: false, error: "Hoja Fase 3 no encontrada" };
  asegurarColumnasEstadoFase3(sheet);

  var sheetF1 = getSheet("Fase1");
  var semNum = 0;
  if (sheetF1) {
    var dataF1 = sheetF1.getDataRange().getValues();
    for (var i = 1; i < dataF1.length; i++) {
      if (String(dataF1[i][1] || "").trim() === String(numeroRadicacion).trim()) {
        semNum = parseInt(dataF1[i][7] || 0);
        break;
      }
    }
  }

  // Bloquear nueva solicitud si ya existe una activa con jurados asignados
  var existingRows = sheet.getDataRange().getValues();
  for (var j = 1; j < existingRows.length; j++) {
    if (String(existingRows[j][1] || "").trim() !== String(numeroRadicacion).trim()) continue;
    var j1Nom = String(existingRows[j][13] || "").trim();  // col N jurado1Nombre
    var j2Nom = String(existingRows[j][16] || "").trim();  // col Q jurado2Nombre
    var estSol = String(existingRows[j][28] || "").trim().toLowerCase(); // col AC estadoSolicitud
    var esTerminalSol = estSol.includes("devuelt") || estSol.includes("cancel") || estSol.includes("rechaz");
    if (j1Nom && j2Nom && !esTerminalSol) {
      return { success: false, error: "Ya existe una solicitud de sustentación activa con jurados asignados para esta radicación. Debe solicitar a la coordinación anular la solicitud previa antes de crear una nueva." };
    }
  }

  var alertaS12 = (semNum === 12) ? "SÍ" : "";
  var newRow = sheet.getLastRow() + 1;

  sheet.appendRow([
    newRow,                   // 1  ID
    numeroRadicacion,         // 2  Número Radicación
    emailEstudiante,          // 3  Email Estudiante
    "",                       // 4  Fecha Sustentación
    semNum,                   // 5  Semestre
    alertaS12,                // 6  Alerta S12
    anexoA7 || "",            // 7  Anexo A7
    articulo || "",           // 8  Artículo
    guiaAutores || "",        // 9  Guía Autores
    avalCCEB || "",           // 10 Aval CCEB
    turnitinDoc || "",        // 11 Turnitin
    String(pct),              // 12 % Turnitin
    hoy(),                    // 13 Fecha Carga
    jurado1Nombre || "",      // 14 N — Jurado 1 Nombre
    jurado1Telefono || "",    // 15 O — Jurado 1 Tel
    jurado1Email || "",       // 16 P — Jurado 1 Email
    jurado2Nombre || "",      // 17 Q — Jurado 2 Nombre
    jurado2Telefono || "",    // 18 R — Jurado 2 Tel
    jurado2Email || "",       // 19 S — Jurado 2 Email
    "",                       // 20 Nombres para el acta
    "",                       // 21 Fecha Asignada
    "",                       // 22 Número Acta
    "",                       // 23 Nota
    "",                       // 24 Generó Producto
    "",                       // 25 Descripción Producto
    "",                       // 26 Fecha Cierre
    "",                       // 27 Hora Sustentación
    "",                       // 28 Observaciones / Lugar
    "Solicitud sustentación radicada", // 29 Estado Solicitud
    "",                       // 30 Observaciones Estado
    jurado1Telefono || "",    // 31 Jurado 1 Tel (réplica)
    jurado2Telefono || "",    // 32 Jurado 2 Tel (réplica)
    String(jurado1Especialidad || "").trim(), // 33 AG — Jurado 1 Especialidad
    String(jurado2Especialidad || "").trim()  // 34 AH — Jurado 2 Especialidad
  ]);

  if (alertaS12 === "SÍ") {
    try {
      MailApp.sendEmail({
        to: COORDINADORA_EMAIL,
        subject: "🚨 ALERTA CRÍTICA — Estudiante Semestre 12 · " + numeroRadicacion,
        body: "El estudiante " + emailEstudiante + " con radicación " + numeroRadicacion +
              " está en SEMESTRE 12 y solicita sustentación. Requiere atención urgente."
      });
    } catch(e) { Logger.log("Error correo S12: " + e); }
  }

  try {
    MailApp.sendEmail({
      to: emailEstudiante,
      subject: "🎓 Solicitud de sustentación recibida — " + numeroRadicacion,
      body: "Tu solicitud fue recibida.\n\nRadicación: " + numeroRadicacion +
            "\nPorcentaje Turnitin: " + pct + "%" +
            "\nLa coordinadora asignará fecha y jurados pronto."
    });
  } catch(e) { Logger.log("Error correo fase3: " + e); }

  registrarTrazabilidadSustentacion(
    numeroRadicacion,
    newRow,
    "SOLICITUD_CREADA",
    "Pendiente asignación",
    emailEstudiante,
    "Solicitud registrada. Turnitin: " + pct + "%"
  );
  registrarAuditoria(emailEstudiante, "CREAR_FASE3", numeroRadicacion);
  registrarHistorial(numeroRadicacion, "FASE3", "CREAR_FASE3", "", "Solicitud sustentación radicada", emailEstudiante || "", "", "Turnitin: " + pct + "% | J1: " + (jurado1Nombre || "") + " | J2: " + (jurado2Nombre || ""));
  return { success: true, rowIndex: newRow };
}

/** Encabezado típico de columna radicación en la hoja Fase 3 */
function esEncabezadoColumnaRadicacionF3(txt) {
  var t = String(txt || "").trim().toLowerCase();
  return t === "número radicación" || t === "numero radicacion" || t === "n° radicación" || t === "nº radicación";
}

/** True si la celda puede ser número de radicación (evita emails, fechas cortas y solo números tipo semestre). */
function pareceNumeroRadicacionFase3(cell) {
  var v = String(cell || "").trim();
  if (!v || esEncabezadoColumnaRadicacionF3(v)) return false;
  if (/@/.test(v)) return false;
  if (/^\d+$/.test(v)) return false;
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)) return false;
  if (/^CTTG-/i.test(v)) return true;
  if (/^TEST$/i.test(v)) return true;
  if (/^[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}\s*-\s*\d{4}\s*-\s*\d+/i.test(v)) return true;
  if (/^[A-Za-z][\w\-]{2,}$/.test(v.replace(/\s+/g, "")) && /\d/.test(v)) return true;
  return false;
}

/** Fila en blanco real en lo que devolvió Sheets (sin propagar radicación por debajo). */
function filaFase3SinContenidoAlguno(r) {
  var lim = Math.min(r.length, 64);
  var c;
  for (c = 0; c < lim; c++) {
    if (String(r[c] || "").trim()) return false;
  }
  return true;
}

/**
 * Cuando B está vacío o tiene texto libre, intenta obtener el número de radicación sin
 * confundir con columnas de jurados (solo explora primeras columnas «de identificación»).
 */
function inferirNumeroRadicacionFilaFase3(r) {
  if (!r || !r.length) return "";
  var scanOrder = [1, 0, 3, 4, 5, 6, 7, 8];
  var si;
  for (si = 0; si < scanOrder.length; si++) {
    var ci = scanOrder[si];
    if (ci >= r.length) continue;
    var cell = String(r[ci] || "").trim();
    var ext = extraerNumeroRadicacion(cell);
    if (ext) return ext;
    if (pareceNumeroRadicacionFase3(cell)) return cell;
  }
  var blob = String(r[0] || "") + " " + String(r[1] || "") + " " + String(r[2] || "");
  var extBlob = extraerNumeroRadicacion(blob);
  if (extBlob) return extBlob;

  var emailColC = String(r[2] || "").trim();
  if (/@/.test(emailColC)) {
    var b = String(r[1] || "").trim();
    if (/^\d{4,14}$/.test(b)) return b;
    var a = String(r[0] || "").trim();
    if (/^\d{4,14}$/.test(a)) return a;
  }
  return "";
}

function dedupeFase3PorRadicacion(fase3) {
  var ultimasPorRadicacion = {};
  for (var k = 0; k < fase3.length; k++) {
    var item = fase3[k];
    var numeroKey = String(item.numero || "").trim();
    if (!numeroKey) continue;
    var actual = ultimasPorRadicacion[numeroKey];
    if (!actual) {
      ultimasPorRadicacion[numeroKey] = item;
      continue;
    }
    var fechaActual = new Date(actual.fechaCarga || "");
    var fechaItem = new Date(item.fechaCarga || "");
    var fechaActualValida = !isNaN(fechaActual.getTime());
    var fechaItemValida = !isNaN(fechaItem.getTime());
    if ((fechaItemValida && !fechaActualValida) ||
        (fechaItemValida && fechaActualValida && fechaItem > fechaActual) ||
        ((!fechaItemValida && !fechaActualValida) && item.rowIndex > actual.rowIndex) ||
        (fechaItemValida && fechaActualValida && fechaItem.getTime() === fechaActual.getTime() && item.rowIndex > actual.rowIndex)) {
      ultimasPorRadicacion[numeroKey] = item;
    }
  }
  return Object.keys(ultimasPorRadicacion).map(function(key) { return ultimasPorRadicacion[key]; });
}

/** Igual que CONTARA(B2:B…): cuenta filas con texto en columna B y la última fila útil.
 *  Importante: no acotar el barrido con getLastRow(); en Sheets suele quedar bajo y entonces “desaparecen” filas aunque en pantalla haya 30+. */
function metricasColumnaRadicacionFase3(sheet) {
  var lrSheet = sheet.getLastRow();
  var maxRows = sheet.getMaxRows();
  // No exceder maxRows al leer desde fila 2 (máximo disponible = maxRows - 1)
  var scanEnd = Math.min(5000, Math.max(lrSheet, 900), maxRows - 1);
  if (scanEnd < 1) return { conteoRadicacionesColumnaB: 0, ultimaFilaNumeroEnColumnaB: 1, scanEndColumnaB: 0 };
  var vals = sheet.getRange(2, 2, scanEnd, 2).getDisplayValues();

  var conteo = 0;
  var ultimaFila = 1;
  for (var i = 0; i < vals.length; i++) {
    var celda = (vals[i][0] || "").toString().trim();
    if (celda !== "") {
      conteo++;
      ultimaFila = i + 2; // +2 porque empezamos en fila 2 y el índice es 0-based
    }
  }
  return {
    conteoRadicacionesColumnaB: conteo,
    ultimaFilaNumeroEnColumnaB: ultimaFila,
    scanEndColumnaB: scanEnd
  };
}

/** Última fila que puede editarse en Fase 3 (usada por updateFase3Estado / Asignación / completar). */
function ultimaFilaEscrituraFase3(sheet) {
  if (!sheet) return 1;
  var m = metricasColumnaRadicacionFase3(sheet);
  return Math.max(m.ultimaFilaNumeroEnColumnaB || 1, sheet.getLastRow() || 1);
}

function esFilaValidaParaModificarFase3(sheet, ri) {
  var r = parseInt(ri, 10);
  if (!r || r < 2) return false;
  return r <= ultimaFilaEscrituraFase3(sheet);
}

/** Una fila por registro en la hoja (sin agrupar radicaciones repetidas). */
function listaFase3TodasLasFilasSinDedupe() {
  var sheet = getSheetFase3();
  if (!sheet) return [];
  asegurarColumnasEstadoFase3(sheet);
  var dr = sheet.getDataRange();
  var lrSheet = sheet.getLastRow();
  var lcSheet = sheet.getLastColumn();
  var lrDr = dr ? dr.getLastRow() : lrSheet;
  var lcDr = dr ? dr.getLastColumn() : lcSheet;
  var maxColsSheet = sheet.getMaxColumns();
  var mColB = metricasColumnaRadicacionFase3(sheet);
  var lrEff = Math.max(lrSheet, lrDr, mColB.ultimaFilaNumeroEnColumnaB, 2);
  var lastRow = Math.min(Math.max(lrEff + 45, lrEff), 15000, sheet.getMaxRows());
  var numCols = Math.min(Math.max(lcSheet, lcDr, 34), 64, maxColsSheet);
  var data = lastRow < 2 ? [] : sheet.getRange(1, 1, lastRow, numCols).getDisplayValues();
  var nombreMap = {};
  var sheetF1 = getSheet("Fase1");
  if (sheetF1) {
    var dataF1 = sheetF1.getDataRange().getValues();
    for (var j = 1; j < dataF1.length; j++) {
      nombreMap[String(dataF1[j][1] || "").trim()] = String(dataF1[j][4] || "").trim();
    }
  }
  var fase3 = [];
  var carryNumero = "";
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (filaFase3SinContenidoAlguno(r)) {
      carryNumero = "";
      continue;
    }
    var rawB = String(r[1] || "").trim();

    if (esEncabezadoColumnaRadicacionF3(rawB)) {
      carryNumero = "";
      continue;
    }
    var extFromB = rawB ? extraerNumeroRadicacion(rawB) : "";
    if (rawB) carryNumero = extFromB || rawB;

    var numeroRad = rawB ? (extFromB || rawB) : carryNumero;
    if (!numeroRad) {
      var ext01 = extraerNumeroRadicacion(String(r[0] || "") + " " + String(r[1] || ""));
      if (ext01) numeroRad = ext01;
    }
    if (!numeroRad) {
      var aVal = String(r[0] || "").trim();
      if (/^CTTG-/i.test(aVal)) numeroRad = aVal;
    }
    if (!numeroRad) {
      var inferred = inferirNumeroRadicacionFilaFase3(r);
      if (inferred) numeroRad = inferred;
    }
    if (!numeroRad) continue;

    if (!rawB && numeroRad) carryNumero = numeroRad;

    fase3.push({
      rowIndex:          i + 1,
      nombreEstudiante:  nombreMap[numeroRad] || "",
      id:                String(r[0]  || ""),
      numero:            numeroRad,
      emailEstudiante:   String(r[2]  || ""),
      fechaSustentacion: formatearFecha(r[3]),
      semestre:          String(r[4]  || ""),
      alertaS12:         String(r[5]  || ""),
      urlAnexoA7:        String(r[6]  || ""),
      urlArticulo:       String(r[7]  || ""),
      urlGuia:           String(r[8]  || ""),
      urlAvalCCEB:       String(r[9]  || ""),
      urlTurnitin:       String(r[10] || ""),
      pctTurnitin:       String(r[11] || ""),
      fechaCarga:        formatearFecha(r[12]),
      jurado1Nombre:     String(r[13] || ""),
      // Tel principal O/R (índ. 14/17); AE/AF (30/31) réplica si solo existía ahí (filas antiguas del portal).
      jurado1Telefono:   String(r[14] || r[30] || "").trim(),
      jurado1Email:      String(r[15] || ""),
      jurado2Nombre:     String(r[16] || ""),
      jurado2Telefono:   String(r[17] || r[31] || "").trim(),
      jurado2Email:      String(r[18] || ""),
      jurado1Especialidad: String(r[32] || "").trim(),
      jurado2Especialidad: String(r[33] || "").trim(),
      nombres:           String(r[19] || ""),
      fechaAsignada:     formatearFecha(r[20]),
      numeroActa:        String(r[21] || ""),
      nota:              String(r[22] || ""),
      producto:          String(r[23] || ""),
      descripcion:       String(r[24] || ""),
      fechaCierre:       formatearFecha(r[25]),
      horaSustentacion:  formatearHora(r[26]),
      observaciones:     String(r[27] || ""),
      estadoSolicitud:   String(r[28] || "Solicitud sustentación radicada"),
      observacionesEstado: String(r[29] || ""),
      motivoDevolucion:  (function(){ var st = String(r[28] || "").toLowerCase(); return (st.indexOf("devuelta") !== -1 || st.indexOf("devolver") !== -1 || st.indexOf("devolucion") !== -1 || st.indexOf("devolución") !== -1) ? String(r[29] || "") : ""; })()
    });
  }
  return fase3;
}

/** Una solicitud por número de radicación (la fila más reciente si hay duplicados). */
function listaFase3Completa() {
  return dedupeFase3PorRadicacion(listaFase3TodasLasFilasSinDedupe());
}

/**
 * El estudiante puede radicar varias filas de Fase 3 para el mismo número; la vista coordinadora sigue deduplicando,
 * pero el estudiante necesita todas las filas para ver devoluciones de intentos anteriores.
 */
function ordenarFase3EstudianteMasRecientePrimero(fase3Est) {
  return fase3Est.slice().sort(function(a, b) {
    var da = new Date(a.fechaCarga || "");
    var db = new Date(b.fechaCarga || "");
    var va = !isNaN(da.getTime());
    var vb = !isNaN(db.getTime());
    if (vb && !va) return 1;
    if (va && !vb) return -1;
    if (va && vb && da.getTime() !== db.getTime()) return db.getTime() - da.getTime();
    return (parseInt(b.rowIndex, 10) || 0) - (parseInt(a.rowIndex, 10) || 0);
  });
}

function obtenerFase3(sesion, opciones) {
  if (!sesion) return { success: false, error: "Sesión requerida" };
  opciones = opciones || {};
  var sinDedupe = opciones.sinDedupe === true && sesionEsCoordinadoraOAsistente(sesion);
  var fase3;
  if (sesion.rol === "estudiante") {
    var em = String(sesion.email || "").trim().toLowerCase();
    fase3 = ordenarFase3EstudianteMasRecientePrimero(
      listaFase3TodasLasFilasSinDedupe().filter(function(s) {
        return String(s.emailEstudiante || "").trim().toLowerCase() === em;
      })
    );
  } else if (sesionEsCoordinadoraOAsistente(sesion)) {
    fase3 = sinDedupe ? listaFase3TodasLasFilasSinDedupe() : listaFase3Completa();
  } else {
    return { success: false, error: "No autorizado" };
  }
  var out = { success: true, fase3: fase3 };
  if (opciones.debugFase3 === true && sesion.rol === "coordinadora") {
    var sh = getSheetFase3();
    var lrSh = sh ? sh.getLastRow() : 0;
    var lcSh = sh ? sh.getLastColumn() : 0;
    var dr2 = sh ? sh.getDataRange() : null;
    var lrDr2 = dr2 ? dr2.getLastRow() : 0;
    var lcDr2 = dr2 ? dr2.getLastColumn() : 0;
    var mColBDbg = metricasColumnaRadicacionFase3(sh);
    var lrEffDbg = Math.max(lrSh, lrDr2, mColBDbg.ultimaFilaNumeroEnColumnaB, 2);
    var maxRowsDbg = sh ? sh.getMaxRows() : 0;
    var maxColsDbg = sh ? sh.getMaxColumns() : 64;
    var lastRowDbg = Math.min(Math.max(lrEffDbg + 45, lrEffDbg), 15000, maxRowsDbg);
    var numColsDbg = Math.min(Math.max(lcSh, lcDr2, 34), 64, maxColsDbg);
    var gridDbg = !sh || lastRowDbg < 2 ? [] : sh.getRange(1, 1, lastRowDbg, numColsDbg).getDisplayValues();
    var nombreLibroScript = "";
    var pestañasLibroScript = [];
    try {
      var ssDbg = SpreadsheetApp.openById(SHEET_ID);
      nombreLibroScript = ssDbg.getName();
      pestañasLibroScript = ssDbg.getSheets().map(function(s) { return s.getName(); });
    } catch (eDbg) {
      nombreLibroScript = "(error abriendo SHEET_ID: " + String(eDbg.message || eDbg) + ")";
    }
    out.debugFase3 = {
      sheetIdConfigurado: SHEET_ID,
      nombreLibroQueLeeElScript: nombreLibroScript,
      listaDePestañasEnEseLibro: pestañasLibroScript,
      pestañaUsada: sh ? sh.getName() : null,
      pestañaEncontrada: !!sh,
      últimaFila_getLastRow: lrSh,
      últimaFila_getDataRange: lrDr2,
      conteo_escaneo_columna_B_sinVacíosNiEncabezado: mColBDbg.conteoRadicacionesColumnaB,
      últimaFila_escaneo_columna_B: mColBDbg.ultimaFilaNumeroEnColumnaB,
      última_fila_incluida_en_escaneo_B_getRange: mColBDbg.scanEndColumnaB != null ? mColBDbg.scanEndColumnaB : null,
      maxRows_pestaña: maxRowsDbg,
      últimaColumna_getLastColumn: lcSh,
      últimaColumna_getDataRange: lcDr2,
      últimaFila_LecturaAmpliada_hastaFila: lastRowDbg,
      filasLeídasEnGrid: gridDbg.length,
      columnasLeídasEnGrid: gridDbg.length ? gridDbg[0].length : 0,
      filasDevueltasAPI: fase3.length,
      hint: "Si conteo_escaneo_columna_B << CONTARA(B): revise SHEET_ID y pestaña Fase 3. Si getLastRow es bajo pero hay datos abajo: revisión columnas/formato de la hoja. máx_filas_escaneo_B (=scanEnd) debe ser ≤ maxRows_pestaña. Si la tabla web muestra pocas filas con «Todos los estados»: compruebe filtroEstadoF3."
    };
  }
  return out;
}
function updateFase3Asignacion(rowIndex, fechaSustentacion, horaSustentacion, lugar, jurado1, jurado2, emailCoord) {
  var sheet = getSheetFase3();
  if (!sheet) return { success: false, error: "Hoja Fase 3 no encontrada" };
  asegurarColumnasEstadoFase3(sheet);
  var ri    = parseInt(rowIndex, 10);
  if (!esFilaValidaParaModificarFase3(sheet, ri)) {
    return { success: false, error: "Fila de Fase 3 inválida" };
  }

  var numero = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var estadoAnteriorF3Asig = String(sheet.getRange(ri, 29).getValue() || "");
  sheet.getRange(ri, 4).setValue(fechaSustentacion  || "");  // col D = Fecha Sustentación
  sheet.getRange(ri, 21).setValue(fechaSustentacion || "");  // col U = Fecha Asignada
  sheet.getRange(ri, 27).setValue(horaSustentacion  || "");  // col AA = Hora
  sheet.getRange(ri, 28).setValue(lugar || "");  // col AB = Lugar

  if (jurado1) {
    sheet.getRange(ri, 14).setValue(jurado1.nombre || "");
    sheet.getRange(ri, 15).setValue(jurado1.telefono || "");
    sheet.getRange(ri, 16).setValue(jurado1.email  || "");
    sheet.getRange(ri, 31).setValue(jurado1.telefono || "");
    sheet.getRange(ri, 33).setValue(jurado1.especialidad || "");
  }
  if (jurado2) {
    sheet.getRange(ri, 17).setValue(jurado2.nombre || "");
    sheet.getRange(ri, 18).setValue(jurado2.telefono || "");
    sheet.getRange(ri, 19).setValue(jurado2.email  || "");
    sheet.getRange(ri, 32).setValue(jurado2.telefono || "");
    sheet.getRange(ri, 34).setValue(jurado2.especialidad || "");
  }

  try {
    var emailEst = String(sheet.getRange(ri, 3).getValue());
    var j1Nombre = jurado1 ? (jurado1.nombre || "") : "";
    var j2Nombre = jurado2 ? (jurado2.nombre || "") : "";
    if (emailEst) {
      MailApp.sendEmail({
        to: emailEst,
        subject: "🎓 Fecha de sustentación asignada — " + numero,
        body: "Tu sustentación fue programada.\n\nFecha: " + (fechaSustentacion || "") +
              "\nHora: " + (horaSustentacion || "") +
              "\nLugar: " + (lugar || "Por confirmar") +
              "\nJurado 1: " + j1Nombre + "\nJurado 2: " + j2Nombre +
              "\n\n¡Mucho éxito!"
      });
    }
    if (jurado1 && jurado1.email) {
      MailApp.sendEmail({ to: jurado1.email, subject: "📋 Asignación como jurado — " + numero,
        body: "Ha sido asignado como jurado para la sustentación " + numero +
              "\nFecha: " + (fechaSustentacion || "") + "\nHora: " + (horaSustentacion || "") });
    }
    if (jurado2 && jurado2.email) {
      MailApp.sendEmail({ to: jurado2.email, subject: "📋 Asignación como jurado — " + numero,
        body: "Ha sido asignado como jurado para la sustentación " + numero +
              "\nFecha: " + (fechaSustentacion || "") + "\nHora: " + (horaSustentacion || "") });
    }
  } catch(e) { Logger.log("Error correos asignación: " + e); }

  registrarTrazabilidadSustentacion(
    numero,
    ri,
    "ASIGNACION_COORDINADORA",
    "Asignada",
    emailCoord,
    "Fecha: " + (fechaSustentacion || "") + " | Hora: " + (horaSustentacion || "") + " | Lugar: " + (lugar || "Por confirmar")
  );
  registrarAuditoria(emailCoord, "ASIGNAR_JURADOS", numero + " | Fila " + rowIndex + " — " + fechaSustentacion);
  registrarHistorial(numero, "FASE3", "ASIGNAR_JURADOS", estadoAnteriorF3Asig, "Sustentación programada", emailCoord || "", "", "Fecha: " + (fechaSustentacion || "") + " | Hora: " + (horaSustentacion || "") + " | Lugar: " + (lugar || ""));
  return { success: true };
}

function updateFase3Estado(rowIndex, estado, observaciones, emailCoord) {
  var sheet = getSheetFase3();
  if (!sheet) return { success: false, error: "Hoja Fase 3 no encontrada" };
  asegurarColumnasEstadoFase3(sheet);

  var ri = parseInt(rowIndex, 10);
  if (!esFilaValidaParaModificarFase3(sheet, ri)) {
    return { success: false, error: "Fila de Fase 3 inválida" };
  }

  estado = String(estado || "").trim();
  observaciones = String(observaciones || "").trim();
  if (!estado || estado.length > 240) {
    return { success: false, error: "El estado de solicitud debe tener entre 1 y 240 caracteres." };
  }
  var estadoLow = estado.toLowerCase();
  if ((estadoLow.indexOf("devuelta") !== -1 || estadoLow.indexOf("devolver") !== -1 || estadoLow.indexOf("devolución") !== -1 || estadoLow.indexOf("devolucion") !== -1) && !observaciones) {
    return { success: false, error: "Cuando la solicitud es devuelta debe indicarse el motivo en Observaciones estado." };
  }

  var numero = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var estadoAnteriorF3 = String(sheet.getRange(ri, 29).getValue() || "");
  var emailEst = String(sheet.getRange(ri, 3).getValue() || "").trim();
  var mensajeRevision = "Su solicitud de sustentación fue revisada. La documentación radicada se encuentra conforme y en los próximos días se asignarán los jurados.";
  if (estado === "Solicitud sustentación revisada" && !observaciones) {
    observaciones = mensajeRevision;
  }

  sheet.getRange(ri, 29).setValue(estado);        // AC = Estado Solicitud
  sheet.getRange(ri, 30).setValue(observaciones); // AD = Observaciones Estado

  try {
    if (emailEst) {
      var subject = "🎓 Solicitud sustentación — " + numero + " — " + estado;
      var body = "";
      if (estado === "Solicitud sustentación devuelta") {
        body = "Su solicitud de sustentación fue devuelta.\n\nRadicación: " + numero +
               "\nMotivo: " + observaciones +
               "\n\nPor favor revise la documentación indicada, realice los ajustes y vuelva a radicar la solicitud cuando corresponda.";
      } else if (estado === "Solicitud sustentación revisada") {
        body = "Su solicitud de sustentación fue revisada.\n\nRadicación: " + numero +
               "\n\nLa documentación radicada se encuentra en revisión conforme y se le asignarán jurados en los próximos días.";
      } else if (estado === "Solicitud sustentación radicada") {
        body = "Su solicitud de sustentación quedó registrada.\n\nRadicación: " + numero;
      } else {
        body = "Actualización de su solicitud de sustentación.\n\nRadicación: " + numero +
               "\nEstado (según coordinación): " + estado +
               (observaciones ? "\n\nObservaciones:\n" + observaciones : "");
      }
      MailApp.sendEmail({ to: emailEst, subject: subject, body: body });
    }
  } catch(e) {
    Logger.log("Error correo estado Fase 3: " + e);
  }

  registrarTrazabilidadSustentacion(
    numero,
    ri,
    "ESTADO_SOLICITUD_COORDINADORA",
    estado,
    emailCoord,
    observaciones
  );
  registrarAuditoria(emailCoord, "UPDATE_FASE3_ESTADO", numero + " | " + estado);
  registrarHistorial(numero, "FASE3", "UPDATE_FASE3_ESTADO", estadoAnteriorF3, estado, emailCoord || "", observaciones || "", "Fila " + rowIndex);
  return { success: true };
}

function obtenerEstadisticasTutores() {
  try {
    var sheet = getSheet("Fase1");
    if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
    var data = sheet.getDataRange().getValues();
    var tutoresMap = {};
    for (var i = 1; i < data.length; i++) {
      var tutor1 = String(data[i][24] || "").trim();
      var tutor2 = String(data[i][28] || "").trim().toLowerCase();
      var estado = String(data[i][32] || "Radicado").trim();
      if (tutor1) {
        if (!tutoresMap[tutor1]) tutoresMap[tutor1] = {nombre: tutor1, totalTrabajos: 0, enRadicacion: 0, enFase2: 0, aprobados: 0, pendientes: 0, promAvance: 0, estado: "Activo"};
        tutoresMap[tutor1].totalTrabajos++;
        if (estado === "Radicado") tutoresMap[tutor1].enRadicacion++;
        else if (estado === "Fase 2 Desbloqueada") tutoresMap[tutor1].enFase2++;
        else if (estado === "Aprobado" || estado === "Sustentado") tutoresMap[tutor1].aprobados++;
        else tutoresMap[tutor1].pendientes++;
      }
      if (tutor2) {
        if (!tutoresMap[tutor2]) tutoresMap[tutor2] = {nombre: tutor2, totalTrabajos: 0, enRadicacion: 0, enFase2: 0, aprobados: 0, pendientes: 0, promAvance: 0, estado: "Activo"};
        tutoresMap[tutor2].totalTrabajos++;
        if (estado === "Radicado") tutoresMap[tutor2].enRadicacion++;
        else if (estado === "Fase 2 Desbloqueada") tutoresMap[tutor2].enFase2++;
        else if (estado === "Aprobado" || estado === "Sustentado") tutoresMap[tutor2].aprobados++;
        else tutoresMap[tutor2].pendientes++;
      }
    }
    var tutores = [];
    for (var nombre in tutoresMap) {
      var t = tutoresMap[nombre];
      t.promAvance = t.totalTrabajos > 0 ? Math.round((t.aprobados / t.totalTrabajos) * 100) : 0;
      tutores.push(t);
    }
    tutores.sort(function(a,b){return (a.nombre||"").localeCompare(b.nombre||"");});
    return { success: true, tutores: tutores };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function obtenerAlertasCriticas() {
  try {
    var alertas = [];
    
    // ── Alertas de Fase 1 ──
    var sheet = getSheet("Fase1");
    if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
    var data = sheet.getDataRange().getValues();
    
    var estadosTerminales = ['Aprobado','Sustentado','Reprobado','Devuelto'];
    for (var i = 1; i < data.length; i++) {
      var numero = String(data[i][1] || "").trim();
      var estudiante = String(data[i][4] || "").trim();
      var emailEst1 = String(data[i][5] || data[i][2] || "").trim();
      var estado = String(data[i][32] || "").trim();
      if (estadosTerminales.indexOf(estado) !== -1) continue;
      var s1 = parseInt(data[i][7] || 0, 10) || 0;
      var s2 = parseInt(data[i][13] || 0, 10) || 0;
      var s3 = parseInt(data[i][19] || 0, 10) || 0;
      var semestre = Math.max(s1, s2, s3);
      if (!semestre) semestre = s1 || 1;
      var diasVigencia = semestre >= 11 ? 180 : 365;
      var tutor1 = String(data[i][24] || "").trim();
      var fechaRad = data[i][33];
      var diasTranscurridos = calcularDiasHabilesTranscurridos(fechaRad, new Date());
      var diasRestantes = Math.max(0, diasVigencia - diasTranscurridos);
      var pct = diasVigencia > 0 ? Math.round((diasTranscurridos / diasVigencia) * 100) : 0;

      if (pct > 60 && diasRestantes > 0) {
        alertas.push({tipo: "critico", numero: numero, estudiante: estudiante, emailEstudiante: emailEst1, estado: estado, plazo: diasRestantes + " días", detalles: pct + "% del plazo cumplido", rowIndex: i + 1});
      }
      if (semestre >= 12) {
        alertas.push({tipo: "s12", numero: numero, estudiante: estudiante, emailEstudiante: emailEst1, estado: estado, plazo: "S" + semestre, detalles: "Semestre " + semestre, rowIndex: i + 1});
      }
      if (!tutor1 && fechaRad) {
        var diasDes = Math.floor((new Date() - new Date(fechaRad)) / 86400000);
        if (diasDes > 7) {
          alertas.push({tipo: "gestion", numero: numero, estudiante: estudiante, emailEstudiante: emailEst1, estado: "Radicado", plazo: diasDes + " días", detalles: "Tutor sin asignar", rowIndex: i + 1});
        }
      }
    }
    
    // ── Alertas de Fase 2 (Protocolos sin revisar después de 8 días hábiles) ──
    var sheetFase2 = getSheet("Fase2");
    if (sheetFase2) {
      var dataFase2 = sheetFase2.getDataRange().getValues();
      for (var j = 1; j < dataFase2.length; j++) {
        var numRad = String(dataFase2[j][1] || "").trim();
        var emailEst = String(dataFase2[j][2] || "").trim();
        var estFase2 = String(dataFase2[j][8] || "").trim();
        var fechaCargaF2 = dataFase2[j][4]; // col E (índice 4) = Fecha de Carga

        if (estFase2 === "Cargado" && fechaCargaF2) {
          var diasHabiles = calcularDiasHabilesTranscurridos(fechaCargaF2, new Date());
          if (diasHabiles > 8) {
            var diasVencidos = diasHabiles - 8;
            alertas.push({
              tipo: "protocolo_vencido",
              numero: numRad,
              estudiante: emailEst,
              estado: "⚠️ VENCIDO",
              plazo: diasVencidos + " días vencidos",
              detalles: "Protocolo sin revisar — " + diasHabiles + " días hábiles desde carga",
              rowIndex: j + 1
            });
          }
        }
      }
    }
    
    return { success: true, alertas: alertas };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}
function enviarEmailAlertaCritica(numero, emailEstudiante, tipo, detalles) {
  try {
    if (!emailEstudiante || !numero) return { success: false, error: "Datos insuficientes" };
    var tipoTexto = tipo === 'critico' ? 'Plazo crítico (>60% del tiempo transcurrido)' :
                    tipo === 's12'    ? 'Estudiante en semestre 12' :
                    tipo === 'gestion' ? 'Gestión pendiente (tutores sin validar)' :
                    (detalles || 'Alerta crítica detectada');
    var asunto = "[CTTG USC] Alerta en su trabajo de grado — Radicación " + numero;
    var cuerpo = "Estimado(a) estudiante,\n\n" +
      "Este es un mensaje AUTOMÁTICO del sistema CTTG de la Coordinación de Trabajos de Grado — Facultad de Medicina, Universidad Santiago de Cali.\n\n" +
      "Se ha identificado una alerta en su proceso:\n\n" +
      "  N° Radicación: " + numero + "\n" +
      "  Tipo de alerta: " + tipoTexto + "\n" +
      (detalles ? "  Detalle: " + detalles + "\n" : "") +
      "\nPor favor comuníquese con la coordinación a la brevedad posible para evitar inconvenientes en su proceso.\n\n" +
      "► DEBE RESPONDER este correo a: investigacionmedicina@usc.edu.co\n\n" +
      "Si ya realizó las gestiones correspondientes y su proceso está al día, puede hacer caso omiso de este mensaje.\n\n" +
      "Atentamente,\n" +
      "Coordinación de Trabajos de Grado\n" +
      "Facultad de Medicina — Universidad Santiago de Cali\n" +
      "investigacionmedicina@usc.edu.co";
    GmailApp.sendEmail(emailEstudiante, asunto, cuerpo, {
      replyTo: "investigacionmedicina@usc.edu.co",
      name: "CTTG Medicina USC"
    });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function calcularDiasHabilesTranscurridos(fechaInicio, fechaFin) {
  if (!fechaInicio) return 0;
  var inicio = new Date(fechaInicio);
  var fin    = new Date(fechaFin || new Date());
  inicio.setHours(0,0,0,0);
  fin.setHours(0,0,0,0);
  if (fin < inicio) return 0;

  var totalDias   = Math.round((fin - inicio) / 86400000) + 1;
  var semCompletas = Math.floor(totalDias / 7);
  var resto        = totalDias % 7;
  var diasHabiles  = semCompletas * 5;

  var diaSemanaInicio = inicio.getDay(); // 0=dom
  for (var d = 0; d < resto; d++) {
    var dia = (diaSemanaInicio + d) % 7;
    if (dia !== 0 && dia !== 6) diasHabiles++;
  }
  return diasHabiles;
}
function calcularDiasHabilesRestantes(fechaCarga) {
  if (!fechaCarga) return 8;
  var diasHabiles = calcularDiasHabilesTranscurridos(fechaCarga, new Date());
  return Math.max(0, 8 - diasHabiles);
}
function calcularPlazoTotal(semestre) {
  var semNum = parseInt(semestre) || 0;
  if (semNum >= 12) return 60;      // 3 meses
  if (semNum === 11) return 120;     // 6 meses
  if (semNum >= 7) return 240;       // 1 año
  return 365;                        // Default 1 año
}

function avalarProtocoloFase2(rowIndex, estado, motivo, evaluador, emailEvaluador, fechaComite, observaciones, emailCoord) {
  var sheet = getSheet("Fase2");
  if (!sheet) {
    return { success: false, error: "Hoja Fase2 no encontrada" };
  }
 
  if (rowIndex < 2) {
    return { success: false, error: "Índice de fila inválido" };
  }
 
  var ri = rowIndex;
  var hoy_str = hoy();
  var estadoAnteriorF2 = String(sheet.getRange(ri, 9).getValue() || "");
  var numRadAv = String(sheet.getRange(ri, 2).getValue() || "").trim();

  try {
    // Escribe en las COLUMNAS CORRECTAS
    sheet.getRange(ri, 7).setValue(evaluador || "");
    sheet.getRange(ri, 8).setValue(fechaComite || "");
    sheet.getRange(ri, 9).setValue(estado || "");
    sheet.getRange(ri, 10).setValue(hoy_str);
    sheet.getRange(ri, 11).setValue(motivo || observaciones || "");
    sheet.getRange(ri, 14).setValue(emailCoord || "");

    // ← NUEVO: Actualizar estado en Fase1
    var numRad = String(sheet.getRange(ri, 2).getValue() || "").trim();
    var sheetF1 = getSheet("Fase1");
    if (sheetF1 && numRad) {
      var dataF1 = sheetF1.getDataRange().getValues();
      for (var i = 1; i < dataF1.length; i++) {
        if (String(dataF1[i][1] || "").trim() === numRad) {
          // Mapear estado de Fase2 a Fase1
          var estadoF1 = "";
          if (estado === "Aprobado" || estado === "Aprobado Directo") {
            estadoF1 = "Aprobado";
          } else if (estado === "Devuelto" || estado === "Devuelto por Comité Técnico") {
            estadoF1 = "Devuelto por Comité Técnico";
          } else {
            estadoF1 = "Pendiente Comité Técnico";
          }
          sheetF1.getRange(i + 1, 33).setValue(estadoF1);
          Logger.log("Actualizó Fase1 fila " + (i+1) + " a " + estadoF1);
          break;
        }
      }
    }
 
    registrarHistorial(numRadAv, "FASE2", "AVALAR_PROTOCOLO_FASE2", estadoAnteriorF2, estado || "", emailCoord || "", motivo || observaciones || "", "Evaluador: " + (evaluador || "") + " | FechaComité: " + (fechaComite || ""));
    return { success: true, message: "Protocolo evaluado correctamente" };
  } catch (e) {
    return { success: false, error: "Error al guardar: " + e.message };
  }
}

// ===== FUNCIONES AUXILIARES (déjalas igual si ya existen) =====
 
function obtenerDatosEstudiante(emailEstudiante, sesion) {
  if (!sesion) return { success: false, error: "No autorizado" };
  var em = String(emailEstudiante || "").trim().toLowerCase();
  if (!em) return { success: false, error: "Email requerido" };
  if (sesion.rol === "estudiante") {
    if (em !== String(sesion.email || "").trim().toLowerCase()) {
      return { success: false, error: "No autorizado" };
    }
  } else if (!sesionEsCoordinadoraOAsistente(sesion)) {
    return { success: false, error: "No autorizado" };
  }
  var sheet = getSheet("Fase1");
  if (!sheet) return { success: false, error: "Hoja no encontrada" };
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var email = String(data[i][2] || "").trim();
    
    if (email.toLowerCase() === em) {
      return {
        success: true,
        estudiante: {
          numeroRadicacion: String(data[i][1] || ""),
          titulo: String(data[i][21] || ""),
          modalidad: String(data[i][22] || ""),
          area: String(data[i][23] || ""),
          tutor1Nombre: String(data[i][24] || ""),
          tutor2Nombre: String(data[i][28] || ""),
          estado: String(data[i][32] || ""),
          fechaRadicacion: String(data[i][33] || ""),
          fechaAprobacion: String(data[i][34] || ""),
          notas: String(data[i][35] || "")
        }
      };
    }
  }
  
  return { success: false, error: "Estudiante no encontrado" };
}

function repararEstadosFase1() {
  var sheetF1 = getSheet("Fase1");
  var sheetF2 = getSheet("Fase2");
  
  if (!sheetF1 || !sheetF2) return { success: false, error: "Hojas no encontradas" };
  
  var dataF1 = sheetF1.getDataRange().getValues();
  var dataF2 = sheetF2.getDataRange().getValues();
  
  var contados = 0;
  
  for (var j = 1; j < dataF2.length; j++) {
    var numRad = String(dataF2[j][1] || "").trim();
    var estadoF2 = String(dataF2[j][8] || "").trim();
    
    if (!numRad || !estadoF2) continue;
    
    for (var i = 1; i < dataF1.length; i++) {
      if (String(dataF1[i][1] || "").trim() === numRad) {
        var estadoF1 = "";
        if (estadoF2 === "Aprobado" || estadoF2 === "Aprobado Directo") {
          estadoF1 = "Aprobado";
        } else if (estadoF2 === "Devuelto" || estadoF2 === "Devuelto por Comité Técnico") {
          estadoF1 = "Devuelto por Comité Técnico";
        } else if (estadoF2 === "Cargado" || estadoF2 === "Pendiente Comité") {
          estadoF1 = "Pendiente Comité Técnico";
        }
        
        if (estadoF1) {
          sheetF1.getRange(i + 1, 33).setValue(estadoF1);
          Logger.log(numRad + " → " + estadoF1);
          contados++;
        }
        break;
      }
    }
  }
  
  return { success: true, mensaje: "Reparadas " + contados + " radicaciones" };
}
function registrarDecisionComite(rowIndex, estado, motivo, emailEvaluador, evaluador, numeroActa, avalCCEB, observaciones) {
  var sheet = getSheet("Fase2");
  if (!sheet) return { success: false, error: "Hoja Fase2 no encontrada" };

  var ri = parseInt(rowIndex);
  var estadoAnteriorF2dc = String(sheet.getRange(ri, 9).getValue() || "");
  var estadoComite = (estado === "Devuelto") ? "Devuelto por Comité Técnico" : estado;
  var evaluadorFinal = String(evaluador || "").trim() || String(sheet.getRange(ri, 7).getValue() || "").trim();
  
  // Columna Q (17) = Número de Acta
  // Columna R (18) = Aval CCEB
  
  sheet.getRange(ri, 17).setValue(numeroActa || "");  // Q = Número Acta
  sheet.getRange(ri, 18).setValue(avalCCEB || "");    // R = Aval CCEB
  
  // También actualiza el estado si es necesario
  sheet.getRange(ri, 9).setValue(estadoComite || "");  // I = Estado
  sheet.getRange(ri, 7).setValue(evaluadorFinal || ""); // G = Evaluador
  sheet.getRange(ri, 11).setValue(motivo || observaciones || "");  // K = Observaciones
  
  // Actualizar Fase1 también
  var numRad = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var sheetF1 = getSheet("Fase1");
  if (sheetF1 && numRad) {
    var dataF1 = sheetF1.getDataRange().getValues();
    for (var i = 1; i < dataF1.length; i++) {
      if (String(dataF1[i][1] || "").trim() === numRad) {
        var estadoF1 = "";
        if (estadoComite === "Aprobado" || estadoComite === "Aprobado Directo") {
          estadoF1 = "Aprobado";
        } else if (estadoComite === "Devuelto" || estadoComite === "Devuelto por Comité Técnico") {
          estadoF1 = "Devuelto por Comité Técnico";
        } else {
          estadoF1 = "Pendiente Comité Técnico";
        }
        sheetF1.getRange(i + 1, 33).setValue(estadoF1);
        notificarCambioEstado(i + 1, estadoF1, { notas: motivo });
        break;
      }
    }
  }
  registrarHistorial(numRad, "FASE2", "REGISTRAR_DECISION_COMITE", estadoAnteriorF2dc, estadoComite || "", emailEvaluador || evaluadorFinal || "", motivo || observaciones || "", "Acta: " + (numeroActa || "") + " | AvalCCEB: " + (avalCCEB || ""));
  return { success: true, message: "Decisión registrada" };
}

function completarFase3(rowIndex, nota, numeroActa, producto, descripcion, emailCoord) {
  var sheet = getSheetFase3();
  if (!sheet) return { success: false, error: "Hoja Fase 3 no encontrada" };

  var ri = parseInt(rowIndex, 10);
  if (!esFilaValidaParaModificarFase3(sheet, ri)) {
    return { success: false, error: "Fila de Fase 3 inválida" };
  }
  var notaNum = parseFloat(nota);
  if (isNaN(notaNum) || notaNum < 0 || notaNum > 5) return { success: false, error: "Nota inválida" };

  sheet.getRange(ri, 23).setValue(notaNum);
  sheet.getRange(ri, 22).setValue(numeroActa || "");
  sheet.getRange(ri, 24).setValue(producto || "NO");
  sheet.getRange(ri, 25).setValue(descripcion || "");
  sheet.getRange(ri, 26).setValue(hoy());

  var numero = String(sheet.getRange(ri, 2).getValue() || "").trim();
  var estadoFinal = notaNum >= 3 ? "Sustentado" : "Reprobado";
  var j1Nombre = String(sheet.getRange(ri, 14).getValue() || "");
  var j1Email  = String(sheet.getRange(ri, 16).getValue() || "");
  var j2Nombre = String(sheet.getRange(ri, 17).getValue() || "");
  var j2Email  = String(sheet.getRange(ri, 19).getValue() || "");

  var sheetF1 = getSheet("Fase1");
  if (sheetF1) {
    var dataF1 = sheetF1.getDataRange().getValues();
    for (var i = 1; i < dataF1.length; i++) {
      if (String(dataF1[i][1] || "").trim() === numero) {
        sheetF1.getRange(i + 1, 33).setValue(estadoFinal);
        notificarCambioEstado(i + 1, estadoFinal, {
          nota: notaNum, acta: numeroActa,
          j1Nombre: j1Nombre, j1Email: j1Email,
          j2Nombre: j2Nombre, j2Email: j2Email
        });
        break;
      }
    }
  }
  registrarTrazabilidadSustentacion(
    numero,
    ri,
    "RESULTADO_FINAL",
    estadoFinal,
    emailCoord,
    "Nota: " + notaNum + " | Acta: " + (numeroActa || "") + " | Producto: " + (producto || "NO")
  );
  registrarAuditoria(emailCoord, "COMPLETAR_FASE3", numero + " | Nota: " + notaNum);
  registrarHistorial(numero, "FASE3", "COMPLETAR_FASE3", "", estadoFinal, emailCoord || "", "", "Nota: " + notaNum + " | Acta: " + (numeroActa || "") + " | Producto: " + (producto || "NO"));
  return { success: true };
}

/**
 * Registra el resultado final de un Diplomado (acta + nota) después de aprobación del Comité Técnico.
 * Crea una fila en Fase 3 con los datos mínimos y actualiza Fase 1 a Sustentado/Reprobado.
 */
/**
 * Registra el resultado final de un Diplomado (nota + acta) almacenando los datos
 * directamente en Fase 1 (cols 53-55). Estado final: "Completado".
 * No usa Fase 3, ya que el Diplomado no tiene sustentación.
 */
function registrarResultadoDiplomado(rowIndexF1, nota, numeroActa, sesion) {
  if (!sesion || sesion.rol !== "coordinadora") {
    return { success: false, error: "No autorizado" };
  }
  var notaNum = parseFloat(nota);
  if (isNaN(notaNum) || notaNum < 0 || notaNum > 5) {
    return { success: false, error: "Nota inválida (debe ser 0–5)" };
  }
  if (!numeroActa || String(numeroActa).trim() === "") {
    return { success: false, error: "El número de acta es obligatorio" };
  }

  var sheetF1 = getSheet("Fase1");
  if (!sheetF1) return { success: false, error: "Hoja Fase1 no encontrada" };
  asegurarColumnasFase1DiplomadoJurados(sheetF1);

  var ri = parseInt(rowIndexF1, 10);
  var dataF1 = sheetF1.getDataRange().getValues();
  var rowData = dataF1[ri - 1];
  if (!rowData) return { success: false, error: "Fila Fase 1 no encontrada" };

  var numero       = String(rowData[1]  || "").trim();
  var modalidad    = String(rowData[22] || "").trim().toLowerCase();
  var estadoActual = String(rowData[32] || "").trim();

  if (!modalidad.includes("diplomado") && !modalidad.includes("diplom")) {
    return { success: false, error: "Esta radicación no es de modalidad Diplomado" };
  }
  if (estadoActual !== "Aprobado") {
    return { success: false, error: "La radicación debe estar en estado Aprobado para registrar el resultado" };
  }

  // Guardar nota, acta y fecha en cols 53, 54, 55 de Fase 1
  sheetF1.getRange(ri, 53).setValue(notaNum);
  sheetF1.getRange(ri, 54).setValue(String(numeroActa).trim());
  sheetF1.getRange(ri, 55).setValue(hoy());

  // Cambiar estado a "Completado" (estado propio de Diplomado)
  sheetF1.getRange(ri, 33).setValue("Completado");
  notificarCambioEstado(ri, "Completado", { nota: notaNum, acta: numeroActa });

  registrarAuditoria(sesion.email || "", "RESULTADO_DIPLOMADO", numero + " | Nota: " + notaNum + " | Acta: " + numeroActa);
  registrarHistorial(numero, "DIPLOMADO", "RESULTADO_DIPLOMADO", estadoActual, "Completado", sesion.email || "", "", "Nota: " + notaNum + " | Acta: " + numeroActa);

  return { success: true, estadoFinal: "Completado" };
}

function testSistema() {
  var r1 = loginUsuario("estudiante@usc.edu.co", "tu_contraseña");
  Logger.log("LOGIN: " + JSON.stringify(r1));
  
  var r2 = obtenerFase1();
  Logger.log("FASE1 total: " + (r2.radicaciones ? r2.radicaciones.length : "ERROR"));
  
  var r3 = listaFase3Completa();
  Logger.log("FASE3 total: " + (r3 ? r3.length : "ERROR"));
  
  Logger.log("completarFase3 existe: " + (typeof completarFase3 === 'function'));
  
  var r5 = generarNumero("TEST", "Fase1");
  Logger.log("NUMERO GENERADO: " + r5);
}

// ── ESTRUCTURA DE HOJAS REQUERIDAS ───────────────────────────
// 1. Usuarios       — ID | Email | Contraseña | Nombre | Rol | FechaCreacion | Estado
// 2. Fase1 — 38 columnas base (A–AL) + extensión diplomado 39–52: fechas, jurados 41–49, esp/acuerdo 50–51, modo jurado 52.
// 3. Fase 2         — 18 columnas (ver crearProtocolo)
// 4. Acta asesoria  — 8 columnas (ver crearActasAsesoria)
// 5. Fase 3         — 34 columnas base (ver crearFase3 / listaFase3)
// 6. Tutores        — Nombre | Email | Teléfono
// 7. Evaluadores    — ID | Nombre | Email | Teléfono | Especialidad | Estado
// 8. Fecha reuniones— ID | Año | Mes | Fecha Reunión 1 | Fecha Reunión 2 | Estado
// 9. Auditorias     — ID | Fecha | Email | Accion | Detalle
