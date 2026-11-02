/**
 * =====================================================================
 *  LA GRAN AVENTURA MATEMÁTICA – Integrador de Matemática 3º grado
 *  Code.gs · Google Apps Script
 * ---------------------------------------------------------------------
 *  Recibe los resultados que envía la aplicación (publicada en GitHub
 *  Pages) y los registra en la planilla de Google Sheets:
 *    · Hoja «Resultados generales»: una fila por alumno.
 *    · Hoja «Detalle de respuestas»: una fila por cada desafío.
 *
 *  Cómo se usa (detalle completo en README.md):
 *    1. Crear una planilla de Google Sheets.
 *    2. Extensiones → Apps Script → pegar este archivo.
 *    3. Ejecutar una vez «configurarPlanilla» y autorizar.
 *    4. Implementar → Nueva implementación → Aplicación web
 *       (Ejecutar como: Yo · Quién tiene acceso: Cualquier persona).
 *    5. Copiar la URL /exec y pegarla en CONFIG.SCRIPT_URL de script.js.
 *
 *  Este archivo NO contiene contraseñas ni claves: el script se ejecuta
 *  con la cuenta de la docente y solo puede escribir en esta planilla.
 * =====================================================================
 */

/* ---------- Configuración ---------- */
var CONFIG_GS = {
  HOJA_GENERAL: 'Resultados generales',
  HOJA_DETALLE: 'Detalle de respuestas',
  GRADOS: ['3º'],            // deben coincidir con CONFIG.GRADOS de script.js
  DIVISIONES: ['A', 'B'],    // deben coincidir con CONFIG.DIVISIONES de script.js
  MAX_DESAFIOS: 60,
  MAX_TEXTO: 1500,
  ESPERA_BLOQUEO_MS: 20000
};

var ENCABEZADOS_GENERAL = [
  'Fecha y hora', 'Nombre y apellido', 'Grado', 'División', 'Puntaje total',
  'Porcentaje de aciertos', 'Respuestas correctas', 'Respuestas incorrectas', 'Tiempo total',
  'Numeración y Valor Posicional', 'Fracciones', 'Figuras y Cuerpos Geométricos',
  'Situaciones Problemáticas', 'Estado de finalización', 'Resultado general', 'ID de sesión'
];
var ENCABEZADOS_DETALLE = [
  'Fecha y hora', 'Alumno', 'Grado y división', 'Misión', 'N.º de actividad',
  'Contenido evaluado', 'Respuesta seleccionada', 'Respuesta correcta', 'Resultado',
  'Cantidad de intentos', 'Tiempo de resolución', 'ID de sesión'
];

/* =====================================================================
   PUNTOS DE ENTRADA DE LA APLICACIÓN WEB
   ===================================================================== */

/**
 * GET: permite comprobar que el servicio funciona (lo usa el botón
 * «Probar conexión» del panel docente). No modifica la planilla.
 */
function doGet(e) {
  try {
    var libro = obtenerLibro_();
    var hoja = libro.getSheetByName(CONFIG_GS.HOJA_GENERAL);
    var registros = hoja ? Math.max(0, hoja.getLastRow() - 1) : 0;
    return respuestaJson_({ ok: true, servicio: 'La Gran Aventura Matemática', planilla: libro.getName(), registros: registros });
  } catch (err) {
    return respuestaJson_({ ok: false, codigo: 'SERVIDOR', error: String(err && err.message || err) });
  }
}

/**
 * POST: recibe los resultados de una sesión y los registra.
 * La app envía el JSON como texto plano (sin preflight CORS).
 * Respuestas:
 *   { ok: true,  sessionId, duplicado: false }  → se registró ahora
 *   { ok: true,  sessionId, duplicado: true }   → ya estaba registrada (no se duplica)
 *   { ok: false, codigo: 'VALIDACION', error }  → datos inválidos (no se reintenta)
 *   { ok: false, codigo: 'SERVIDOR', error }    → error temporal (la app reintenta)
 */
function doPost(e) {
  var datos;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJson_({ ok: false, codigo: 'VALIDACION', error: 'No se recibieron datos' });
    }
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuestaJson_({ ok: false, codigo: 'VALIDACION', error: 'Los datos no tienen formato JSON válido' });
  }

  var problema = validarDatos_(datos);
  if (problema) return respuestaJson_({ ok: false, codigo: 'VALIDACION', error: problema });

  var bloqueo = LockService.getScriptLock();
  try {
    bloqueo.waitLock(CONFIG_GS.ESPERA_BLOQUEO_MS); // evita escrituras simultáneas
    var resultado = registrarResultados_(datos);
    return respuestaJson_({ ok: true, sessionId: datos.sessionId, duplicado: resultado.duplicado });
  } catch (err) {
    return respuestaJson_({ ok: false, codigo: 'SERVIDOR', error: String(err && err.message || err) });
  } finally {
    try { bloqueo.releaseLock(); } catch (e2) { /* sin bloqueo tomado */ }
  }
}

/* =====================================================================
   CONFIGURACIÓN DE LA PLANILLA
   ===================================================================== */

/** Ejecutar una vez desde el editor para crear las hojas y encabezados. */
function configurarPlanilla() {
  var libro = obtenerLibro_();
  prepararHoja_(libro, CONFIG_GS.HOJA_GENERAL, ENCABEZADOS_GENERAL);
  prepararHoja_(libro, CONFIG_GS.HOJA_DETALLE, ENCABEZADOS_DETALLE);
  return 'Planilla lista: «' + CONFIG_GS.HOJA_GENERAL + '» y «' + CONFIG_GS.HOJA_DETALLE + '».';
}

/** Agrega un menú en la planilla para preparar las hojas. */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Aventura Matemática')
      .addItem('Preparar hojas', 'configurarPlanilla')
      .addToUi();
  } catch (e) { /* se ejecuta sin interfaz */ }
}

/* =====================================================================
   REGISTRO DE DATOS
   ===================================================================== */
function registrarResultados_(d) {
  var libro = obtenerLibro_();
  var hojaGeneral = prepararHoja_(libro, CONFIG_GS.HOJA_GENERAL, ENCABEZADOS_GENERAL);
  var hojaDetalle = prepararHoja_(libro, CONFIG_GS.HOJA_DETALLE, ENCABEZADOS_DETALLE);
  var id = d.sessionId;

  // 1) Control de duplicados: la fila de «Resultados generales» confirma la sesión.
  if (filasConId_(hojaGeneral, ENCABEZADOS_GENERAL.length, id).length > 0) {
    return { duplicado: true };
  }
  // 2) Si un envío anterior se cortó a mitad de camino, se borran sus filas de
  //    detalle incompletas para no duplicarlas.
  var huerfanas = filasConId_(hojaDetalle, ENCABEZADOS_DETALLE.length, id);
  for (var h = huerfanas.length - 1; h >= 0; h--) hojaDetalle.deleteRow(huerfanas[h]);

  var fecha = fechaValida_(d.finalizadoEn);
  var curso = d.alumno.grado + ' ' + d.alumno.division;
  var nombre = texto_(d.alumno.nombre);

  // 3) Detalle de respuestas (una fila por desafío)
  var filas = d.detalle.map(function (x) {
    return [
      fecha, nombre, texto_(curso), texto_(x.mision), Number(x.numero), texto_(x.contenido),
      texto_(x.respuesta), texto_(x.correcta), texto_(x.resultado), Number(x.intentos),
      tiempoTexto_(x.tiempoSeg), id
    ];
  });
  if (filas.length) {
    hojaDetalle.getRange(hojaDetalle.getLastRow() + 1, 1, filas.length, ENCABEZADOS_DETALLE.length).setValues(filas);
  }

  // 4) Resultados generales (se escribe al final: confirma el registro completo)
  var r = d.resumen;
  var ejes = r.ejes || {};
  hojaGeneral.getRange(hojaGeneral.getLastRow() + 1, 1, 1, ENCABEZADOS_GENERAL.length).setValues([[
    fecha, nombre, texto_(d.alumno.grado), texto_(d.alumno.division),
    Number(r.puntajeTotal) + ' / ' + Number(r.puntajeMaximo), Number(r.porcentaje) / 100,
    Number(r.correctas), Number(r.incorrectas), tiempoTexto_(r.tiempoTotalSeg),
    texto_(ejes.num || ''), texto_(ejes.frac || ''), texto_(ejes.geo || ''), texto_(ejes.prob || ''),
    texto_(r.estado), texto_(r.resultadoGeneral), id
  ]]);
  SpreadsheetApp.flush();
  return { duplicado: false };
}

/* =====================================================================
   VALIDACIÓN DE LOS DATOS RECIBIDOS
   Devuelve un texto con el problema, o '' si todo está bien.
   ===================================================================== */
function validarDatos_(d) {
  if (!d || typeof d !== 'object') return 'Datos vacíos';
  if (typeof d.sessionId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(d.sessionId)) return 'Identificador de sesión inválido';
  var a = d.alumno;
  if (!a || typeof a.nombre !== 'string') return 'Falta el nombre del alumno';
  var nombre = a.nombre.replace(/\s+/g, ' ').trim();
  if (nombre.length < 3 || nombre.length > 80) return 'El nombre debe tener entre 3 y 80 caracteres';
  if (CONFIG_GS.GRADOS.indexOf(a.grado) < 0) return 'Grado no válido';
  if (CONFIG_GS.DIVISIONES.indexOf(a.division) < 0) return 'División no válida';

  var r = d.resumen;
  if (!r || typeof r !== 'object') return 'Falta el resumen de resultados';
  if (!esEntero_(r.puntajeMaximo, 1, 1000)) return 'Puntaje máximo inválido';
  if (!esEntero_(r.puntajeTotal, 0, r.puntajeMaximo)) return 'Puntaje total inválido';
  if (!esEntero_(r.porcentaje, 0, 100)) return 'Porcentaje inválido';
  if (!esEntero_(r.totalActividades, 1, CONFIG_GS.MAX_DESAFIOS)) return 'Cantidad de actividades inválida';
  if (!esEntero_(r.correctas, 0, r.totalActividades) || !esEntero_(r.incorrectas, 0, r.totalActividades)) return 'Cantidad de respuestas inválida';
  if (r.correctas + r.incorrectas !== r.totalActividades) return 'Correctas + incorrectas no coincide con el total';
  if (!esEntero_(r.tiempoTotalSeg, 0, 86400)) return 'Tiempo total inválido';
  if (!esEntero_(r.misionesCompletadas, 0, 4)) return 'Misiones completadas inválidas';

  if (!Array.isArray(d.detalle) || d.detalle.length !== r.totalActividades) return 'El detalle no coincide con la cantidad de actividades';
  for (var i = 0; i < d.detalle.length; i++) {
    var x = d.detalle[i];
    if (!x || typeof x !== 'object') return 'Detalle inválido en la fila ' + (i + 1);
    if (!esEntero_(x.numero, 1, 99) || !esEntero_(x.intentos, 0, 999) || !esEntero_(x.tiempoSeg, 0, 86400)) return 'Valores numéricos inválidos en la fila ' + (i + 1);
    if (typeof x.mision !== 'string' || typeof x.resultado !== 'string') return 'Faltan datos en la fila ' + (i + 1);
  }
  return '';
}

/* =====================================================================
   UTILIDADES
   ===================================================================== */
function obtenerLibro_() {
  // Si el script está vinculado a la planilla (Extensiones → Apps Script), se usa esa.
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  if (libro) return libro;
  // Opcional: script independiente con la propiedad ID_PLANILLA configurada.
  var idPlanilla = PropertiesService.getScriptProperties().getProperty('ID_PLANILLA');
  if (idPlanilla) return SpreadsheetApp.openById(idPlanilla);
  throw new Error('El script no está vinculado a una planilla');
}

/** Crea la hoja y sus encabezados si todavía no existen. */
function prepararHoja_(libro, nombre, encabezados) {
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados])
      .setFontWeight('bold').setBackground('#5B4BDB').setFontColor('#FFFFFF').setWrap(true);
    hoja.setFrozenRows(1);
    hoja.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
    if (nombre === CONFIG_GS.HOJA_GENERAL) hoja.getRange('F:F').setNumberFormat('0%');
  }
  return hoja;
}

/** Números de fila (desde 2) cuya última columna (ID de sesión) coincide con id. */
function filasConId_(hoja, columnaId, id) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, columnaId, ultima - 1, 1).getValues();
  var filas = [];
  for (var i = 0; i < valores.length; i++) if (String(valores[i][0]) === id) filas.push(i + 2);
  return filas;
}

function esEntero_(v, min, max) {
  return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= min && v <= max;
}

/** Texto seguro: recorta, limita largo y evita que se interprete como fórmula. */
function texto_(v) {
  var t = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, CONFIG_GS.MAX_TEXTO);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function tiempoTexto_(segundos) {
  var s = Math.max(0, Math.round(Number(segundos) || 0));
  var m = Math.floor(s / 60);
  var resto = s % 60;
  return (m ? m + ' min ' : '') + (resto < 10 && m ? '0' : '') + resto + ' s';
}

function fechaValida_(iso) {
  var f = iso ? new Date(iso) : new Date();
  return isNaN(f.getTime()) ? new Date() : f;
}

function respuestaJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
