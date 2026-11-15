import {Easing, interpolate, spring} from 'remotion';

export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const smooth = Easing.bezier(0.25, 0.1, 0.25, 1);

export const clamp = (value: number, from: number, to: number) =>
  interpolate(value, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: expo,
  });

export const enter = (frame: number, fps: number, delay = 0, duration = 0.55) =>
  clamp(frame, delay * fps, (delay + duration) * fps);

export const exit = (frame: number, fps: number, sceneDuration: number, duration = 0.38) =>
  1 - clamp(frame, (sceneDuration - duration) * fps, sceneDuration * fps);

export const premiumSpring = (frame: number, fps: number, delay = 0) => {
  if (frame < delay * fps) return 0;
  return spring({
    frame: frame - delay * fps,
    fps,
    config: {damping: 200, stiffness: 90, mass: 1.6},
  });
};

export const sceneStyle = (frame: number, fps: number, duration: number) => {
  const out = exit(frame, fps, duration, 0.42);
  return {
    opacity: out,
    transform: `scale(${0.965 + out * 0.035})`,
    filter: `blur(${(1 - out) * 7}px)`,
  } as const;
};
