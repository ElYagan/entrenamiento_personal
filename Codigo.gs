// ═══════════════════════════════════════════════════════════════════════
// ENTRENAMIENTO PERSONAL — EDUARDO / LOS NEWENCHES
// Google Apps Script Backend  v4.0
// Arquitectura: JSONP para evitar restricciones CORS de Apps Script
// ═══════════════════════════════════════════════════════════════════════

const SHEETS = {
  PLAN:       'Plan',
  ESTADO:     'Estado',
  SESIONES:   'Sesiones',
  EJERCICIOS: 'Ejercicios',
  MEDIDAS:    'Medidas',
  EVALUACION: 'Evaluacion'
};

// ───────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ───────────────────────────────────────────────────────────────────────

/**
 * GET ?action=load             → JSON normal
 * GET ?action=load&callback=fn → JSONP  (fn({ok:true,...}))
 * GET ?action=save&data=...&callback=fn → guarda via GET + JSONP
 */
function doGet(e) {
  const p        = e.parameter || {};
  const action   = p.action   || '';
  const callback = p.callback || '';

  let result;

  if (action === 'load') {
    result = { ok: true, plan: _loadPlan(), state: _loadState() };
  } else if (action === 'save' && p.data) {
    try {
      const state = JSON.parse(decodeURIComponent(p.data));
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      _writeEstado(ss, JSON.stringify(state));
      _writeSesiones(ss, state);
      _writeEjercicios(ss, state);
      _writeMedidas(ss, state.med);
      _writeEvaluacion(ss, state.ev);
      result = { ok: true };
    } catch(err) {
      result = { ok: false, error: err.message };
    }
  } else {
    result = { ok: true, msg: 'API activa v4.0' };
  }

  const json = JSON.stringify(result);

  // JSONP: envuelve en callback(...)
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // JSON normal (para pruebas en browser)
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// doPost ya no se usa desde el cliente — se mantiene por compatibilidad
function doPost(e) {
  try {
    const body  = JSON.parse(e.postData.contents);
    const state = body.state;
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    _writeEstado(ss, JSON.stringify(state));
    _writeSesiones(ss, state);
    _writeEjercicios(ss, state);
    _writeMedidas(ss, state.med);
    _writeEvaluacion(ss, state.ev);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ───────────────────────────────────────────────────────────────────────
// SETUP
// ───────────────────────────────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _ensurePlanSheet(ss);
  _ensureSheet(ss, SHEETS.ESTADO,     ['Timestamp', 'StateJSON', 'Version']);
  _ensureSheet(ss, SHEETS.SESIONES,   ['Timestamp', 'Semana', 'Dia', 'Animo', 'Energia', 'Lumbar', 'Rodilla', 'PostSesion']);
  _ensureSheet(ss, SHEETS.EJERCICIOS, ['Timestamp', 'Semana', 'Dia', 'EjercicioID', 'EjNombre', 'Serie1', 'Serie2', 'Serie3', 'Sensacion', 'Nota']);
  _ensureSheet(ss, SHEETS.MEDIDAS,    ['Tipo', 'Peso_kg', 'Cintura_cm', 'Cadera_cm', 'MusloDer_cm', 'BrazoDer_cm']);
  _ensureSheet(ss, SHEETS.EVALUACION, ['Timestamp', 'Resistencia', 'ControlMoto', 'Lumbar', 'Comentario']);
  SpreadsheetApp.getUi().alert('✅ Hojas listas.');
}

// ───────────────────────────────────────────────────────────────────────
// LECTURA
// ───────────────────────────────────────────────────────────────────────
function _loadPlan() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PLAN);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const hdr = {};
  data[0].forEach((h, i) => { hdr[h.toString().trim().toLowerCase()] = i; });
  return data.slice(1)
    .filter(r => r[hdr['semana']] !== '' && r[hdr['semana']] != null)
    .map(r => ({
      semana:    Number(r[hdr['semana']])    || 1,
      dia:       Number(r[hdr['dia']])       || 1,
      nombredia: String(r[hdr['nombredia']] || ''),
      orden:     Number(r[hdr['orden']])     || 1,
      id:        String(r[hdr['exid']]      || ''),
      name:      String(r[hdr['nombre']]    || ''),
      plan:      String(r[hdr['plan']]      || ''),
      series:    Number(r[hdr['series']])   || 1,
      note:      String(r[hdr['nota']]      || ''),
      alert:     String(r[hdr['alerta']]    || ''),
      tipo:      String(r[hdr['tipo']]      || 'normal')
    }));
}

function _loadState() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ESTADO);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const cell = sheet.getRange(2, 2).getValue();
  if (!cell) return null;
  try { return JSON.parse(cell.toString()); } catch(e) { return null; }
}

// ───────────────────────────────────────────────────────────────────────
// ESCRITURA
// ───────────────────────────────────────────────────────────────────────
function _writeEstado(ss, stateJSON) {
  let sh = ss.getSheetByName(SHEETS.ESTADO);
  if (!sh) { sh = ss.insertSheet(SHEETS.ESTADO); sh.appendRow(['Timestamp','StateJSON','Version']); }
  const row = [new Date().toISOString(), stateJSON, '4.0'];
  if (sh.getLastRow() < 2) sh.appendRow(row);
  else sh.getRange(2, 1, 1, 3).setValues([row]);
}

function _writeSesiones(ss, state) {
  let sh = ss.getSheetByName(SHEETS.SESIONES);
  if (!sh) { sh = ss.insertSheet(SHEETS.SESIONES); sh.appendRow(['Timestamp','Semana','Dia','Animo','Energia','Lumbar','Rodilla','PostSesion']); }
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
  const ts = new Date().toISOString(), rows = [];
  Object.keys(state).forEach(wk => {
    if (!wk.match(/^w\d+$/)) return;
    const wn = parseInt(wk.replace('w',''));
    Object.keys(state[wk]).forEach(dk => {
      if (!dk.match(/^d\d+$/)) return;
      const dn = parseInt(dk.replace('d','')), day = state[wk][dk], e = day.e || {};
      rows.push([ts, wn, dn, e.animo||'', e.energia||'', e.lumbar||'', e.rodilla||'', day.post||'']);
    });
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 8).setValues(rows);
}

function _writeEjercicios(ss, state) {
  let sh = ss.getSheetByName(SHEETS.EJERCICIOS);
  if (!sh) { sh = ss.insertSheet(SHEETS.EJERCICIOS); sh.appendRow(['Timestamp','Semana','Dia','EjercicioID','EjNombre','Serie1','Serie2','Serie3','Sensacion','Nota']); }
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 10).clearContent();
  const planRows = _loadPlan(), nameMap = {};
  planRows.forEach(r => { nameMap[`${r.semana}_${r.dia}_${r.id}`] = r.name; });
  const LS = ['–','✓','⚡','✗'], ts = new Date().toISOString(), rows = [];
  Object.keys(state).forEach(wk => {
    if (!wk.match(/^w\d+$/)) return;
    const wn = parseInt(wk.replace('w',''));
    Object.keys(state[wk]).forEach(dk => {
      if (!dk.match(/^d\d+$/)) return;
      const dn = parseInt(dk.replace('d','')), x = (state[wk][dk] || {}).x || {};
      Object.keys(x).forEach(exId => {
        const d = x[exId] || {}, nom = nameMap[`${wn}_${dn}_${exId}`] || exId;
        rows.push([ts, wn, dn, exId, nom, LS[d[0]||0]||'–', LS[d[1]||0]||'–', LS[d[2]||0]||'–', d.feeling||'', d.nota||'']);
      });
    });
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 10).setValues(rows);
}

function _writeMedidas(ss, med) {
  let sh = ss.getSheetByName(SHEETS.MEDIDAS);
  if (!sh) { sh = ss.insertSheet(SHEETS.MEDIDAS); sh.appendRow(['Tipo','Peso_kg','Cintura_cm','Cadera_cm','MusloDer_cm','BrazoDer_cm']); }
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 6).clearContent();
  const ini = med.ini || {}, fin = med.fin || {};
  sh.getRange(2, 1, 2, 6).setValues([
    ['Inicio', ini[0]||'', ini[1]||'', ini[2]||'', ini[3]||'', ini[4]||''],
    ['Cierre', fin[0]||'', fin[1]||'', fin[2]||'', fin[3]||'', fin[4]||'']
  ]);
}

function _writeEvaluacion(ss, ev) {
  let sh = ss.getSheetByName(SHEETS.EVALUACION);
  if (!sh) { sh = ss.insertSheet(SHEETS.EVALUACION); sh.appendRow(['Timestamp','Resistencia','ControlMoto','Lumbar','Comentario']); }
  const row = [new Date().toISOString(), ev.resistencia||'', ev.moto||'', ev.lumbar||'', ev.comentario||''];
  if (sh.getLastRow() < 2) sh.appendRow(row); else sh.getRange(2, 1, 1, 5).setValues([row]);
}

// ───────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────
function _ensureSheet(ss, name, headers) {
  if (ss.getSheetByName(name)) return;
  const sh = ss.insertSheet(name);
  sh.appendRow(headers);
  sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#e8a020').setFontWeight('bold');
  sh.autoResizeColumns(1, headers.length);
  sh.setFrozenRows(1);
}

function _ensurePlanSheet(ss) {
  if (ss.getSheetByName(SHEETS.PLAN)) return;
  const headers = ['Semana','Dia','NombreDia','Orden','ExID','Nombre','Plan','Series','Nota','Alerta','Tipo'];
  const sh = ss.insertSheet(SHEETS.PLAN, 0);
  sh.appendRow(headers);
  sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#e8a020').setFontWeight('bold');
  _defaultPlan().forEach(r => sh.appendRow(r));
  sh.autoResizeColumns(1, headers.length);
  sh.setFrozenRows(1);
}

function _defaultPlan() {
  return [
    [1,1,'KB Base',1,'swing','Swing KB (2 manos)','3 × 12 / KB 12kg',3,'Bisagra de cadera — NO sentadilla. Espalda neutral.','L5-S1: activa core antes del primer impulso.','normal'],
    [1,1,'KB Base',2,'goblet','Goblet Squat','3 × 10 / KB 12kg',3,'Talones en suelo, rodillas hacia afuera, pecho erguido.','Rodilla: baja solo hasta donde no duela.','normal'],
    [1,1,'KB Base',3,'remo_kb','Remo KB con apoyo','3 × 8/lado / KB 12kg',3,'Mano y rodilla apoyadas. Codo pegado al cuerpo.','','normal'],
    [1,2,'Piernas',1,'sent_kb','Sentadilla Goblet (tempo)','3 × 10 / KB 12kg',3,'3 seg bajada, 1 seg pausa abajo, subida controlada.','Rodilla: detente donde no hay dolor.','normal'],
    [1,2,'Piernas',2,'pmr','Peso muerto rumano','3 × 10 / 5–7 kg',3,'Bisagra de cadera. Espalda neutral.','L5-S1: no redondear lumbar al bajar.','normal'],
    [1,2,'Piernas',3,'puente','Puente glúteo','3 × 12 / corporal',3,'Apretón máximo arriba. Pausa 2 seg en cima.','','normal'],
    [1,2,'Piernas',4,'zancada','Zancada estática','3 × 10/lado / corporal',3,'Pie delantero firme. Bajar verticalmente.','Rodilla: si hay dolor, acortar el paso.','normal'],
    [1,3,'Tren Superior',1,'flex','Flexiones','3 × 10 / corporal',3,'Cuerpo alineado. Core activo.','','normal'],
    [1,3,'Tren Superior',2,'remo_m','Remo mancuerna','3 × 10/lado / 7 kg',3,'Apoyo en banco o silla. Codo al techo.','','normal'],
    [1,3,'Tren Superior',3,'elev_lat','Elevaciones laterales','3 × 12 / 3–5 kg',3,'Codos levemente flexionados. Sin balanceo.','','normal'],
    [1,3,'Tren Superior',4,'curl','Curl bíceps','3 × 10 / 5–7 kg',3,'Codos fijos al costado. Movimiento limpio.','','normal'],
    [1,3,'Tren Superior',5,'triceps','Extensión tríceps','3 × 10 / 5 kg',3,'Overhead o kickback. Codo quieto como eje.','L5-S1: si molesta → kickback con apoyo.','normal'],
    [1,4,'Movilidad',1,'catcow','Cat-Cow','10 reps',1,'Vertebra a vertebra. Sincronizado con respiración.','','movilidad'],
    [1,4,'Movilidad',2,'rot_col','Rotaciones columna','8/lado',1,'Rodillas juntas, hombros pegados al piso.','','movilidad'],
    [1,4,'Movilidad',3,'mob_cad','Movilidad cadera 90/90','60 seg/lado',1,'Sentado en suelo, piernas en 90°.','','movilidad'],
    [1,4,'Movilidad',4,'est_glut','Estiramiento glúteo','45 seg/lado',1,'Figura 4. En suelo o silla.','','movilidad'],
    [1,4,'Movilidad',5,'est_isq','Estiramiento isquio','45 seg/lado',1,'Con toalla o sin. Rodilla nunca bloqueada.','','movilidad'],
    [1,4,'Movilidad',6,'hydrant','Apertura cadera (hydrant)','10/lado',1,'Cuadrupedia. Lento. Cadera estable.','','movilidad'],
    [1,4,'Movilidad',7,'resp','Respiración diafragmática','5 min',1,'Mano en pecho, mano en abdomen.','','movilidad'],
    [1,5,'Circuito',1,'swing_c','Swing KB','12 reps × 3 vueltas / KB 12kg',3,'Mantener técnica aunque estés fatigado.','','normal'],
    [1,5,'Circuito',2,'goblet_c','Goblet Squat','10 reps × 3 vueltas / KB 12kg',3,'Controlar descenso especialmente vuelta 2 y 3.','','normal'],
    [1,5,'Circuito',3,'remo_c','Remo KB','10 reps × 3 vueltas / KB 12kg',3,'Alternado o con apoyo según fatiga.','','normal'],
    [1,5,'Circuito',4,'zancada_c','Zancada estática','10/lado × 3 vueltas / corporal',3,'Posición fija. Bajar vertical.','','normal'],
    [1,5,'Circuito',5,'plancha','Plancha frontal','30 seg × 3 vueltas / corporal',3,'Core apretado. Cadera ni arriba ni abajo.','','normal'],
    [2,1,'KB Base',1,'swing','Swing KB (2 manos)','3 × 12 / KB 12kg más control',3,'Bisagra de cadera — NO sentadilla.','L5-S1: activa core antes del primer impulso.','normal'],
    [2,1,'KB Base',2,'goblet','Goblet Squat','3 × 10 / KB 12kg más profundidad',3,'Talones en suelo, rodillas hacia afuera.','Rodilla: baja solo hasta donde no duela.','normal'],
    [2,1,'KB Base',3,'remo_kb','Remo KB con apoyo','3 × 10/lado / KB 12kg',3,'Mano y rodilla apoyadas. Codo pegado al cuerpo.','','normal'],
    [2,2,'Piernas',1,'sent_kb','Sentadilla Goblet (tempo)','3 × 10 / KB 12kg — pausa 2s abajo',3,'3 seg bajada, pausa 2s abajo, subida controlada.','Rodilla: detente donde no hay dolor.','normal'],
    [2,2,'Piernas',2,'pmr','Peso muerto rumano','3 × 10 / 7 kg si OK',3,'Bisagra de cadera. Espalda neutral.','L5-S1: no redondear lumbar al bajar.','normal'],
    [2,2,'Piernas',3,'puente','Puente glúteo','3 × 12 / corporal',3,'Apretón máximo arriba. Pausa 2 seg en cima.','','normal'],
    [2,2,'Piernas',4,'zancada','Zancada estática','3 × 10/lado / corporal más profundidad',3,'Pie delantero firme. Bajar verticalmente.','Rodilla: si hay dolor, acortar el paso.','normal'],
    [2,3,'Tren Superior',1,'flex','Flexiones','3 × 10 / corporal excéntrico 3s',3,'Cuerpo alineado. Descenso 3 segundos.','','normal'],
    [2,3,'Tren Superior',2,'remo_m','Remo mancuerna','3 × 10/lado / 7 kg',3,'Apoyo en banco o silla. Codo al techo.','','normal'],
    [2,3,'Tren Superior',3,'elev_lat','Elevaciones laterales','3 × 12 / 3–5 kg',3,'Codos levemente flexionados. Sin balanceo.','','normal'],
    [2,3,'Tren Superior',4,'curl','Curl bíceps','3 × 10 / 5–7 kg',3,'Codos fijos al costado. Sin columpio.','','normal'],
    [2,3,'Tren Superior',5,'triceps','Extensión tríceps','3 × 10 / 5 kg',3,'Overhead o kickback. Codo quieto como eje.','L5-S1: si molesta → kickback con apoyo.','normal'],
    [2,4,'Movilidad',1,'catcow','Cat-Cow','10 reps',1,'Vertebra a vertebra. Sincronizado con respiración.','','movilidad'],
    [2,4,'Movilidad',2,'rot_col','Rotaciones columna','8/lado',1,'Rodillas juntas, hombros pegados al piso.','','movilidad'],
    [2,4,'Movilidad',3,'mob_cad','Movilidad cadera 90/90','60 seg/lado',1,'Sentado en suelo, piernas en 90°.','','movilidad'],
    [2,4,'Movilidad',4,'est_glut','Estiramiento glúteo','45 seg/lado',1,'Figura 4. En suelo o silla.','','movilidad'],
    [2,4,'Movilidad',5,'est_isq','Estiramiento isquio','45 seg/lado',1,'Con toalla o sin. Rodilla nunca bloqueada.','','movilidad'],
    [2,4,'Movilidad',6,'hydrant','Apertura cadera (hydrant)','10/lado',1,'Cuadrupedia. Lento. Cadera estable.','','movilidad'],
    [2,4,'Movilidad',7,'resp','Respiración diafragmática','5 min',1,'Mano en pecho, mano en abdomen.','','movilidad'],
    [2,5,'Circuito',1,'swing_c','Swing KB','12 reps × 3 vueltas / KB 12kg',3,'Mantener técnica aunque estés fatigado.','','normal'],
    [2,5,'Circuito',2,'goblet_c','Goblet Squat','10 reps × 3 vueltas / KB 12kg',3,'Controlar descenso especialmente vuelta 2 y 3.','','normal'],
    [2,5,'Circuito',3,'remo_c','Remo KB','10 reps × 3 vueltas / KB 12kg',3,'Alternado o con apoyo según fatiga.','','normal'],
    [2,5,'Circuito',4,'zancada_c','Zancada estática','10/lado × 3 vueltas / corporal',3,'Posición fija. Bajar vertical.','','normal'],
    [2,5,'Circuito',5,'plancha','Plancha frontal','35 seg × 3 vueltas / corporal',3,'Core apretado. Cadera ni arriba ni abajo.','','normal'],
  ];
}
