const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nebenwirkungenDesktop", {
  onEscape: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("app:escape", listener);
    return () => ipcRenderer.removeListener("app:escape", listener);
  },
  platform: process.platform,
  quitApp: () => ipcRenderer.send("app:quit"),
  toggleFullscreen: () => ipcRenderer.send("app:toggle-fullscreen"),
  version: process.env.npm_package_version ?? "0.1.0",
});
