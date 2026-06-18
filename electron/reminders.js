// Recordatorios nativos antes de cada reunión con videollamada.
//
// Lee la agenda del día (EventKit) periódicamente y dispara una Notification
// nativa de macOS ~N minutos antes del inicio de cada evento con enlace de
// videollamada. Al hacer clic, enfoca la app y pide grabar ese evento.

const { Notification } = require("electron");
const { getTodayEvents } = require("./calendar");

const PLATFORM_LABEL = { meet: "Google Meet", teams: "Microsoft Teams", zoom: "Zoom", webex: "Webex" };

let config = { enabled: true, leadMinutes: 2 };
const notified = new Set(); // ids ya avisados (por sesión)

function setReminderConfig(partial) {
  config = { ...config, ...partial };
}

/**
 * Arranca el bucle de recordatorios.
 * @param {() => Electron.BrowserWindow|null} getWindow
 * @returns {() => void} función para detener
 */
function startReminders(getWindow) {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (config.enabled && Notification.isSupported()) {
      try {
        await checkAgenda(getWindow);
      } catch {
        /* ignoramos errores transitorios del calendario */
      }
    }
    if (!stopped) timer = setTimeout(tick, 30000);
  };

  let timer = setTimeout(tick, 5000); // primer chequeo a los 5s
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

async function checkAgenda(getWindow) {
  const { events } = await getTodayEvents();
  const now = Date.now();
  const leadMs = config.leadMinutes * 60 * 1000;

  for (const ev of events) {
    if (!ev.joinUrl && !ev.platform) continue; // solo videollamadas
    if (notified.has(ev.id)) continue;

    const start = new Date(ev.start).getTime();
    // Ventana: desde "lead" antes del inicio hasta 1 min después de empezar.
    if (now >= start - leadMs && now < start + 60000) {
      notified.add(ev.id);
      fireNotification(ev, start, now, getWindow);
    }
  }
}

function fireNotification(ev, start, now, getWindow) {
  const minutes = Math.max(0, Math.round((start - now) / 60000));
  const when = minutes <= 0 ? "está empezando" : `empieza en ${minutes} min`;
  const platform = ev.platform ? PLATFORM_LABEL[ev.platform] || ev.platform : "videollamada";

  const n = new Notification({
    title: `📅 ${ev.title}`,
    body: `${when} · ${platform}. Haz clic para grabarla con MeetGenius.`,
    silent: false,
  });

  n.on("click", () => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send("reminder:record", {
        title: ev.title,
        attendees: ev.attendees || [],
        platform: ev.platform || null,
        joinUrl: ev.joinUrl || null,
      });
    }
  });

  n.show();
}

module.exports = { startReminders, setReminderConfig };
