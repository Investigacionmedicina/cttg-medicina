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
