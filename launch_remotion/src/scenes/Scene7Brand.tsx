import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop } from "../utils/animations";

export const Scene7Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 7.0;

  // Convergence & Spring animations
  const logoScale = springPop(frame, fps, 0.15, { damping: 14, stiffness: 220, mass: 0.8 });
  const logoOpacity = fadeIn(frame, fps, 0.15, 0.4);
  const subOpacity = fadeIn(frame, fps, 0.8, 0.5);

  // Concentric Target Reticle Pulse
  const ringScale = 1 + Math.sin((frame / fps) * 2) * 0.04;

  // Master fade out to pure black at the end
  const masterFade = fadeOut(frame, fps, durationSec - 0.8, 0.8);

  return (
    <AbsoluteFill
      style={{
        opacity: masterFade,
        backgroundColor: COLORS.background,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background Volumetric Cyan Radial Glow */}
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(5, 8, 13, 0) 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Main Brand Hero Assembly */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          zIndex: 10,
        }}
      >
        {/* Converged Glowing Spatial Reticle */}
        <div
          style={{
            position: "relative",
            width: 110,
            height: 110,
            borderRadius: "50%",
            border: "2px solid #00f0ff",
            boxShadow: "0 0 36px rgba(0, 240, 255, 0.5), inset 0 0 24px rgba(0, 240, 255, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            transform: `scale(${ringScale})`,
          }}
        >
          {/* Internal Crosshairs */}
          <div
            style={{
              position: "absolute",
              width: 130,
              height: 1,
              backgroundColor: "rgba(0, 240, 255, 0.6)",
            }}
          />
          <div
            style={{
              position: "absolute",
              height: 130,
              width: 1,
              backgroundColor: "rgba(0, 240, 255, 0.6)",
            }}
          />
          {/* Center Core */}
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "#00f0ff",
              boxShadow: "0 0 16px #00f0ff",
              zIndex: 2,
            }}
          />
        </div>

        {/* Primary Title */}
        <h1
          style={{
            margin: 0,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: 6,
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 0 50px rgba(0, 240, 255, 0.5)",
          }}
        >
          SCENENAV AI
        </h1>

        {/* Subtitle Definition */}
        <div
          style={{
            marginTop: 10,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 3,
            color: COLORS.muted,
            textTransform: "uppercase",
          }}
        >
          Scene-Aided Navigation Research Prototype
        </div>

        {/* Master Tagline */}
        <div
          style={{
            marginTop: 24,
            fontFamily: "Consolas, monospace",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 7,
            color: COLORS.accent,
            textTransform: "uppercase",
            opacity: subOpacity,
          }}
        >
          VISUAL INTELLIGENCE. SPATIAL UNDERSTANDING.
        </div>

        {/* Defense & Aerospace Badge */}
        <div
          style={{
            marginTop: 44,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 24px",
            backgroundColor: "rgba(11, 20, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 30,
            opacity: subOpacity,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 2,
              color: "#94a3b8",
            }}
          >
            AEROSPACE & DEFENSE GEOSPATIAL LOCALIZATION
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
