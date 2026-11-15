export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_DURATION_SEC = 65;
export const TOTAL_FRAMES = TOTAL_DURATION_SEC * FPS; // 1950 frames

export const COLORS = {
  background: "#03060a",
  navyDark: "#060d17",
  surface: "#0b1420",
  surfaceElevated: "#101d2e",
  primary: "#ffffff",
  muted: "#8ca0b8",
  accent: "#00f0ff",
  accentGlow: "rgba(0, 240, 255, 0.4)",
  highlight: "#10b981",
  highlightGlow: "rgba(16, 185, 129, 0.4)",
  warning: "#f59e0b",
  danger: "#ef4444",
  border: "rgba(255, 255, 255, 0.12)",
  borderAccent: "rgba(0, 240, 255, 0.35)",
};

export const TIMELINE_65S = {
  hook: { start: 0, duration: 8.0 },           // 00-08s: The Hook
  problem: { start: 8.0, duration: 9.0 },       // 08-17s: The Problem
  technology: { start: 17.0, duration: 12.0 },  // 17-29s: The Technology
  transformation: { start: 29.0, duration: 11.0 }, // 29-40s: The Transformation
  intelligence: { start: 40.0, duration: 10.0 },// 40-50s: The Intelligence
  pipeline: { start: 50.0, duration: 8.0 },     // 50-58s: The Pipeline
  brand: { start: 58.0, duration: 7.0 },        // 58-65s: The Brand Reveal
};

export const TIMELINE = {
  hook: { start: 0, duration: 10.8 },
  reveal: { start: 10.8, duration: 8.5 },
  matching: { start: 19.3, duration: 9.0 },
  inliers: { start: 28.3, duration: 9.0 },
  cadastral: { start: 37.3, duration: 8.5 },
  climax: { start: 45.8, duration: 12.2 },
};
