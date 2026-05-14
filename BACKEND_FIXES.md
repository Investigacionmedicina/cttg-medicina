# Correcciones requeridas en el Apps Script backend

## Fix 1 — `metricasColumnaRadicacionFase3`: rango fuera de límites

**Problema:** `getRange(2, 2, scanEnd, 2)` donde `scanEnd = sheet.getMaxRows()` (ej: 1000) intenta leer desde la fila 2 hasta la fila 1001 en una hoja de 1000 filas → puede arrojar excepción o retornar datos incompletos.

**Código actual (buggy):**
```javascript
function metricasColumnaRadicacionFase3(sheet) {
  var scanEnd = Math.min(5000, Math.max(sheet.getLastRow(), sheet.getMaxRows(), 900));
  if (scanEnd < 2) return { conteoRadicacionesColumnaB: 0, ultimaFilaNumeroEnColumnaB: 1 };
  var vals = sheet.getRange(2, 2, scanEnd, 2).getDisplayValues();
```

**Reemplazar por:**
```javascript
function metricasColumnaRadicacionFase3(sheet) {
  var lrSheet = sheet.getLastRow();
  var maxRows = sheet.getMaxRows();
  // No exceder maxRows al leer desde fila 2 (máximo disponible = maxRows - 1)
  var scanEnd = Math.min(5000, Math.max(lrSheet, 900), maxRows - 1);
  if (scanEnd < 1) return { conteoRadicacionesColumnaB: 0, ultimaFilaNumeroEnColumnaB: 1 };
  var vals = sheet.getRange(2, 2, scanEnd, 2).getDisplayValues();
```

---

## Fix 2 — `sinDedupe` en `obtenerFase3` (si el URL antiguo no lo tenía)

Si la función `obtenerFase3` del deployment antiguo no tiene el parámetro `sinDedupe`, agrégalo:

```javascript
function obtenerFase3(sesion, opciones) {
  if (!sesion) return { success: false, error: "Sesión requerida" };
  opciones = opciones || {};
  // sinDedupe: muestra todas las filas sin agrupar por radicación
  var sinDedupe = opciones.sinDedupe === true && sesion.rol === "coordinadora";
  var fase3 = sinDedupe ? listaFase3TodasLasFilasSinDedupe() : listaFase3Completa();
  // ... resto igual
```

Y en el `switch` del `handleRequest`:
```javascript
case "getFase3": result = obtenerFase3(sesion, { sinDedupe: body.sinDedupe === true }); break;
```

---

## Fix 3 — URL unificada (ya corregida en frontend)

Todos los archivos HTML ahora usan la misma URL:
`AKfycbx8J-FjMJCgtQBHTqXmOpbxVZxrbR1_DT7w55ucesQYtTdZgnbxBprB7c4auHhi9PQk`

Asegúrate de que este deployment tiene los Fix 1 y Fix 2 aplicados y redespliegado.

---

## Fix 4 — Acción `getJurados` (portal Fase 3)

**Problema:** `fase3_sustentacion.html` envía `action: 'getJurados'` para llenar el desplegable de jurados. Si no existe el `case` en `handleRequest`, la API responde *Acción no reconocida* y la lista queda vacía con error.

**En el `switch` de `handleRequest`, añadir (no meter en `accionesSoloCoordLectura`; debe poder llamarlo el estudiante):**

```javascript
case "getJurados": result = obtenerJurados(); break;
```

**Implementación:** ver archivo en el repo `apps-script/fragmentos-faltantes.gs` (función `obtenerJurados`). Hoja sugerida: **Jurados** con columnas alineadas a lo que espera el front: nombre, email, teléfono, especialidad, estado (inactivo = omitir).

---

## Fix 5 — Typo `motivoDevoluccion` en `registrarDecisionComite`

**Problema:** El comité técnico (`comite_tecnico.html`) envía `motivoDevolucion`. En el backend aparece `body.motivoDevoluccion` (triple «c») y el motivo llega siempre `undefined` al registrar una devolución.

**Reemplazar en el `switch`:**

```javascript
body.motivoDevolucion
```

en lugar de `body.motivoDevoluccion`.

---

## Fix 6 — Función `ultimaFilaEscrituraFase3` ausente

**Problema:** `esFilaValidaParaModificarFase3` llama a `ultimaFilaEscrituraFase3(sheet)`. Si esa función no está definida en el proyecto, **updateFase3Estado**, **updateFase3Asignacion** y **completarFase3** fallan con `ReferenceError`.

**Solución:** definir la función (ejemplo en `apps-script/fragmentos-faltantes.gs`).

---

## Fix 7 (opcional) — Alerta protocolo vencido: columna de fecha

En `verificarVencimientosYAlertar`, si `crearProtocolo` guarda la fecha de carga en la columna **E** (índice 4 en fila 0-based), conviene usar `dataFase2[k][4]` para calcular días hábiles, no `[5]`, para coherencia con `listaProtocolosFase2Completa` (`fechaRadicacion: formatearFecha(r[4])`).

---

## Fix 8 — Columnas de teléfono y especialidad de jurados en `listaFase3TodasLasFilasSinDedupe`

**Problema:** Los nombres de campo en la función de lectura están cruzados con la realidad del Sheet:
- `r[14]` (columna **O**) contiene el **teléfono** del jurado 1, pero el código lo devuelve como `jurado1Cedula`
- `r[17]` (columna **R**) contiene el **teléfono** del jurado 2, pero el código lo devuelve como `jurado2Cedula`
- `r[30]` (columna **AE**) contiene la **especialidad** del jurado 1, pero el código lo devuelve como `jurado1Telefono`
- `r[31]` (columna **AF**) contiene la **especialidad** del jurado 2, pero el código lo devuelve como `jurado2Telefono`

Además, los campos `jurado1AceptaPropuesta` y `jurado2AceptaPropuesta` no están mapeados (averigüar en qué columnas los guarda `crearFase3`).

**Reemplazar en `listaFase3TodasLasFilasSinDedupe`:**

```javascript
// ANTES (incorrecto):
jurado1Cedula:     String(r[14] || ""),
// ...
jurado2Cedula:     String(r[17] || ""),
// ...
jurado1Telefono:   valorCeldaLegible(r[30]),
jurado2Telefono:   valorCeldaLegible(r[31]),

// DESPUÉS (correcto):
jurado1Telefono:   String(r[14] || ""),   // col O = teléfono jurado 1
// ...
jurado2Telefono:   String(r[17] || ""),   // col R = teléfono jurado 2
// ...
jurado1Especialidad: String(r[30] || ""), // col AE = especialidad jurado 1
jurado2Especialidad: String(r[31] || ""), // col AF = especialidad jurado 2
// Agregar según columna real:
// jurado1AceptaPropuesta: String(r[??] || ""),
// jurado2AceptaPropuesta: String(r[??] || ""),
```

**También en `crearFase3`:** agregar los parámetros que ya envía el estudiante pero el backend ignora:
```javascript
// En el switch:
case "crearFase3": result = crearFase3(
  body.numeroRadicacion, body.emailEstudiante, body.porcentajeTurnitin,
  body.jurado1Nombre, body.jurado1Email, body.jurado1Telefono,
  body.jurado1Especialidad, body.jurado1AceptaPropuesta,   // <-- añadir
  body.jurado2Nombre, body.jurado2Email, body.jurado2Telefono,
  body.jurado2Especialidad, body.jurado2AceptaPropuesta,   // <-- añadir
  body.anexoA7, body.articulo, body.guiaAutores, body.avalCCEB, body.turnitinDoc,
  sesion
); break;
```

**Nota temporal:** Mientras no se aplique este fix en el AS, el frontend usa los nombres de campo actuales (`Cedula` para teléfono, `Telefono` para especialidad) y los mapea correctamente en pantalla.
