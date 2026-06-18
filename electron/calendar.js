// Lectura y escritura del calendario de macOS vía automatización de Calendar.app
// (JXA Application('Calendar')).
//
// NOTA: NO usamos EventKit a través de osascript. macOS termina cualquier
// proceso que llame a EventKit sin `NSCalendarsUsageDescription` en su Info.plist,
// y el binario /usr/bin/osascript no la tiene → crash. La automatización de
// Calendar.app usa permiso de "Automatización" (AppleEvents), que sí funciona
// desde osascript (lanza el diálogo "… quiere controlar Calendario").

const { spawn } = require("node:child_process");

function runJXA(script, timeoutMs = 60000) {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") return resolve({ error: "unsupported" });
    const child = spawn("osascript", ["-l", "JavaScript"]);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    // Evita que la UI se congele si el diálogo de Automatización no se responde.
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
      console.log("[calendar] JXA timeout (¿permiso de Automatización sin conceder?)");
      done({ error: "timeout" });
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => done({ error: "spawn" }));
    child.on("close", () => {
      const out = stdout.trim();
      if (!out) {
        const msg = stderr.trim().split("\n").slice(-1)[0] || "sin salida";
        if (!settled) console.log(`[calendar] JXA error: ${msg}`);
        return done({ error: "jxa", stderr: msg });
      }
      try {
        done(JSON.parse(out));
      } catch {
        done({ error: "parse", stderr: stderr.trim().slice(0, 300) });
      }
    });
    child.stdin.write(script + "\n");
    child.stdin.end();
  });
}

// ── Scripts JXA (Calendar.app) ─────────────────────────────────

function buildReadScript(startMs, endMs) {
  return `
function run() {
  var Cal = Application('Calendar');
  var start = new Date(${startMs});
  var end = new Date(${endMs});
  var out = [];
  var cals = Cal.calendars();
  for (var i = 0; i < cals.length; i++) {
    var set;
    try {
      set = cals[i].events.whose({ _and: [
        { startDate: { _greaterThanEquals: start } },
        { startDate: { _lessThan: end } }
      ]});
    } catch (e) { continue; }
    var titles, starts, ends, allday, locs, urls, descs, uids, calName;
    try {
      titles = set.summary();
      starts = set.startDate();
      ends = set.endDate();
      allday = set.alldayEvent();
      locs = set.location();
      urls = set.url();
      descs = set.description();
      uids = set.uid();
      calName = cals[i].name();
    } catch (e) { continue; }
    for (var j = 0; j < titles.length; j++) {
      out.push({
        id: uids[j] || (calName + ':' + j),
        title: titles[j] || '(sin título)',
        start: starts[j] ? starts[j].toISOString() : null,
        end: ends[j] ? ends[j].toISOString() : null,
        allDay: allday[j] ? true : false,
        location: locs[j] || '',
        url: urls[j] || '',
        notes: descs[j] || '',
        attendees: [],
        calendar: calName
      });
    }
  }
  return JSON.stringify({ events: out, calendars: cals.length });
}
`;
}

function buildCreateScript({ title, startMs, endMs, notes, url }) {
  return `
function run() {
  var Cal = Application('Calendar');
  var writables = Cal.calendars.whose({ writable: true })();
  var target = writables.length ? writables[0] : Cal.calendars()[0];
  if (!target) return JSON.stringify({ error: 'no-calendar' });
  var ev = Cal.Event({
    summary: ${JSON.stringify(title || "Reunión")},
    startDate: new Date(${startMs}),
    endDate: new Date(${endMs}),
    description: ${JSON.stringify(notes || "")},
    url: ${JSON.stringify(url || "")}
  });
  target.events.push(ev);
  return JSON.stringify({ id: ev.uid() });
}
`;
}

function findEventBlock(eventId) {
  return `
  var Cal = Application('Calendar');
  var cals = Cal.calendars();
  var found = null;
  for (var i = 0; i < cals.length; i++) {
    var m;
    try { m = cals[i].events.whose({ uid: ${JSON.stringify(eventId)} })(); } catch (e) { continue; }
    if (m && m.length) { found = m[0]; break; }
  }
`;
}

function buildUpdateScript({ eventId, title, startMs, endMs, notes, url }) {
  return `
function run() {
${findEventBlock(eventId)}
  if (!found) return JSON.stringify({ error: 'not-found' });
  found.summary = ${JSON.stringify(title || "Reunión")};
  found.startDate = new Date(${startMs});
  found.endDate = new Date(${endMs});
  found.description = ${JSON.stringify(notes || "")};
  found.url = ${JSON.stringify(url || "")};
  return JSON.stringify({ id: found.uid() });
}
`;
}

function buildDeleteScript(eventId) {
  return `
function run() {
${findEventBlock(eventId)}
  if (!found) return JSON.stringify({ ok: true });
  Application('Calendar').delete(found);
  return JSON.stringify({ ok: true });
}
`;
}

// ── Helpers de videollamada ────────────────────────────────────

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

const ms = (iso) => new Date(iso).getTime();

// ── API pública ────────────────────────────────────────────────

async function getEventsInRange(startISO, endISO) {
  if (process.platform !== "darwin") return { events: [] };
  const parsed = await runJXA(buildReadScript(ms(startISO), ms(endISO)));
  if (parsed.error) {
    console.log(`[calendar] range ${startISO}..${endISO} → error: ${parsed.error}${parsed.stderr ? " | " + parsed.stderr : ""}`);
    return { events: [], error: parsed.error };
  }
  const events = (parsed.events || [])
    .filter((ev) => ev.start && ev.end)
    .map((ev) => {
      const joinUrl = extractJoinUrl(ev);
      return { ...ev, joinUrl, platform: platformOf(joinUrl) };
    });
  console.log(`[calendar] range ${startISO}..${endISO} → ${events.length} eventos (calendarios: ${parsed.calendars})`);
  return { events, calendars: parsed.calendars };
}

function getTodayEvents() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return getEventsInRange(start.toISOString(), end.toISOString());
}

async function createCalendarEvent(payload) {
  if (process.platform !== "darwin") return { error: "unsupported" };
  return runJXA(buildCreateScript({ ...payload, startMs: ms(payload.startISO), endMs: ms(payload.endISO) }));
}

async function updateCalendarEvent(payload) {
  if (process.platform !== "darwin") return { error: "unsupported" };
  return runJXA(buildUpdateScript({ ...payload, startMs: ms(payload.startISO), endMs: ms(payload.endISO) }));
}

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
