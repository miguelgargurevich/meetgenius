// MeetGenius — proceso principal de Electron.
// En desarrollo carga el servidor Next (localhost:3000).
// En producción levanta el servidor Next standalone embebido y lo carga.
const { app, BrowserWindow, shell, session, desktopCapturer, systemPreferences, ipcMain } = require("electron");
const path = require("path");

// Estado del permiso de grabación de pantalla (requisito del loopback en macOS).
ipcMain.handle("screen-access-status", () => {
  if (process.platform !== "darwin") return "granted";
  return systemPreferences.getMediaAccessStatus("screen"); // 'granted' | 'denied' | 'restricted' | 'not-determined'
});

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

  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });

  // Abrir enlaces externos en el navegador del sistema.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

// En producción, arranca el servidor Next standalone antes de abrir la ventana.
async function startProductionServer() {
  if (isDev) return;
  const serverPath = path.join(__dirname, "..", ".next", "standalone", "server.js");
  process.env.PORT = String(PORT);
  try {
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
