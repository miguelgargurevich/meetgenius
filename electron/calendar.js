// Lectura del calendario de macOS vía EventKit (script JXA).
//
// Usa EventKit directamente (rápido e indexado), NO automatización de
// Calendario.app (lento). Lee TODAS las cuentas agregadas en macOS:
// iCloud, Google y Microsoft 365 / Outlook.
//
// Requiere permiso de "Calendarios" (TCC). En producción, el Info.plist debe
// incluir NSCalendarsUsageDescription / NSCalendarsFullAccessUsageDescription.

const { spawn } = require("node:child_process");

// Script JXA: pide acceso a EventKit y devuelve los eventos de hoy en JSON.
const JXA = `
ObjC.import('EventKit');
ObjC.import('Foundation');

function run() {
  var store = $.EKEventStore.alloc.init;

  // Solicitud de acceso (compat. macOS 14+ y anteriores) — esperamos el callback.
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
      $.NSDefaultRunLoopMode,
      $.NSDate.dateWithTimeIntervalSinceNow(0.05)
    );
  }
  if (!granted) return JSON.stringify({ error: 'no-access' });

  var cal = $.NSCalendar.currentCalendar;
  var now = $.NSDate.date;
  var startOfDay = cal.startOfDayForDate(now);
  var comps = $.NSDateComponents.alloc.init;
  comps.day = 1;
  var endOfDay = cal.dateByAddingComponentsToDateOptions(comps, startOfDay, 0);

  var pred = store.predicateForEventsWithStartDateEndDateCalendars(startOfDay, endOfDay, $());
  var events = store.eventsMatchingPredicate(pred);

  var fmt = $.NSISO8601DateFormatter.alloc.init;
  var out = [];
  var n = events.count;
  for (var i = 0; i < n; i++) {
    var ev = events.objectAtIndex(i);
    if (ev.allDay) continue;

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

/** Devuelve los eventos de hoy con metadatos de videollamada. */
function getTodayEvents() {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") return resolve({ events: [] });

    const child = spawn("osascript", ["-l", "JavaScript"]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve({ events: [], error: "spawn" }));
    child.on("close", () => {
      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (parsed.error) return resolve({ events: [], error: parsed.error });
        const events = (parsed.events || []).map((ev) => {
          const joinUrl = extractJoinUrl(ev);
          return { ...ev, joinUrl, platform: platformOf(joinUrl) };
        });
        resolve({ events });
      } catch {
        resolve({ events: [], error: stderr ? "script" : "parse" });
      }
    });

    child.stdin.write(JXA + "\n");
    child.stdin.end();
  });
}

module.exports = { getTodayEvents };
