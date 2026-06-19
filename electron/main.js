// MeetGenius — proceso principal de Electron.
// En desarrollo carga el servidor Next (localhost:3000).
// En producción levanta el servidor Next standalone embebido y lo carga.
const { app, BrowserWindow, shell, session, desktopCapturer, systemPreferences, ipcMain } = require("electron");
const path = require("path");
const { startMeetingDetector, runDetection } = require("./meeting-detector");
const { startReminders, setReminderConfig } = require("./reminders");

// Estado del permiso de grabación de pantalla (requisito del loopback en macOS).
ipcMain.handle("screen-access-status", () => {
  if (process.platform !== "darwin") return "granted";
  return systemPreferences.getMediaAccessStatus("screen"); // 'granted' | 'denied' | 'restricted' | 'not-determined'
});

// Consulta puntual del estado de reunión (además del push periódico).
ipcMain.handle("meeting-status", () => runDetection());

// El calendario ahora se lee server-side vía /api/calendar (suscripciones ICS).

// Configuración de recordatorios (on/off + minutos de antelación).
ipcMain.on("reminders-config", (_e, cfg) => setReminderConfig(cfg || {}));

let stopDetector = null;
let stopReminders = null;

const isDev = process.env.ELECTRON_DEV === "1";
const PORT = process.env.PORT || 3000;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset", // estética macOS
    trafficLightPosition: { x: 16, y: 18 }, // semáforos alineados con la cabecera
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Permitir acceso a micrófono y captura de pantalla/audio.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(["media", "display-capture", "audioCapture"].includes(permission));
  });

  // Captura del AUDIO DEL SISTEMA (voces de los demás en Meet/Teams).
  // En macOS 13+, `audio: "loopback"` usa ScreenCaptureKit: cuando el
  // renderer llama getDisplayMedia(), devolvemos una fuente de pantalla
  // con loopback de audio, sin mostrar el selector nativo.
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen"] })
        .then((sources) => {
          callback({ video: sources[0], audio: "loopback" });
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: false },
  );

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // DevTools solo si DEVTOOLS=1 (evita ruido en consola). Atajo: Cmd+Opt+I.
  if (isDev && process.env.DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Abrir enlaces externos en el navegador del sistema.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Autodetección de llamadas: notifica al renderer cuando cambia el estado.
  stopDetector = startMeetingDetector((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("meeting:status", status);
    }
  });

  // Recordatorios nativos antes de cada reunión con videollamada.
  stopReminders = startReminders(() => mainWindow, PORT);

  mainWindow.on("closed", () => {
    if (stopDetector) stopDetector();
    if (stopReminders) stopReminders();
    stopDetector = null;
    stopReminders = null;
    mainWindow = null;
  });
}

// Carga un archivo .env (formato KEY=VALUE) e inyecta en process.env.
function loadEnvFile(file) {
  try {
    const fs = require("fs");
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i < 0) continue;
      const key = trimmed.slice(0, i).trim();
      const val = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

// En producción, arranca el servidor Next standalone antes de abrir la ventana.
async function startProductionServer() {
  if (isDev) return;
  // Empaquetado: el standalone va como extraResources (Contents/Resources/standalone).
  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");

  // Configuración runtime: .env empaquetado (claves de IA) + DB embebida.
  loadEnvFile(path.join(standaloneDir, ".env"));
  loadEnvFile(path.join(__dirname, "..", ".env"));

  // Base de datos SQLite en el directorio de datos del usuario (escribible).
  // Copiamos el template empaquetado en el primer arranque, y lo refrescamos si
  // cambió la versión del esquema (evita DBs desfasadas tras actualizar la app).
  // Nota: refrescar reinicia los datos locales; mientras el esquema esté en
  // evolución es el comportamiento esperado (migraciones formales más adelante).
  const DB_SCHEMA_VERSION = "4"; // súbelo al cambiar el schema de Prisma
  const fs = require("fs");
  const dbPath = path.join(app.getPath("userData"), "meetgenius.db");
  const versionPath = path.join(app.getPath("userData"), "db.version");
  const template = path.join(standaloneDir, "prisma", "template.db");
  let currentVersion = null;
  try {
    currentVersion = fs.readFileSync(versionPath, "utf8").trim();
  } catch {
    /* sin versión previa */
  }
  if (!fs.existsSync(dbPath) || currentVersion !== DB_SCHEMA_VERSION) {
    try {
      if (fs.existsSync(template)) {
        fs.copyFileSync(template, dbPath);
        fs.writeFileSync(versionPath, DB_SCHEMA_VERSION);
        console.log(`[db] base inicializada (esquema v${DB_SCHEMA_VERSION})`);
      }
    } catch (err) {
      console.error("No se pudo inicializar la base de datos:", err);
    }
  }
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.NODE_ENV = "production";
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";

  try {
    process.chdir(standaloneDir); // el server standalone resuelve rutas relativas a su dir
    require(serverPath);
    await waitForPort(PORT);
  } catch (err) {
    console.error("No se pudo iniciar el servidor Next standalone:", err);
  }
}

function waitForPort(port, timeout = 15000) {
  const net = require("net");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.on("connect", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

app.whenReady().then(async () => {
  await startProductionServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
