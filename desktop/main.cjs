const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let autoUpdater = null;
let latestUpdateStatus = {
  message: "Updates werden nur in der installierten App geprueft.",
  state: "idle",
};

try {
  autoUpdater = require("electron-updater").autoUpdater;
  autoUpdater.autoDownload = true;
} catch (error) {
  latestUpdateStatus = {
    message: "Updater konnte nicht geladen werden.",
    state: "error",
  };
}

function sendUpdateStatus(status) {
  latestUpdateStatus = { ...latestUpdateStatus, ...status };
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("app:update-status", latestUpdateStatus);
  });
}

function formatUpdateError(error) {
  const message = String(error?.message ?? error ?? "Unbekannter Fehler");
  const statusMatch = message.match(/\b(401|403|404|429|500|502|503)\b/);
  const status = statusMatch?.[1];

  if (status === "404") return "Update-Fehler: Release nicht erreichbar. Repo/Release ist privat, fehlt oder noch nicht veroeffentlicht.";
  if (status === "403") return "Update-Fehler: GitHub-Zugriff verweigert oder Rate-Limit erreicht.";
  if (status === "401") return "Update-Fehler: GitHub-Zugriff nicht autorisiert.";
  if (status === "429") return "Update-Fehler: Zu viele Anfragen. Bitte spaeter erneut versuchen.";
  if (status) return `Update-Fehler: Server meldet ${status}.`;

  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) return "Update-Fehler: Keine Verbindung zu GitHub.";
  if (/timeout|ETIMEDOUT/i.test(message)) return "Update-Fehler: Zeitueberschreitung beim Update-Check.";

  return "Update-Fehler: Update-Check fehlgeschlagen.";
}

function setupAutoUpdater() {
  if (!autoUpdater) return;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ message: "Suche nach Updates...", state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({
      message: `Update ${info.version ?? ""} gefunden. Download startet...`.trim(),
      state: "available",
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus({ message: "Du hast die aktuelle Version.", state: "idle" });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Number.isFinite(progress.percent) ? Math.round(progress.percent) : 0;
    sendUpdateStatus({
      message: `Update wird geladen: ${percent}%`,
      percent,
      state: "downloading",
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateStatus({
      message: `Update ${info.version ?? ""} ist bereit. Neustart installiert es.`.trim(),
      state: "ready",
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    sendUpdateStatus({
      message: formatUpdateError(error),
      state: "error",
    });
  });
}

function checkForUpdates() {
  if (isDev || !app.isPackaged) {
    sendUpdateStatus({
      message: "Updates funktionieren erst in der installierten Version.",
      state: "idle",
    });
    return;
  }

  if (!autoUpdater) {
    sendUpdateStatus({ message: "Updater ist nicht verfuegbar.", state: "error" });
    return;
  }

  autoUpdater.checkForUpdates().catch((error) => {
    sendUpdateStatus({
      message: formatUpdateError(error),
      state: "error",
    });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#050707",
    title: "Nebenwirkungen",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || input.key !== "Escape") return;
    event.preventDefault();
    window.webContents.send("app:escape");
  });

  if (isDev) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  window.webContents.once("did-finish-load", () => {
    window.webContents.send("app:update-status", latestUpdateStatus);
  });
}

app.whenReady().then(() => {
  setupAutoUpdater();

  ipcMain.on("app:quit", () => {
    app.quit();
  });
  ipcMain.on("app:toggle-fullscreen", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    window.setFullScreen(!window.isFullScreen());
  });
  ipcMain.on("app:check-for-updates", () => {
    checkForUpdates();
  });
  ipcMain.on("app:install-update", () => {
    if (!autoUpdater) return;
    autoUpdater.quitAndInstall(false, true);
  });

  createWindow();
  setTimeout(checkForUpdates, 2500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
