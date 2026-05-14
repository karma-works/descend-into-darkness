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

const aria = new ARIALog(eventLog, maraAlert);
const input = new Input(window);
const game = new Game(input, aria, {
  setMaraLine(line: string): void {
    if (maraDisplay) maraDisplay.textContent = line;
  },
  setState(state: string): void {
    if (stateDisplay) stateDisplay.textContent = state;
  },
  setDepth(depth: number): void {
    if (depthLine) depthLine.textContent = `Depth: ${depth}`;
  },
  setPingReady(ready: boolean, secondsLeft?: number): void {
    if (!pingIndicator) return;
    pingIndicator.className = ready ? "ready" : "cooldown";
    pingIndicator.textContent = ready ? "[ Q ] Echolocation — ready" : `[ Q ] Echolocation — ${secondsLeft ?? 1}s`;
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
