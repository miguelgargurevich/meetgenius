// Puente seguro entre el renderer y el proceso principal.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("meetgenius", {
  platform: process.platform,
  isDesktop: true,
  version: process.env.npm_package_version || "0.1.0",

  // Estado del permiso de grabación de pantalla (para captura de audio del sistema).
  getScreenAccess: () => ipcRenderer.invoke("screen-access-status"),

  // Autodetección de reuniones.
  getMeetingStatus: () => ipcRenderer.invoke("meeting-status"),
  onMeetingStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on("meeting:status", handler);
    return () => ipcRenderer.removeListener("meeting:status", handler);
  },

  // Recordatorios de reuniones.
  setReminders: (cfg) => ipcRenderer.send("reminders-config", cfg),
  onReminderRecord: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on("reminder:record", handler);
    return () => ipcRenderer.removeListener("reminder:record", handler);
  },
});
