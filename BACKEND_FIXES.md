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
