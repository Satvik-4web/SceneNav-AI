import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export const CinematicMasterHUD: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalSec = frame / fps;
  const isDenied = totalSec >= 4.5;

  // Format timecode: 00:MM:SS:FF
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const frames = Math.floor(frame % fps);
  const timecode = `T+00:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;

  // Audio waveform simulation
  const numBars = 36;
  const bars = Array.from({ length: numBars }).map((_, i) => {
    const wave = Math.sin((frame * 0.15) + (i * 0.35)) * 0.5 + 0.5;
    const wave2 = Math.cos((frame * 0.08) - (i * 0.2)) * 0.5 + 0.5;
    return Math.max(0.15, (wave * 0.6 + wave2 * 0.4));
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {/* 1. Tactical Framing Corners */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 32,
          height: 32,
          borderTop: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          borderLeft: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          boxShadow: isDenied ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(0, 240, 255, 0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 32,
          height: 32,
          borderTop: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          borderRight: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          boxShadow: isDenied ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(0, 240, 255, 0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          width: 32,
          height: 32,
          borderBottom: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          borderLeft: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          boxShadow: isDenied ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(0, 240, 255, 0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 32,
          height: 32,
          borderBottom: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          borderRight: `2px solid ${isDenied ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 240, 255, 0.7)"}`,
          boxShadow: isDenied ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(0, 240, 255, 0.4)",
        }}
      />

      {/* 2. Top Right Mission Timecode */}
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 64,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "6px 16px",
          backgroundColor: "rgba(5, 10, 16, 0.88)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 6,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: isDenied ? "#ef4444" : "#10b981",
            boxShadow: `0 0 8px ${isDenied ? "#ef4444" : "#10b981"}`,
          }}
        />
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#ffffff",
          }}
        >
          {timecode}
        </span>
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 11,
            color: COLORS.muted,
            borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
            paddingLeft: 12,
          }}
        >
          DRDO-AERO // 30 FPS
        </span>
      </div>

      {/* 3. Bottom Right Geodetic Grid Ticker */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          right: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "6px 16px",
          backgroundColor: "rgba(5, 10, 16, 0.88)",
          border: "1px solid rgba(0, 240, 255, 0.2)",
          borderRadius: 6,
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 12,
            letterSpacing: 1.5,
            color: COLORS.accent,
          }}
        >
          UTM 32N 491230E 5334120N
        </span>
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 11,
            color: COLORS.muted,
          }}
        >
          WGS-84 ELLIPSOID
        </span>
      </div>

      {/* 4. Bottom Left Real-Time Audio Visualizer Pulse */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 64,
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 24,
          padding: "4px 10px",
          backgroundColor: "rgba(5, 10, 16, 0.75)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 10,
            color: COLORS.muted,
            marginRight: 6,
            letterSpacing: 1,
            alignSelf: "center",
          }}
        >
          AUDIO SPECTRUM
        </span>
        {bars.map((height, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: `${height * 18}px`,
              backgroundColor: isDenied
                ? i > 28 ? "#ef4444" : "#00f0ff"
                : "#00f0ff",
              borderRadius: 1,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      {/* 5. Subtle Ambient Vignette & Scanline Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 65%, rgba(0, 0, 0, 0.45) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
