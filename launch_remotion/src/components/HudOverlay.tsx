import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../constants";

interface HudOverlayProps {
  badgeText: string;
  badgeAccent?: "cyan" | "emerald" | "danger";
  telemetryRight?: string;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  badgeText,
  badgeAccent = "cyan",
  telemetryRight = "RECON HUD // 60 FPS // DRDO AERO",
}) => {
  const accentColor =
    badgeAccent === "emerald"
      ? COLORS.highlight
      : badgeAccent === "danger"
      ? COLORS.danger
      : COLORS.accent;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      {/* Top Header Tactical Bar */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            backgroundColor: "rgba(11, 17, 26, 0.85)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${accentColor}44`,
            borderRadius: 6,
            boxShadow: `0 0 16px ${accentColor}22`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: accentColor,
            }}
          >
            {badgeText}
          </span>
        </div>

        {/* Right Telemetry */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "rgba(11, 17, 26, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 14,
              letterSpacing: 1.0,
              color: COLORS.muted,
            }}
          >
            {telemetryRight}
          </span>
        </div>
      </div>

      {/* 4 Viewfinder Corner Reticles */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 24,
          height: 24,
          borderTop: `2px solid ${COLORS.accent}66`,
          borderLeft: `2px solid ${COLORS.accent}66`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 24,
          height: 24,
          borderTop: `2px solid ${COLORS.accent}66`,
          borderRight: `2px solid ${COLORS.accent}66`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          width: 24,
          height: 24,
          borderBottom: `2px solid ${COLORS.accent}66`,
          borderLeft: `2px solid ${COLORS.accent}66`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 24,
          height: 24,
          borderBottom: `2px solid ${COLORS.accent}66`,
          borderRight: `2px solid ${COLORS.accent}66`,
        }}
      />
    </AbsoluteFill>
  );
};
