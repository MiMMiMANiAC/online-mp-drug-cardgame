import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

function updateStageScale() {
  const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  document.documentElement.style.setProperty("--stage-scale", String(scale));
}

updateStageScale();
window.addEventListener("resize", updateStageScale);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
