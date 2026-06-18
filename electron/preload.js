// Puente seguro entre el renderer y el proceso principal.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("meetgenius", {
  platform: process.platform,
  isDesktop: true,
  version: process.env.npm_package_version || "0.1.0",
  // Estado del permiso de grabación de pantalla (para captura de audio del sistema).
  getScreenAccess: () => ipcRenderer.invoke("screen-access-status"),
});
