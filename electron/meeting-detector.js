// Autodetección de llamadas activas (Google Meet / Microsoft Teams / Zoom) en macOS.
//
// Estrategia (sin dependencias nativas):
//  - Navegadores (Chrome/Edge/Brave/Arc/Safari): lee las URLs de las pestañas
//    vía AppleScript y busca patrones de "en llamada".
//  - Apps de escritorio (Zoom / Teams): inspecciona títulos de ventana vía
//    System Events.
//
// Requiere permisos de macOS: Automatización (navegadores) y Accesibilidad
// (títulos de ventana). Si faltan, el detector degrada en silencio.

const { execFile } = require("node:child_process");

// AppleScript que recolecta candidatos. Cada línea: "url|<URL>" o "title|<app>::<título>".
const SCRIPT = `
set output to ""
set chromiumApps to {"Google Chrome", "Google Chrome Canary", "Microsoft Edge", "Brave Browser", "Arc", "Vivaldi", "Opera"}

tell application "System Events" to set runningApps to name of every process

repeat with appName in chromiumApps
  if runningApps contains (appName as string) then
    try
      using terms from application "Google Chrome"
        tell application (appName as string)
          repeat with w in windows
            repeat with t in tabs of w
              set output to output & "url|" & (URL of t) & linefeed
            end repeat
          end repeat
        end tell
      end using terms from
    end try
  end if
end repeat

if runningApps contains "Safari" then
  try
    tell application "Safari"
      repeat with w in windows
        repeat with t in tabs of w
          set output to output & "url|" & (URL of t) & linefeed
        end repeat
      end repeat
    end tell
  end try
end if

repeat with deskApp in {"zoom.us", "MSTeams", "Microsoft Teams"}
  if runningApps contains (deskApp as string) then
    try
      tell application "System Events"
        repeat with w in windows of (first process whose name is (deskApp as string))
          set output to output & "title|" & (deskApp as string) & "::" & (name of w) & linefeed
        end repeat
      end tell
    end try
  end if
end repeat

return output
`;

const MEET_CALL = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
const TEAMS_CALL = /teams\.(microsoft|live)\.com\/.*(meetup-join|modern-calling|\/calling|l\/meetup)/i;

function classify(stdout) {
  const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const [kind, ...rest] = line.split("|");
    const value = rest.join("|");
    if (kind === "url") {
      if (MEET_CALL.test(value)) return { active: true, app: "meet", detail: "Google Meet" };
      if (TEAMS_CALL.test(value)) return { active: true, app: "teams", detail: "Microsoft Teams" };
    } else if (kind === "title") {
      const [app, title = ""] = value.split("::");
      if (app === "zoom.us" && /zoom meeting/i.test(title))
        return { active: true, app: "zoom", detail: "Zoom" };
      if (/teams/i.test(app) && /(meeting|call|llamada|reuni)/i.test(title))
        return { active: true, app: "teams", detail: "Microsoft Teams" };
    }
  }
  return { active: false, app: null, detail: null };
}

function runDetection() {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") return resolve({ active: false, app: null, detail: null });
    execFile("osascript", ["-e", SCRIPT], { timeout: 8000 }, (err, stdout) => {
      if (err) return resolve({ active: false, app: null, detail: null, error: true });
      resolve(classify(stdout || ""));
    });
  });
}

/**
 * Arranca el poller. Llama a `onChange(status)` solo cuando el estado cambia
 * (empieza o termina una llamada). Devuelve una función para detenerlo.
 */
function startMeetingDetector(onChange, intervalMs = 7000) {
  let last = null;
  let timer = null;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    const status = await runDetection();
    const key = `${status.active}:${status.app}`;
    if (key !== last) {
      last = key;
      onChange(status);
    }
    if (!stopped) timer = setTimeout(poll, intervalMs);
  };

  poll();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

module.exports = { startMeetingDetector, runDetection };
