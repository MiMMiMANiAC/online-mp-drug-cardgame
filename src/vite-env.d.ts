/// <reference types="vite/client" />

interface Window {
  nebenwirkungenDesktop?: {
    checkForUpdates: () => void;
    installUpdate: () => void;
    onEscape: (handler: () => void) => () => void;
    onUpdateStatus: (handler: (status: DesktopUpdateStatus) => void) => () => void;
    platform: string;
    quitApp: () => void;
    toggleFullscreen: () => void;
    version: string;
  };
}

type DesktopUpdateStatus = {
  message: string;
  percent?: number;
  state: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  version?: string;
};
