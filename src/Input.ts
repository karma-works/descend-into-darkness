export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  fire: boolean;
  echolocate: boolean;
  interact: boolean;
  pause: boolean;
  mute: boolean;
}

const DEFAULT_STATE: InputState = {
  left: false,
  right: false,
  jump: false,
  fire: false,
  echolocate: false,
  interact: false,
  pause: false,
  mute: false,
};

export class Input {
  readonly state: InputState = { ...DEFAULT_STATE };
  private pressedThisFrame = new Set<keyof InputState>();

  constructor(private readonly target: HTMLElement | Window) {
    this.target.addEventListener("keydown", this.onKeyDown as EventListener);
    this.target.addEventListener("keyup", this.onKeyUp as EventListener);
  }

  consume(action: keyof InputState): boolean {
    if (!this.pressedThisFrame.has(action)) return false;
    this.pressedThisFrame.delete(action);
    return true;
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
  }

  destroy(): void {
    this.target.removeEventListener("keydown", this.onKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.onKeyUp as EventListener);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = this.mapKey(event.code);
    if (!action) return;
    event.preventDefault();
    if (!this.state[action]) this.pressedThisFrame.add(action);
    this.state[action] = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = this.mapKey(event.code);
    if (!action) return;
    event.preventDefault();
    this.state[action] = false;
  };

  private mapKey(code: string): keyof InputState | undefined {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        return "left";
      case "ArrowRight":
      case "KeyD":
        return "right";
      case "Space":
      case "ArrowUp":
        return "jump";
      case "KeyF":
        return "fire";
      case "KeyQ":
        return "echolocate";
      case "KeyE":
        return "interact";
      case "Escape":
        return "pause";
      case "KeyM":
        return "mute";
      default:
        return undefined;
    }
  }
}
