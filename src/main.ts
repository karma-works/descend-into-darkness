import { ARIALog } from "./ARIALog";
import { Game } from "./Game";
import { Input } from "./Input";

const maraDisplay = document.getElementById("mara-display");
const stateDisplay = document.getElementById("state-display");
const depthLine = document.getElementById("depth-line");
const focusTrap = document.getElementById("focus-trap");
const eventLog = document.getElementById("event-log");
const maraAlert = document.getElementById("mara-alert");
const pingIndicator = document.getElementById("ping-indicator");
const visualEventList = document.getElementById("visual-event-list");
const stateValue = document.getElementById("state-value");
const depthValue = document.getElementById("depth-value");
const hpValue = document.getElementById("hp-value");
const gemsValue = document.getElementById("gems-value");
const pingTile = document.getElementById("ping-tile");
const pingValue = document.getElementById("ping-value");
const modeValue = document.getElementById("mode-value");

const aria = new ARIALog(eventLog, maraAlert, addVisualEvent);
const input = new Input(window);
const game = new Game(input, aria, {
  setMaraLine(line: string): void {
    if (maraDisplay) maraDisplay.textContent = line;
  },
  setState(state: string): void {
    if (stateDisplay) stateDisplay.textContent = state;
    updateStatusTiles(state);
  },
  setDepth(depth: number): void {
    if (depthLine) depthLine.textContent = `Depth: ${depth}`;
    if (depthValue) depthValue.textContent = String(depth);
  },
  setPingReady(ready: boolean, secondsLeft?: number): void {
    if (!pingIndicator) return;
    pingIndicator.className = ready ? "ready" : "cooldown";
    pingIndicator.textContent = ready ? "[ Q ] Echolocation — ready" : `[ Q ] Echolocation — ${secondsLeft ?? 1}s`;
    if (pingTile) pingTile.className = `status-tile ${ready ? "ready" : "cooldown"}`;
    if (pingValue) pingValue.textContent = ready ? "Ready" : `${secondsLeft ?? 1}s`;
  },
  setMode(mode: string): void {
    if (modeValue) modeValue.textContent = mode;
  },
});

window.addEventListener("load", () => {
  focusTrap?.focus();
  aria.logEvent("Descend into Darkness loaded. Press Space or Enter to start.");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    void game.begin();
  }
});

window.addEventListener("beforeunload", () => {
  game.destroy();
  input.destroy();
});

function updateStatusTiles(status: string): void {
  const parts = status.split("—").map((part) => part.trim());
  if (stateValue && parts[0]) stateValue.textContent = titleCase(parts[0]);

  for (const part of parts.slice(1)) {
    const [label, value] = part.split(/\s+(.+)/);
    if (!value) continue;
    if (label === "Level" && depthValue) depthValue.textContent = value;
    if (label === "HP" && hpValue) hpValue.textContent = value;
    if (label === "Gems" && gemsValue) gemsValue.textContent = value;
  }
}

function addVisualEvent(message: string, critical: boolean): void {
  if (!visualEventList) return;
  const item = document.createElement("li");
  item.textContent = message;
  if (critical) {
    item.classList.add("critical");
    flashCritical();
  }
  visualEventList.prepend(item);
  while (visualEventList.childElementCount > 5) {
    visualEventList.lastElementChild?.remove();
  }
}

function flashCritical(): void {
  document.body.classList.remove("critical-flash");
  void document.body.offsetWidth;
  document.body.classList.add("critical-flash");
  window.setTimeout(() => document.body.classList.remove("critical-flash"), 700);
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
