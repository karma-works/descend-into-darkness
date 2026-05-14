// Entry point — Phase 0 stub. Boots when Phase 1+ systems are implemented.

const maraDisplay = document.getElementById("mara-display");
const stateDisplay = document.getElementById("state-display");
const depthLine = document.getElementById("depth-line");
const focusTrap = document.getElementById("focus-trap");
const eventLog = document.getElementById("event-log");

function logEvent(msg: string): void {
  if (!eventLog) return;
  const p = document.createElement("p");
  p.textContent = msg;
  eventLog.appendChild(p);
}

function setMaraLine(line: string): void {
  if (maraDisplay) maraDisplay.textContent = line;
}

function setState(state: string): void {
  if (stateDisplay) stateDisplay.textContent = state;
}

function setDepth(n: number): void {
  if (depthLine) depthLine.textContent = `Depth: ${n}`;
}

// Focus the game on load so keyboard input works immediately
window.addEventListener("load", () => {
  focusTrap?.focus();
  setMaraLine("Press Space or Enter to begin.");
  setState("MENU");
  logEvent("Descend into Darkness loaded. Press Space or Enter to start.");
});

// Placeholder: confirm game starts
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    setMaraLine("Rex. Stay close. And listen.");
    setState("PLAYING — Level 1");
    setDepth(1);
    logEvent("Game started. Level 1. Listen for Mara.");
  }
});

export { setMaraLine, setState, setDepth, logEvent };
