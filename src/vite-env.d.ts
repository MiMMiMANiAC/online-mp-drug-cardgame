/// <reference types="vite/client" />

interface Window {
  nebenwirkungenDesktop?: {
    onEscape: (handler: () => void) => () => void;
    platform: string;
    quitApp: () => void;
    toggleFullscreen: () => void;
    version: string;
  };
}
