import { interpolate, spring, Easing } from "remotion";

export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);
export const EASE_SMOOTH = Easing.bezier(0.25, 0.1, 0.25, 1);

export function fadeIn(
  frame: number,
  fps: number,
  delaySec: number = 0,
  durationSec: number = 0.5
): number {
  const start = delaySec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });
}

export function fadeOut(
  frame: number,
  fps: number,
  startSec: number,
  durationSec: number = 0.4
): number {
  const start = startSec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_SMOOTH,
  });
}

export function slideIn(
  frame: number,
  fps: number,
  delaySec: number = 0,
  distance: number = 30,
  durationSec: number = 0.6
): number {
  const start = delaySec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });
}

export function scaleIn(
  frame: number,
  fps: number,
  delaySec: number = 0,
  fromScale: number = 0.94,
  toScale: number = 1.0,
  durationSec: number = 0.7
): number {
  const start = delaySec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [fromScale, toScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });
}

export function blurIn(
  frame: number,
  fps: number,
  delaySec: number = 0,
  durationSec: number = 0.5,
  initialBlur: number = 8
): number {
  const start = delaySec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [initialBlur, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });
}

export function springPop(
  frame: number,
  fps: number,
  delaySec: number = 0,
  config?: { damping?: number; stiffness?: number; mass?: number }
): number {
  const delayFrames = Math.round(delaySec * fps);
  if (frame < delayFrames) return 0;
  return spring({
    frame: frame - delayFrames,
    fps,
    config: {
      damping: config?.damping ?? 16,
      stiffness: config?.stiffness ?? 220,
      mass: config?.mass ?? 0.8,
    },
  });
}

export function stagger(index: number, baseDelay: number = 0.2, step: number = 0.12): number {
  return baseDelay + index * step;
}

export function float(
  frame: number,
  fps: number,
  amplitude: number = 8,
  speedSec: number = 4,
  offsetDeg: number = 0
): number {
  const t = (frame / fps) * (2 * Math.PI / speedSec) + (offsetDeg * Math.PI / 180);
  return Math.sin(t) * amplitude;
}

export function pulse(
  frame: number,
  fps: number,
  amplitude: number = 0.04,
  speedSec: number = 3
): number {
  const t = (frame / fps) * (2 * Math.PI / speedSec);
  return 1 + Math.sin(t) * amplitude;
}

export function lightSweep(
  frame: number,
  fps: number,
  startSec: number = 1.0,
  durationSec: number = 1.2
): number {
  const start = startSec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
}

export function countUp(
  frame: number,
  fps: number,
  startSec: number,
  durationSec: number,
  fromVal: number,
  toVal: number
): number {
  const start = startSec * fps;
  const end = start + durationSec * fps;
  return interpolate(frame, [start, end], [fromVal, toVal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_EXPO,
  });
}

export function glitchOffset(
  frame: number,
  intensity: number = 4
): { x: number; y: number; opacity: number } {
  const seed = Math.sin(frame * 12.9898) * 43758.5453;
  const fract = seed - Math.floor(seed);
  if (fract > 0.85) {
    return {
      x: (fract - 0.9) * intensity * 20,
      y: (fract - 0.85) * intensity * 10,
      opacity: 0.8 + fract * 0.2,
    };
  }
  return { x: 0, y: 0, opacity: 1.0 };
}
