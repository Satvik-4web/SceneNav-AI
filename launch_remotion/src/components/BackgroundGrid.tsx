import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export const BackgroundGrid: React.FC<{ accentGlow?: boolean }> = ({ accentGlow = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow ambient drift
  const driftX = Math.sin((frame / fps) * 0.2) * 20;
  const driftY = Math.cos((frame / fps) * 0.15) * 15;
  const pulseScale = 1 + Math.sin((frame / fps) * 0.5) * 0.05;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Layer 1: Radial Glow Orbs */}
      {accentGlow && (
        <div
          style={{
            position: "absolute",
            width: 1200,
            height: 800,
            left: "50%",
            top: "40%",
            transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${pulseScale})`,
            background: `radial-gradient(circle, rgba(0, 240, 255, 0.07) 0%, rgba(5, 8, 13, 0) 70%)`,
            filter: "blur(40px)",
          }}
        />
      )}

      {/* Layer 2: Micro-Grid Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          backgroundPosition: "center center",
          opacity: 0.8,
        }}
      />

      {/* Layer 3: Tactical Corner Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 40%, rgba(5, 8, 13, 0.8) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
