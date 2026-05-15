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
  var accionesPublicas = ['login'];
  var sesion = null;

  if (accionesPublicas.indexOf(action) === -1) {
    sesion = verificarToken(body.token);
    if (!sesion) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Sesión inválida o expirada" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var accionesCoord = ['updateEstado','validarTutores','avalarProtocoloFase2','actualizarProtocolo','aprobarActasAsesoria','registrarDecisionComite','updateFase3Estado','updateFase3Asignacion','completarFase3','repararEstadosFase1'];

    if (accionesCoord.indexOf(action) !== -1 && sesion.rol !== 'coordinadora') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No autorizado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var accionesSoloCoordLectura = ['getFase1','getTutores','getEvaluadores','getFechasComite','getEstadisticasTutores','getAlertasCriticas','getTrazabilidad'];
    if (accionesSoloCoordLectura.indexOf(action) !== -1 && sesion.rol !== 'coordinadora') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No autorizado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  try {
    switch(action) {
        case "login":                result = loginUsuario(body.email, body.password); break;
      case "createRadicacion":     result = crearRadicacion(body.datos, body.emailEstudiante, sesion); break;
      case "getFase1":             result = obtenerFase1(); break;
      case "getFase1ByEmail":      result = obtenerFase1PorEmail(body.email, sesion); break;
      case "obtenerDatosEstudiante": result = obtenerDatosEstudiante(body.email, sesion); break;
      case "updateEstado":         result = actualizarEstado(body.rowIndex, body.estado, body.notas, body.emailCoord); break;
      case "validarTutores":       result = validarTutores(body.rowIndex, body.tutor1, body.tutor2, body.observaciones, body.emailCoord); break;
      case "getTutores":           result = obtenerTutores(); break;
      case "getEvaluadores":       result = obtenerEvaluadores(); break;
      case "getFechasComite":      result = obtenerFechasComite(); break;
      case "subirArchivo":         result = subirArchivoAutorizado(body.base64, body.nombreArchivo, body.tipoArchivo, body.subcarpeta, sesion); break;
      case "crearProtocolo":       result = crearProtocolo(body.numeroRadicacion, body.emailEstudiante, body.nombreArchivo, body.urlArchivo, body.anexoCambio, body.observaciones, sesion); break;
      case "getFase2":             result = obtenerFase2(sesion); break;
      case "avalarProtocoloFase2": result = avalarProtocoloFase2(body.rowIndex, body.estado, body.motivo, body.evaluador, body.emailEvaluador, body.fechaComite, body.observaciones, body.emailCoord); break;
      case "registrarDecisionComite": result = registrarDecisionComite(body.rowIndex, body.estado, body.motivoDevoluccion, body.emailEvaluador, body.evaluador, body.numeroActa, body.avalCCEB, body.observaciones); break;
      case "actualizarProtocolo":  result = actualizarEstadoProtocolo(body.rowIndex, body.estado, body.evaluador, body.emailEvaluador, body.fechaReunion, body.decision, body.motivo, body.emailCoord); break;
      case "crearActasAsesoria":   result = crearActasAsesoria(body.numeroRadicacion, body.emailEstudiante, body.nombreArchivo, body.base64, body.observaciones, sesion); break;
      case "getActasAsesoria":     result = obtenerActasAsesoria(sesion); break;
      case "getEstadisticasTutores": result = obtenerEstadisticasTutores(); break;
      case "getAlertasCriticas": result = obtenerAlertasCriticas(); break;
      case "getTrazabilidad":    result = obtenerTrazabilidad(sesion, body.numeroRadicacion, body.limit); break;
      case "aprobarActasAsesoria": result = aprobarActasAsesoria(body.rowIndex, body.emailEstudiante, body.emailCoord, body.rechazar, body.motivo); break;
      case "crearFase3": result = crearFase3(body.numeroRadicacion, body.emailEstudiante, body.porcentajeTurnitin, body.jurado1Nombre, body.jurado1Email, body.jurado1Telefono, body.jurado2Nombre, body.jurado2Email, body.jurado2Telefono, body.anexoA7, body.articulo, body.guiaAutores, body.avalCCEB, body.turnitinDoc, sesion); break;
      case "getFase3":             result = obtenerFase3(sesion, { sinDedupe: body.sinDedupe === true, debugFase3: body.debugFase3 === true }); break;
      case "updateFase3Estado": result = updateFase3Estado(body.rowIndex, body.estado, body.observaciones, body.emailCoord); break;
      case "updateFase3Asignacion": result = updateFase3Asignacion(body.rowIndex, body.fechaSustentacion, body.horaSustentacion, body.lugar, body.jurado1, body.jurado2, body.emailCoord); break;
      case "completarFase3":       result = completarFase3(body.rowIndex, body.nota, body.numeroActa, body.producto, body.descripcion, body.emailCoord); break;
      case "repararEstadosFase1":  result = repararEstadosFase1(); break;
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
  if (sheet.getMaxColumns() < 32) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 32 - sheet.getMaxColumns());
  }
  if (!sheet.getRange(1, 29).getValue()) sheet.getRange(1, 29).setValue("Estado Solicitud");
  if (!sheet.getRange(1, 30).getValue()) sheet.getRange(1, 30).setValue("Observaciones Estado");
  if (!sheet.getRange(1, 31).getValue()) sheet.getRange(1, 31).setValue("Jurado 1 Tel");
  if (!sheet.getRange(1, 32).getValue()) sheet.getRange(1, 32).setValue("Jurado 2 Tel");
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

function obtenerTrazabilidad(sesion, numeroRadicacion, limit) {
  if (!sesion || sesion.rol !== "coordinadora") {
    return { success: false, error: "No autorizado" };
  }
  var sheet = getSheet("Trazabilidad");
  if (!sheet) return { success: true, registros: [] };
  var data = sheet.getDataRange().getValues();
  var max = parseInt(limit, 10);
  if (isNaN(max) || max <= 0) max = 200;
  if (max > 1000) max = 1000;
  var numeroFiltro = String(numeroRadicacion || "").trim().toUpperCase();
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
  
  // Invalidar sesiones anteriores del mismo usuario
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || "").toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, 7).setValue("inactivo");
    }
  }
  
  var token = generarToken();
  var ahora = new Date();
  var expiracion = new Date(ahora.getTime() + 8 * 60 * 60 * 1000); // 8 horas
  
  sheet.appendRow([
    sheet.getLastRow(),
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

  var msgEst = "", msgCoord = "", msgT1 = "", msgT2 = "", msgJ1 = "", msgJ2 = "";

  if (estado === "Radicado") {
    msgEst   = "Tu proyecto ha sido radicado exitosamente.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nLa coordinadora revisará tus tutores pronto. Te notificaremos cuando haya novedades.";
    msgCoord = "Nueva radicación recibida.\n\nNúmero: " + numero + "\nEstudiante: " + nombre1 + "\nTítulo: " + titulo + "\n\nPendiente revisión de tutores.";
   var nombre2 = String(sheet.getRange(ri, 11).getValue() || "");
var nombre3 = String(sheet.getRange(ri, 17).getValue() || "");
msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nHas sido registrado como tutor del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\n--- ESTUDIANTE(S) ---\nEstudiante 1: " + nombre1 + " · Cédula: " + sheet.getRange(ri, 4).getValue() + " · Email: " + sheet.getRange(ri, 6).getValue() + " · Teléfono: " + sheet.getRange(ri, 7).getValue() + " · Semestre: " + sheet.getRange(ri, 8).getValue() + (nombre2 ? "\n\nEstudiante 2: " + nombre2 + " · Cédula: " + sheet.getRange(ri, 10).getValue() + " · Email: " + sheet.getRange(ri, 12).getValue() + " · Teléfono: " + sheet.getRange(ri, 13).getValue() + " · Semestre: " + sheet.getRange(ri, 14).getValue() : "") + (nombre3 ? "\n\nEstudiante 3: " + nombre3 + " · Cédula: " + sheet.getRange(ri, 16).getValue() + " · Email: " + sheet.getRange(ri, 18).getValue() + " · Teléfono: " + sheet.getRange(ri, 19).getValue() + " · Semestre: " + sheet.getRange(ri, 20).getValue() : "") + "\n\nLa coordinadora confirmará tu vinculación pronto." : "";
   msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nHas sido registrado como tutor del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\n--- ESTUDIANTE(S) ---\nEstudiante 1: " + nombre1 + " · Cédula: " + sheet.getRange(ri, 4).getValue() + " · Email: " + sheet.getRange(ri, 6).getValue() + " · Teléfono: " + sheet.getRange(ri, 7).getValue() + " · Semestre: " + sheet.getRange(ri, 8).getValue() + (nombre2 ? "\n\nEstudiante 2: " + nombre2 + " · Cédula: " + sheet.getRange(ri, 10).getValue() + " · Email: " + sheet.getRange(ri, 12).getValue() + " · Teléfono: " + sheet.getRange(ri, 13).getValue() + " · Semestre: " + sheet.getRange(ri, 14).getValue() : "") + (nombre3 ? "\n\nEstudiante 3: " + nombre3 + " · Cédula: " + sheet.getRange(ri, 16).getValue() + " · Email: " + sheet.getRange(ri, 18).getValue() + " · Teléfono: " + sheet.getRange(ri, 19).getValue() + " · Semestre: " + sheet.getRange(ri, 20).getValue() : "") + "\n\nLa coordinadora confirmará tu vinculación pronto." : "";
  }
  else if (estado === "Tutores Avalados") {
    msgEst   = "¡Buenas noticias! Tus tutores han sido avalados por la coordinadora.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nYa puedes cargar tus actas de asesoría desde el portal.";
    msgCoord = "Tutores avalados para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo;
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nTu vinculación como tutor ha sido confirmada para el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nTu vinculación como tutor ha sido confirmada para el proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero : "";
  }
  else if (estado === "Fase 2 Desbloqueada") {
    msgEst   = "¡Tus actas de asesoría fueron aprobadas!\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nYa puedes ingresar al portal y subir tu protocolo en la Fase 2.";
    msgCoord = "Actas aprobadas para " + numero + ".\n\nEstudiante: " + nombre1 + "\nEl estudiante ya puede subir su protocolo.";
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nLas actas de asesoría del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nHan sido aprobadas. El estudiante procederá con la Fase 2." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nLas actas de asesoría del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nHan sido aprobadas. El estudiante procederá con la Fase 2." : "";
  }
  else if (estado === "Pendiente Comité Técnico") {
    msgEst   = "Tu protocolo fue recibido correctamente.\n\nNúmero: " + numero + "\nTítulo: " + titulo + "\n\nEstá pendiente de evaluación por el comité técnico. Te notificaremos cuando haya una decisión.";
    msgCoord = "Nuevo protocolo recibido para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo + "\n\nPendiente asignación de evaluador y fecha de comité.";
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nEstá en revisión por el comité técnico." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nEstá en revisión por el comité técnico." : "";
  }
  else if (estado === "Aprobado") {
    msgEst   = "¡Felicitaciones! Tu protocolo fue aprobado por el comité técnico.\n\nNúmero: " + numero + "\nTítulo: " + titulo + (notas ? "\n\nObservaciones: " + notas : "") + "\n\nYa puedes solicitar tu sustentación desde el portal.";
    msgCoord = "Protocolo aprobado para " + numero + ".\n\nEstudiante: " + nombre1 + "\nTítulo: " + titulo;
    msgT1    = t1Nombre ? "Hola " + t1Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue aprobado por el comité técnico. El estudiante procederá con la sustentación." : "";
    msgT2    = t2Nombre ? "Hola " + t2Nombre + ",\n\nEl protocolo del proyecto:\n\n\"" + titulo + "\"\nNúmero: " + numero + "\n\nFue aprobado por el comité técnico. El estudiante procederá con la sustentación." : "";
  }
  else if (estado === "Devuelto por Comité Técnico") {
    msgEst   = "Tu protocolo fue devuelto por el Comité Técnico para una nueva valoración.\n\nNúmero: " + numero + "\nTítulo: " + titulo + (notas ? "\n\nMotivo: " + notas : "") + "\n\nRealiza los ajustes indicados y vuelve a cargar el protocolo desde la Fase 2 del portal.";
    msgCoord = "Protocolo devuelto por Comité Técnico para " + numero + ".\n\nEstudiante: " + nombre1 + (notas ? "\nMotivo: " + notas : "");
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
function loginUsuario(email, password) {
  if (!email || !password) return { success: false, error: "Credenciales incompletas" };
  var sheet = getSheet("Usuarios");
  if (!sheet) return { success: false, error: "Hoja Usuarios no encontrada" };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var rowEmail  = String(data[i][1] || "").trim().toLowerCase();
    var rowPass   = String(data[i][2] || "").trim();
    var rowNombre = String(data[i][3] || "").trim();
    var rowRol    = String(data[i][4] || "").trim().toLowerCase();
    var rowEstado = String(data[i][6] || "").trim().toLowerCase();
    if (rowEstado === "inactivo") continue;
    if (rowEmail === email.trim().toLowerCase() && rowPass === password) {
      registrarAuditoria(email, "LOGIN", "Acceso exitoso · rol: " + rowRol);
      var token = crearSesion(rowEmail, rowRol);
      if (!token) {
        return { success: false, error: "No se pudo crear la sesión. Cree una pestaña «Sesiones» en el libro o revise permisos del script sobre el archivo." };
      }
      return { success: true, user: { id: i+1, email: rowEmail, rol: rowRol, nombre: rowNombre }, token: token };
      }
  }
  registrarAuditoria(email, "LOGIN_FAIL", "Credenciales incorrectas");
  return { success: false, error: "Credenciales incorrectas" };
}
function verificarRol(email, rolRequerido) {
  if (!email) return false;
  var sheet = getSheet("Usuarios");
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var rowEmail  = String(data[i][1] || "").trim().toLowerCase();
    var rowRol    = String(data[i][4] || "").trim().toLowerCase();
    var rowEstado = String(data[i][6] || "").trim().toLowerCase();
    if (rowEstado === "inactivo") continue;
    if (rowEmail === email.trim().toLowerCase() && rowRol === rolRequerido) {
      return true;
    }
  }
  return false;
}

// ── FASE 1: RADICACIÓN ───────────────────────────────────────
// Hoja Fase1 (38 columnas):
// A(1)=ID | B(2)=Número Radicación | C(3)=Email Estudiante
// D(4)=Cédula1 | E(5)=Nombre1 | F(6)=Email1 | G(7)=Teléfono1 | H(8)=Semestre1 | I(9)=Semillero1
// J(10)=Cédula2 | K(11)=Nombre2 | L(12)=Email2 | M(13)=Teléfono2 | N(14)=Semestre2 | O(15)=Semillero2
// P(16)=Cédula3 | Q(17)=Nombre3 | R(18)=Email3 | S(19)=Teléfono3 | T(20)=Semestre3 | U(21)=Semillero3
// V(22)=Título | W(23)=Modalidad | X(24)=Área
// Y(25)=Tutor1Nombre | Z(26)=Tutor1Email | AA(27)=Tutor1Tel | AB(28)=Tutor1Relacion
// AC(29)=Tutor2Nombre | AD(30)=Tutor2Email | AE(31)=Tutor2Tel | AF(32)=Tutor2Relacion
// AG(33)=Estado | AH(34)=FechaRadicación | AI(35)=FechaAprobación
// AJ(36)=Notas | AK(37)=AprobadoPor | AL(38)=DiasRestantes

function crearRadicacion(datos, emailEstudiante, sesion) {
  if (!sesion || sesion.rol !== "estudiante") {
    return { success: false, error: "No autorizado" };
  }
  if (String(emailEstudiante || "").trim().toLowerCase() !== String(sesion.email || "").trim().toLowerCase()) {
    return { success: false, error: "No autorizado" };
  }
  if (!datos) return { success: false, error: "Datos vacíos" };
  var sheet  = getSheet("Fase1");
  if (!sheet) return { success: false, error: "Hoja Fase1 no encontrada" };
  var numero = generarNumero("CTTG", "Fase1");
  var fecha  = hoy();
  var nuevoId = sheet.getLastRow();

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
    ""                          // 38 Días Restantes
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
    diasRestantes:   String(r[37] || "")
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
function actualizarEstado(rowIndex, estado, notas, emailCoord) {
  var sheet = getSheet("Fase1");
  var ri    = parseInt(rowIndex);
  var numeroRad = String(sheet.getRange(ri, 2).getValue() || "").trim();
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
      if (String(dataFase2[k][1]) === numero && String(dataFase2[k][9]) === 'Cargado') {
        var diasDesdeProto = calcularDiasHabilesTranscurridos(dataFase2[k][5], new Date());
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
  sheet.getRange(ri, 33).setValue("Tutores Avalados");
  notificarCambioEstado(ri, "Tutores Avalados", {});
  registrarAuditoria(emailCoord, "VALIDAR_TUTORES", numeroRad + " | Fila " + rowIndex);
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
  if (!sesion || (sesion.rol !== "coordinadora" && sesion.rol !== "estudiante")) {
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
      motivoDevolucio: String(r[10] || ""),
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
  if (sesion.rol === "estudiante") {
    var em = String(sesion.email || "").trim().toLowerCase();
    protocolos = protocolos.filter(function(p) {
      return String(p.emailEstudiante || "").trim().toLowerCase() === em;
    });
  } else if (sesion.rol !== "coordinadora") {
    return { success: false, error: "No autorizado" };
  }
  return { success: true, protocolos: protocolos };
}
function actualizarEstadoProtocolo(rowIndex, estado, evaluador, emailEvaluador, fechaReunion, decision, motivo, emailCoord) {
  var sheet = getSheet("Fase2");
  var ri = parseInt(rowIndex);

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
  } else if (sesion.rol !== "coordinadora") {
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
  return { success: true };
} 
// ── FASE 3: SUSTENTACIÓN ─────────────────────────────────────
// Hoja Fase 3 (32 columnas): cols 1–30 como antes; AE(31)=Jurado 1 Tel; AF(32)=Jurado 2 Tel.

function crearFase3(numeroRadicacion, emailEstudiante, porcentajeTurnitin, jurado1Nombre, jurado1Email, jurado1Telefono, jurado2Nombre, jurado2Email, jurado2Telefono, anexoA7, articulo, guiaAutores, avalCCEB, turnitinDoc, sesion) {
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
    jurado1Nombre || "",      // 14 Jurado 1 Nombre
    "",                       // 15 Jurado 1 Cédula
    jurado1Email || "",       // 16 Jurado 1 Email
    jurado2Nombre || "",      // 17 Jurado 2 Nombre
    "",                       // 18 Jurado 2 Cédula
    jurado2Email || "",       // 19 Jurado 2 Email
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
    jurado1Telefono || "",    // 31 Jurado 1 Tel
    jurado2Telefono || ""     // 32 Jurado 2 Tel
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
  var numCols = Math.min(Math.max(lcSheet, lcDr, 32), 64, maxColsSheet);
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
     jurado1Telefono:   String(r[14] || ""),   // col O = teléfono jurado 1
      jurado1Email:      String(r[15] || ""),
      jurado2Nombre:     String(r[16] || ""),
      jurado2Telefono:   String(r[17] || ""),   // col R = teléfono jurado 2
      jurado2Email:      String(r[18] || ""),
      jurado1Especialidad: String(r[30] || ""), // col AE = especialidad jurado 1
      jurado2Especialidad: String(r[31] || ""), // col AF = especialidad jurado 2
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
      motivoDevolucion:  String(r[28] || "") === "Solicitud sustentación devuelta" ? String(r[29] || "") : ""
    });
  }
  return fase3;
}

/** Una solicitud por número de radicación (la fila más reciente si hay duplicados). */
function listaFase3Completa() {
  return dedupeFase3PorRadicacion(listaFase3TodasLasFilasSinDedupe());
}

function obtenerFase3(sesion, opciones) {
  if (!sesion) return { success: false, error: "Sesión requerida" };
  opciones = opciones || {};
  var sinDedupe = opciones.sinDedupe === true && sesion.rol === "coordinadora";
  var fase3 = sinDedupe ? listaFase3TodasLasFilasSinDedupe() : listaFase3Completa();
  if (sesion.rol === "estudiante") {
    var em = String(sesion.email || "").trim().toLowerCase();
    fase3 = fase3.filter(function(s) {
      return String(s.emailEstudiante || "").trim().toLowerCase() === em;
    });
  } else if (sesion.rol !== "coordinadora") {
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
    var numColsDbg = Math.min(Math.max(lcSh, lcDr2, 32), 64, maxColsDbg);
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
  sheet.getRange(ri, 4).setValue(fechaSustentacion  || "");  // col D = Fecha Sustentación
  sheet.getRange(ri, 21).setValue(fechaSustentacion || "");  // col U = Fecha Asignada
  sheet.getRange(ri, 27).setValue(horaSustentacion  || "");  // col AA = Hora
  sheet.getRange(ri, 28).setValue(lugar || "");  // col AB = Lugar

  if (jurado1) {
    sheet.getRange(ri, 14).setValue(jurado1.nombre || "");
    sheet.getRange(ri, 15).setValue(jurado1.cedula || "");
    sheet.getRange(ri, 16).setValue(jurado1.email  || "");
    sheet.getRange(ri, 31).setValue(jurado1.telefono || "");
  }
  if (jurado2) {
    sheet.getRange(ri, 17).setValue(jurado2.nombre || "");
    sheet.getRange(ri, 18).setValue(jurado2.cedula || "");
    sheet.getRange(ri, 19).setValue(jurado2.email  || "");
    sheet.getRange(ri, 32).setValue(jurado2.telefono || "");
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
    
    for (var i = 1; i < data.length; i++) {
      var numero = String(data[i][1] || "").trim();
      var estudiante = String(data[i][4] || "").trim();
      var estado = String(data[i][32] || "").trim();
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
        alertas.push({tipo: "critico", numero: numero, estudiante: estudiante, estado: estado, plazo: diasRestantes + " días", detalles: pct + "% del plazo cumplido", rowIndex: i + 1});
      }
      if (semestre >= 12) {
        alertas.push({tipo: "s12", numero: numero, estudiante: estudiante, estado: estado, plazo: "S" + semestre, detalles: "Semestre " + semestre, rowIndex: i + 1});
      }
      if (!tutor1 && fechaRad) {
        var diasDes = Math.floor((new Date() - new Date(fechaRad)) / 86400000);
        if (diasDes > 7) {
          alertas.push({tipo: "gestion", numero: numero, estudiante: estudiante, estado: "Radicado", plazo: diasDes + " días", detalles: "Tutor sin asignar", rowIndex: i + 1});
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
        var fechaCargaF2 = dataFase2[j][5];
        
        if (estFase2 === "Cargado" && fechaCargaF2) {
          var diasHabiles = calcularDiasHabiles(fechaCargaF2, new Date());
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
  } else if (sesion.rol !== "coordinadora") {
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
  return { success: true };
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
// 2. Fase1 — 38 columnas (índice fila JS r[0]…r[37] = columnas A…AL). Igual que hoja vinculada en Excel:
//    A id | B numero | C emailEstudiante | D cedula1 | E nombre1 | F email1 | G telefono1 | H semestre1
//    | I semillero1 | J cedula2 | K nombre2 | L email2 | M telefono2 | N semestre2 | O semillero2
//    | P cedula3 | Q nombre3 | R email3 | S telefono3 | T semestre3 | U semillero3 | V titulo | W modalidad
//    | X area | Y tutor1Nombre | Z tutor1Email | AA tutor1Telefono | AB tutor1Relacion | AC tutor2Nombre
//    | AD tutor2Email | AE tutor2Telefono | AF tutor2Relacion | AG estado | AH fechaRadicacion
//    | AI fechaAprobacion | AJ notas | AK aprobadoPor | AL diasRestantes
// 3. Fase 2         — 18 columnas (ver crearProtocolo)
// 4. Acta asesoria  — 8 columnas (ver crearActasAsesoria)
// 5. Fase 3         — 28 columnas (ver crearFase3)
// 6. Tutores        — Nombre | Email | Teléfono
// 7. Evaluadores    — ID | Nombre | Email | Teléfono | Especialidad | Estado
// 8. Fecha reuniones— ID | Año | Mes | Fecha Reunión 1 | Fecha Reunión 2 | Estado
// 9. Auditorias     — ID | Fecha | Email | Accion | Detalle
