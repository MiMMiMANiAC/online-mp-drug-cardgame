const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nebenwirkungenDesktop", {
  onEscape: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("app:escape", listener);
    return () => ipcRenderer.removeListener("app:escape", listener);
  },
  onUpdateStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on("app:update-status", listener);
    return () => ipcRenderer.removeListener("app:update-status", listener);
  },
  platform: process.platform,
  checkForUpdates: () => ipcRenderer.send("app:check-for-updates"),
  installUpdate: () => ipcRenderer.send("app:install-update"),
  quitApp: () => ipcRenderer.send("app:quit"),
  toggleFullscreen: () => ipcRenderer.send("app:toggle-fullscreen"),
  version: process.env.npm_package_version ?? "0.1.0",
});
