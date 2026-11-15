export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const DURATION_SECONDS = 65;
export const TOTAL_FRAMES = FPS * DURATION_SECONDS;

export const COLORS = {
  ink: '#03070d',
  navy: '#071321',
  deep: '#0a1d2c',
  white: '#f5fbff',
  muted: '#8ca5b8',
  cyan: '#13d8ff',
  cyanDim: '#087d98',
  emerald: '#42e7b3',
  amber: '#f4b467',
  line: 'rgba(130, 205, 232, 0.18)',
};

export const TIMELINE = {
  hook: {start: 0, duration: 8},
  problem: {start: 8, duration: 9},
  technology: {start: 17, duration: 12},
  transformation: {start: 29, duration: 11},
  intelligence: {start: 40, duration: 10},
  pipeline: {start: 50, duration: 8},
  brand: {start: 58, duration: 7},
} as const;

export const fontDisplay = '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif';
export const fontMono = '"JetBrains Mono", "Cascadia Mono", Consolas, monospace';
