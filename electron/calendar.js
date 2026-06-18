// Lectura y escritura del calendario de macOS vía EventKit (script JXA).
//
// Usa EventKit directamente (rápido e indexado), NO automatización de
// Calendario.app (lento). Lee TODAS las cuentas agregadas en macOS:
// iCloud, Google y Microsoft 365 / Outlook.
//
// Requiere permiso de "Calendarios" (TCC). En producción, el Info.plist debe
// incluir NSCalendarsUsageDescription / NSCalendarsFullAccessUsageDescription.

const { spawn } = require("node:child_process");

// Bloque común: solicita acceso completo a EventKit y espera el callback.
const REQUEST_ACCESS = `
  var store = $.EKEventStore.alloc.init;
  var done = false, granted = false;
  var handler = $(function(g, err) { granted = g; done = true; });
  if (typeof store.requestFullAccessToEventsCompletion === 'function') {
    store.requestFullAccessToEventsCompletion(handler);
  } else {
    store.requestAccessToEntityTypeCompletion(0 /* EKEntityTypeEvent */, handler);
  }
  var deadline = $.NSDate.dateWithTimeIntervalSinceNow(10);
  while (!done && $.NSDate.date.compare(deadline) < 0) {
    $.NSRunLoop.currentRunLoop.runModeBeforeDate(
      $.NSDefaultRunLoopMode, $.NSDate.dateWithTimeIntervalSinceNow(0.05)
    );
  }
  if (!granted) return JSON.stringify({ error: 'no-access' });
`;

// Script de LECTURA: eventos en [start, end). Las fechas se pasan como
// epoch (segundos) para evitar problemas de parseo ISO en macOS.
function buildReadScript(startEpoch, endEpoch) {
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');
function run() {
${REQUEST_ACCESS}
  var fmt = $.NSISO8601DateFormatter.alloc.init;
  var start = $.NSDate.dateWithTimeIntervalSince1970(${startEpoch});
  var end = $.NSDate.dateWithTimeIntervalSince1970(${endEpoch});
  var pred = store.predicateForEventsWithStartDateEndDateCalendars(start, end, $());
  var events = store.eventsMatchingPredicate(pred);
  var out = [];
  var n = events.count;
  for (var i = 0; i < n; i++) {
    var ev = events.objectAtIndex(i);
    var attendees = [];
    try {
      var att = ev.attendees;
      if (att) {
        for (var j = 0; j < att.count; j++) {
          var nm = att.objectAtIndex(j).name;
          if (nm && !nm.isEqualToString('')) attendees.push(ObjC.unwrap(nm));
        }
      }
    } catch (e) {}
    out.push({
      id: ObjC.unwrap(ev.eventIdentifier) || String(i),
      title: ev.title ? ObjC.unwrap(ev.title) : '(sin título)',
      start: ObjC.unwrap(fmt.stringFromDate(ev.startDate)),
      end: ObjC.unwrap(fmt.stringFromDate(ev.endDate)),
      allDay: ev.allDay ? true : false,
      location: ev.location ? ObjC.unwrap(ev.location) : '',
      url: ev.URL ? ObjC.unwrap(ev.URL.absoluteString) : '',
      notes: ev.notes ? ObjC.unwrap(ev.notes) : '',
      attendees: attendees,
      calendar: ev.calendar && ev.calendar.title ? ObjC.unwrap(ev.calendar.title) : ''
    });
  }
  return JSON.stringify({ events: out });
}
`;
}

// Script de ESCRITURA: crea un evento en el calendario por defecto.
function buildCreateScript({ title, startEpoch, endEpoch, notes, url }) {
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');
function run() {
${REQUEST_ACCESS}
  var ev = $.EKEvent.eventWithEventStore(store);
  ev.title = ${JSON.stringify(title || "Reunión")};
  ev.startDate = $.NSDate.dateWithTimeIntervalSince1970(${startEpoch});
  ev.endDate = $.NSDate.dateWithTimeIntervalSince1970(${endEpoch});
  var notes = ${JSON.stringify(notes || "")};
  if (notes) ev.notes = notes;
  var url = ${JSON.stringify(url || "")};
  if (url) { try { ev.URL = $.NSURL.URLWithString(url); } catch (e) {} }
  ev.calendar = store.defaultCalendarForNewEvents;
  var err = $();
  var ok = store.saveEventSpanError(ev, 0 /* EKSpanThisEvent */, err);
  if (!ok) return JSON.stringify({ error: 'save-failed' });
  return JSON.stringify({ id: ObjC.unwrap(ev.eventIdentifier) });
}
`;
}

// Script de ACTUALIZACIÓN de un evento existente por su identificador.
function buildUpdateScript({ eventId, title, startEpoch, endEpoch, notes, url }) {
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');
function run() {
${REQUEST_ACCESS}
  var ev = store.eventWithIdentifier(${JSON.stringify(eventId)});
  if (!ev || !ObjC.unwrap(ev.eventIdentifier)) return JSON.stringify({ error: 'not-found' });
  ev.title = ${JSON.stringify(title || "Reunión")};
  ev.startDate = $.NSDate.dateWithTimeIntervalSince1970(${startEpoch});
  ev.endDate = $.NSDate.dateWithTimeIntervalSince1970(${endEpoch});
  ev.notes = ${JSON.stringify(notes || "")};
  var url = ${JSON.stringify(url || "")};
  if (url) { try { ev.URL = $.NSURL.URLWithString(url); } catch (e) {} }
  var err = $();
  var ok = store.saveEventSpanError(ev, 0, err);
  if (!ok) return JSON.stringify({ error: 'save-failed' });
  return JSON.stringify({ id: ObjC.unwrap(ev.eventIdentifier) });
}
`;
}

// Script de ELIMINACIÓN de un evento por su identificador.
function buildDeleteScript(eventId) {
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');
function run() {
${REQUEST_ACCESS}
  var ev = store.eventWithIdentifier(${JSON.stringify(eventId)});
  if (!ev || !ObjC.unwrap(ev.eventIdentifier)) return JSON.stringify({ ok: true }); // ya no existe
  var err = $();
  var ok = store.removeEventSpanError(ev, 0, err);
  return JSON.stringify({ ok: ok ? true : false });
}
`;
}

function runJXA(script) {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") return resolve({ error: "unsupported" });
    const child = spawn("osascript", ["-l", "JavaScript"]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve({ error: "spawn" }));
    child.on("close", () => {
      try {
        resolve(JSON.parse(stdout.trim() || "{}"));
      } catch {
        resolve({ error: stderr ? "script" : "parse" });
      }
    });
    child.stdin.write(script + "\n");
    child.stdin.end();
  });
}

// Extrae un enlace de videollamada de los campos de texto del evento.
const JOIN_RE = /(https?:\/\/[^\s"'<>]*(?:teams\.microsoft\.com|teams\.live\.com|meet\.google\.com|zoom\.us|webex\.com)[^\s"'<>]*)/i;

function extractJoinUrl(ev) {
  for (const field of [ev.url, ev.location, ev.notes]) {
    const m = field && field.match(JOIN_RE);
    if (m) return m[1];
  }
  return null;
}

function platformOf(joinUrl) {
  if (!joinUrl) return null;
  if (/teams\./i.test(joinUrl)) return "teams";
  if (/meet\.google\.com/i.test(joinUrl)) return "meet";
  if (/zoom\.us/i.test(joinUrl)) return "zoom";
  if (/webex\.com/i.test(joinUrl)) return "webex";
  return null;
}

const toEpoch = (iso) => Math.floor(new Date(iso).getTime() / 1000);

/** Eventos (con videollamada detectada) en el rango [startISO, endISO). */
async function getEventsInRange(startISO, endISO) {
  if (process.platform !== "darwin") return { events: [] };
  const parsed = await runJXA(buildReadScript(toEpoch(startISO), toEpoch(endISO)));
  if (parsed.error) return { events: [], error: parsed.error };
  const events = (parsed.events || [])
    .filter((ev) => !ev.allDay)
    .map((ev) => {
      const joinUrl = extractJoinUrl(ev);
      return { ...ev, joinUrl, platform: platformOf(joinUrl) };
    });
  return { events };
}

/** Eventos de hoy (wrapper de getEventsInRange para la agenda). */
function getTodayEvents() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return getEventsInRange(start.toISOString(), end.toISOString());
}

/** Crea un evento en el calendario por defecto. Devuelve { id } o { error }. */
async function createCalendarEvent(payload) {
  if (process.platform !== "darwin") return { error: "unsupported" };
  return runJXA(
    buildCreateScript({
      ...payload,
      startEpoch: toEpoch(payload.startISO),
      endEpoch: toEpoch(payload.endISO),
    }),
  );
}

/** Actualiza un evento existente. Devuelve { id } o { error }. */
async function updateCalendarEvent(payload) {
  if (process.platform !== "darwin") return { error: "unsupported" };
  return runJXA(
    buildUpdateScript({
      ...payload,
      startEpoch: toEpoch(payload.startISO),
      endEpoch: toEpoch(payload.endISO),
    }),
  );
}

/** Elimina un evento por su identificador. Devuelve { ok } o { error }. */
async function deleteCalendarEvent(eventId) {
  if (process.platform !== "darwin") return { error: "unsupported" };
  return runJXA(buildDeleteScript(eventId));
}

module.exports = {
  getTodayEvents,
  getEventsInRange,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
