/**
 * Sustentación (Fase 3): en qué paso va cada solicitud y qué le toca hacer a coordinación.
 * Lo usan coordinadora_fase3.html y los paneles (coordinadora / asistente) para mostrar
 * solo lo pendiente, igual que Actas y Protocolo.
 *
 * Pasos de una solicitud vigente:
 *   nueva     → radicada por el estudiante, falta revisarla            (acción: Revisada / Devolver)
 *   jurados   → revisada, faltan aprobar los jurados                    (acción: Aprobar jurados)
 *   programar → jurados aprobados, falta fecha/hora/lugar               (acción: Asignar fecha)
 *   nota      → programada, falta registrar la nota                     (acción: Registrar)
 * Fuera de los pendientes:
 *   devuelta    → la tiene el estudiante corrigiendo
 *   cerrada     → tiene nota o la radicación ya terminó
 *   reemplazada → hay un envío más reciente para la misma radicación
 */
(function (root) {
  var ESTADOS_RAD_CERRADOS = ['Sustentado', 'Reprobado', 'Cancelado', 'Completado'];
  var PASOS_PENDIENTES = ['nueva', 'jurados', 'programar', 'nota'];
  var ETIQUETAS = {
    nueva: 'Nueva · por revisar',
    jurados: 'Por aprobar jurados',
    programar: 'Por programar fecha',
    nota: 'Por registrar nota',
    devuelta: 'Devuelta · espera al estudiante',
    cerrada: 'Cerrada',
    reemplazada: 'Reemplazada por un reenvío'
  };

  function norm(numero) { return String(numero || '').trim().toUpperCase(); }

  function fechaValida(v) {
    if (v == null) return false;
    var s = String(v).trim().split('T')[0];
    if (!s || s === '-' || s === '—') return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var y = parseInt(s.slice(0, 4), 10);
      return y >= 1990 && y <= 2100;
    }
    if (/^\d{5,7}(\.\d+)?$/.test(s)) return true;
    var d = new Date(s);
    if (isNaN(d.getTime())) return false;
    var yy = d.getFullYear();
    return yy >= 1990 && yy <= 2100;
  }

  function tieneFecha(r) { return fechaValida(r.fechaSustentacion) || fechaValida(r.fechaAsignada); }

  function tieneNota(r) {
    var s = String(r.nota == null ? '' : r.nota).trim().replace(',', '.');
    return s !== '' && !isNaN(parseFloat(s));
  }

  /** Columna AC tal como está en la hoja. */
  function estadoGuardado(r) {
    var e = String(r.estadoSolicitud == null ? '' : r.estadoSolicitud).trim();
    return e || 'Solicitud sustentación radicada';
  }

  function esDevuelta(txt) {
    var e = String(txt || '').trim().toLowerCase();
    return e.indexOf('devuelta') !== -1 || e.indexOf('devolución') !== -1 || e.indexOf('devolucion') !== -1;
  }

  /**
   * Jurados aprobados POR COORDINACIÓN. Ojo: los nombres de jurado (N/Q) se llenan desde que el
   * estudiante radica (son sus sugeridos), así que tener nombres NO significa que estén aprobados.
   * Cuenta como aprobado: estado «Jurados aprobados» o posterior, columna T (nombres para el acta)
   * llena, o ya hay fecha programada.
   */
  function juradosAprobados(r) {
    var e = estadoGuardado(r).toLowerCase();
    if (/\bjurados?\s+aprobados?\b/.test(e)) return true;
    if (e.indexOf('programada') !== -1 || e === 'sustentado' || e === 'reprobado') return true;
    if (String(r.nombres || '').trim()) return true;
    return tieneFecha(r);
  }

  function revisada(r) {
    return estadoGuardado(r).toLowerCase().indexOf('revisada') !== -1 || juradosAprobados(r);
  }

  /** rowIndex de la fila más reciente por radicación. */
  function ultimasPorRad(lista) {
    var porRad = {};
    (lista || []).forEach(function (r) {
      var k = norm(r.numero) || ('fila-' + r.rowIndex);
      var prev = porRad[k];
      if (!prev || (parseInt(r.rowIndex, 10) || 0) > (parseInt(prev.rowIndex, 10) || 0)) porRad[k] = r;
    });
    var set = {};
    Object.keys(porRad).forEach(function (k) { set[porRad[k].rowIndex] = true; });
    return set;
  }

  /**
   * @param r              fila de getFase3
   * @param estadoRad      estado de la radicación en Fase 1 (col AG) o ''
   * @param esUltima       true si es el envío más reciente de esa radicación
   */
  function paso(r, estadoRad, esUltima) {
    if (tieneNota(r) || ESTADOS_RAD_CERRADOS.indexOf(String(estadoRad || '').trim()) !== -1) return 'cerrada';
    if (esUltima === false) return 'reemplazada';
    if (esDevuelta(estadoGuardado(r))) return 'devuelta';
    if (tieneFecha(r)) return 'nota';
    if (juradosAprobados(r)) return 'programar';
    if (revisada(r)) return 'jurados';
    return 'nueva';
  }

  /**
   * @param lista              todas las filas de getFase3 (mejor sin agrupar)
   * @param estadoRadPorNumero { 'CTTG-…': 'Aprobado', … } desde Fase 1
   * @returns { nueva:[], jurados:[], programar:[], nota:[], devuelta:[], cerrada:[], reemplazada:[],
   *            totalPendientes, pasoDe(r) }
   */
  function clasificar(lista, estadoRadPorNumero) {
    var mapa = {};
    Object.keys(estadoRadPorNumero || {}).forEach(function (k) { mapa[norm(k)] = estadoRadPorNumero[k]; });
    var ultimas = ultimasPorRad(lista);
    var out = { nueva: [], jurados: [], programar: [], nota: [], devuelta: [], cerrada: [], reemplazada: [] };
    var porFila = {};
    (lista || []).forEach(function (r) {
      var p = paso(r, mapa[norm(r.numero)] || '', !!ultimas[r.rowIndex]);
      porFila[r.rowIndex] = p;
      out[p].push(r);
    });
    out.totalPendientes = PASOS_PENDIENTES.reduce(function (s, p) { return s + out[p].length; }, 0);
    out.pasoDe = function (r) { return porFila[r.rowIndex] || 'nueva'; };
    return out;
  }

  var api = {
    ESTADOS_RAD_CERRADOS: ESTADOS_RAD_CERRADOS,
    PASOS_PENDIENTES: PASOS_PENDIENTES,
    ETIQUETAS: ETIQUETAS,
    norm: norm,
    fechaValida: fechaValida,
    tieneFecha: tieneFecha,
    tieneNota: tieneNota,
    estadoGuardado: estadoGuardado,
    esDevuelta: esDevuelta,
    juradosAprobados: juradosAprobados,
    paso: paso,
    clasificar: clasificar
  };
  root.CTTGSust = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
