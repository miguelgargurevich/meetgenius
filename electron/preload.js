// Puente seguro entre el renderer y el proceso principal.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("meetgenius", {
  platform: process.platform,
  isDesktop: true,
  version: process.env.npm_package_version || "0.1.0",
});
