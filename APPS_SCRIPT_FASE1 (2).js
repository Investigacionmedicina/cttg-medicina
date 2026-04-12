// CTTG MEDICINA - APPS SCRIPT BACKEND
// Versión 1.0 - Fase 1 (Radicación)
// Última actualización: 2025-04-12

const SHEET_ID = "1CewMoPY9ng03fJ5nqEyylNzLAHZPlUtA86xzQeUl-pg";
const COORDINADORA_EMAIL = "investigacionmedicina@usc.edu.co";

// ============================================
// MAIN HANDLERS
// ============================================

function doGet(e) {
  return handleRequest(e, null);
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    Logger.log("Error parsing JSON: " + err);
  }
  return handleRequest(e, body);
}

// ============================================
// REQUEST ROUTER
// ============================================

function handleRequest(e, body) {
  try {
    var action = (body && body.action) ? body.action : (e.parameter.action || "");
    
    if (!action) {
      return createResponse({success: false, error: "No action specified"});
    }

    Logger.log("Action: " + action);

    // AUTENTICACIÓN
    if (action === "login") {
      return actionLogin(body);
    }
    
    // FASE 1 - RADICACIÓN
    if (action === "createRadicacion") {
      return actionCreateRadicacion(body);
    }
    
    if (action === "getRadicacionesPendientes") {
      return actionGetRadicacionesPendientes();
    }
    
    if (action === "getRadicacionDetalle") {
      return actionGetRadicacionDetalle(body);
    }
    
    if (action === "aprobarRadicacion") {
      return actionAprobarRadicacion(body);
    }
    
    if (action === "rechazarRadicacion") {
      return actionRechazarRadicacion(body);
    }

    return createResponse({success: false, error: "Action not found: " + action});

  } catch(error) {
    Logger.log("Error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// AUTENTICACIÓN
// ============================================

function actionLogin(body) {
  try {
    if (!body || !body.email || !body.password) {
      return createResponse({success: false, error: "Email and password required"});
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var usuariosSheet = ss.getSheetByName("Usuarios");
    
    if (!usuariosSheet) {
      return createResponse({success: false, error: "Usuarios sheet not found"});
    }

    var data = usuariosSheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var sheetEmail = row[1];
      var sheetPassword = row[2];
      var nombre = row[3];
      var rol = row[4];

      if (sheetEmail === body.email && sheetPassword === body.password) {
        return createResponse({
          success: true,
          user: {
            email: body.email,
            nombre: nombre,
            rol: rol
          },
          message: "Login successful"
        });
      }
    }

    return createResponse({success: false, error: "Invalid email or password"});

  } catch(error) {
    Logger.log("Login error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// FASE 1 - CREAR RADICACIÓN
// ============================================

function actionCreateRadicacion(body) {
  try {
    if (!body || !body.radicacion) {
      return createResponse({success: false, error: "Radicacion data required"});
    }

    var rad = body.radicacion;
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var fase1Sheet = ss.getSheetByName("Fase1");

    if (!fase1Sheet) {
      return createResponse({success: false, error: "Fase1 sheet not found"});
    }

    // Validar campos obligatorios
    if (!rad.cedula1 || !rad.nombre1 || !rad.email1 || !rad.titulo || !rad.modalidad || !rad.area) {
      return createResponse({success: false, error: "Missing required fields (cedula, nombre, email, titulo, modalidad, area)"});
    }

    // Generar número radicación
    var numero = generarNumeroRadicacion(fase1Sheet);
    var fechaRadicacion = new Date();

    // Preparar datos para guardar (38 columnas de Fase1)
    var rowData = [
      "", // ID (auto)
      numero, // Número Radicación
      rad.emailEstudiante, // Email Estudiante
      rad.cedula1, // Cédula 1
      rad.nombre1, // Nombre 1
      rad.email1, // Email 1
      rad.telefono1, // Teléfono 1
      rad.semestre1, // Semestre 1
      rad.semillero1 || "", // Semillero 1
      rad.cedula2 || "", // Cédula 2
      rad.nombre2 || "", // Nombre 2
      rad.email2 || "", // Email 2
      rad.telefono2 || "", // Teléfono 2
      rad.semestre2 || "", // Semestre 2
      rad.semillero2 || "", // Semillero 2
      rad.cedula3 || "", // Cédula 3
      rad.nombre3 || "", // Nombre 3
      rad.email3 || "", // Email 3
      rad.telefono3 || "", // Teléfono 3
      rad.semestre3 || "", // Semestre 3
      rad.semillero3 || "", // Semillero 3
      rad.titulo, // Título
      rad.modalidad, // Modalidad
      rad.area, // Área
      rad.tutor1Nombre || "", // Tutor 1 Nombre
      rad.tutor1Email || "", // Tutor 1 Email
      rad.tutor1Telefono || "", // Tutor 1 Teléfono
      rad.tutor1Relacion || "", // Tutor 1 Relación
      rad.tutor2Nombre || "", // Tutor 2 Nombre
      rad.tutor2Email || "", // Tutor 2 Email
      rad.tutor2Telefono || "", // Tutor 2 Teléfono
      rad.tutor2Relacion || "", // Tutor 2 Relación
      "Pendiente Aprobación", // Estado
      fechaRadicacion, // Fecha Radicación
      "", // Fecha Aprobación
      "", // Notas
      "", // Aprobado Por
      "" // Dias Restantes
    ];

    // Guardar en sheet
    fase1Sheet.appendRow(rowData);

    // Enviar email de confirmación
    try {
      enviarEmailConfirmacionRadicacion(rad.email1, rad.nombre1, numero);
    } catch(emailError) {
      Logger.log("Email error: " + emailError);
      // Continuar aunque falle el email
    }

    return createResponse({
      success: true,
      numero: numero,
      mensaje: "Radicación exitosa",
      detalles: {
        numeroRadicacion: numero,
        estudiantes: 
          (rad.cedula1 ? 1 : 0) + 
          (rad.cedula2 ? 1 : 0) + 
          (rad.cedula3 ? 1 : 0)
      }
    });

  } catch(error) {
    Logger.log("Create radicacion error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// FASE 1 - LEER RADICACIONES PENDIENTES
// ============================================

function actionGetRadicacionesPendientes() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var fase1Sheet = ss.getSheetByName("Fase1");

    if (!fase1Sheet) {
      return createResponse({success: false, error: "Fase1 sheet not found"});
    }

    var data = fase1Sheet.getDataRange().getValues();
    var radicaciones = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var estado = row[32]; // Column AG (Estado)

      // Solo mostrar pendientes
      if (estado === "Pendiente Aprobación") {
        radicaciones.push({
          rowIndex: i + 1,
          numero: row[1],
          nombre1: row[4],
          email1: row[5],
          titulo: row[21],
          modalidad: row[22],
          area: row[23],
          tutor1: row[24],
          estado: estado,
          fechaRadicacion: row[33]
        });
      }
    }

    return createResponse({
      success: true,
      total: radicaciones.length,
      radicaciones: radicaciones
    });

  } catch(error) {
    Logger.log("Get radicaciones error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// FASE 1 - VER DETALLE RADICACIÓN
// ============================================

function actionGetRadicacionDetalle(body) {
  try {
    if (!body || !body.rowIndex) {
      return createResponse({success: false, error: "rowIndex required"});
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var fase1Sheet = ss.getSheetByName("Fase1");
    var rowIndex = parseInt(body.rowIndex);
    var row = fase1Sheet.getRange(rowIndex, 1, 1, 38).getValues()[0];

    var detalle = {
      numero: row[1],
      emailEstudiante: row[2],
      estudiante1: {cedula: row[3], nombre: row[4], email: row[5], telefono: row[6], semestre: row[7]},
      estudiante2: {cedula: row[9], nombre: row[10], email: row[11], telefono: row[12], semestre: row[13]},
      estudiante3: {cedula: row[15], nombre: row[16], email: row[17], telefono: row[18], semestre: row[19]},
      trabajo: {titulo: row[21], modalidad: row[22], area: row[23]},
      tutor1: {nombre: row[24], email: row[25], telefono: row[26], relacion: row[27]},
      tutor2: {nombre: row[28], email: row[29], telefono: row[30], relacion: row[31]},
      estado: row[32],
      fechaRadicacion: row[33],
      notas: row[35]
    };

    return createResponse({success: true, detalle: detalle});

  } catch(error) {
    Logger.log("Get detalle error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// FASE 1 - APROBAR RADICACIÓN
// ============================================

function actionAprobarRadicacion(body) {
  try {
    if (!body || !body.rowIndex) {
      return createResponse({success: false, error: "rowIndex required"});
    }

    var rowIndex = parseInt(body.rowIndex);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var fase1Sheet = ss.getSheetByName("Fase1");

    // Column AG = Estado (column 33)
    fase1Sheet.getRange(rowIndex, 33).setValue("Aprobado Fase 1");
    
    // Column AH = Fecha Aprobación (column 34)
    fase1Sheet.getRange(rowIndex, 34).setValue(new Date());
    
    // Column AJ = Notas (column 36)
    if (body.observaciones) {
      fase1Sheet.getRange(rowIndex, 36).setValue(body.observaciones);
    }
    
    // Column AK = Aprobado Por (column 37)
    fase1Sheet.getRange(rowIndex, 37).setValue(body.coordinadoraEmail || COORDINADORA_EMAIL);

    return createResponse({
      success: true,
      message: "Radicación aprobada exitosamente"
    });

  } catch(error) {
    Logger.log("Aprobar error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// FASE 1 - RECHAZAR RADICACIÓN
// ============================================

function actionRechazarRadicacion(body) {
  try {
    if (!body || !body.rowIndex) {
      return createResponse({success: false, error: "rowIndex required"});
    }

    var rowIndex = parseInt(body.rowIndex);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var fase1Sheet = ss.getSheetByName("Fase1");

    // Column AG = Estado
    fase1Sheet.getRange(rowIndex, 33).setValue("Rechazado");
    
    // Column AJ = Notas
    if (body.observaciones) {
      fase1Sheet.getRange(rowIndex, 36).setValue(body.observaciones);
    }

    return createResponse({
      success: true,
      message: "Radicación rechazada"
    });

  } catch(error) {
    Logger.log("Rechazar error: " + error);
    return createResponse({success: false, error: error.toString()});
  }
}

// ============================================
// UTILIDADES
// ============================================

function generarNumeroRadicacion(fase1Sheet) {
  try {
    var data = fase1Sheet.getDataRange().getValues();
    var maxNum = 0;

    for (var i = 1; i < data.length; i++) {
      var numeroStr = data[i][1]; // Column B (Número Radicación)
      if (numeroStr && numeroStr.includes("CTTG")) {
        var match = numeroStr.match(/CTTG-\d+-(\d+)/);
        if (match) {
          var num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    maxNum++;
    var año = new Date().getFullYear();
    return "CTTG-" + año + "-" + String(maxNum).padStart(4, "0");

  } catch(error) {
    Logger.log("Generate numero error: " + error);
    return "CTTG-2025-0001";
  }
}

function enviarEmailConfirmacionRadicacion(destinatario, nombre, numero) {
  var asunto = "Confirmación de Radicación - CTTG Medicina";
  var mensaje = `
Estimado ${nombre},

Su radicación ha sido registrada exitosamente en el sistema CTTG Medicina.

NÚMERO DE RADICACIÓN: ${numero}

Por favor guarde este número para futuras consultas.

Su solicitud será revisada por la coordinación del comité técnico de trabajo de grado.

Coordinación CTTG
Universidad Santiago de Cali
  `;

  GmailApp.sendEmail(destinatario, asunto, mensaje);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
