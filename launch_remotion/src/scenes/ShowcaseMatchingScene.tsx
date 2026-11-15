import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Audio } from "remotion";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { HudOverlay } from "../components/HudOverlay";
import { SubtitlesBar } from "../components/SubtitlesBar";
import { fadeIn, fadeOut, scaleIn, blurIn } from "../utils/animations";

export const ShowcaseMatchingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 9.0;

  const opacity = fadeIn(frame, fps, 0.1, 0.5);
  const scale = scaleIn(frame, fps, 0.1, 0.95, 1.0, 0.7);
  const blur = blurIn(frame, fps, 0.1, 0.5, 6);

  // Concentric radar sweep rotation
  const radarDeg = (frame / fps) * 180;

  const exitOpacity = fadeOut(frame, fps, durationSec - 0.4, 0.4);

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Audio src={staticFile("vo/vo-showcase-matching.mp3")} />
      <BackgroundGrid accentGlow={true} />

      <HudOverlay
        badgeText="[ENGINE: INVARIANT SIFT/ORB + RANSAC FILTERING]"
        badgeAccent="cyan"
        telemetryRight="GEOMETRIC VERIFICATION // RADAR ACTIVE"
      />

      {/* Hero Plate */}
      <div
        style={{
          position: "absolute",
          inset: "90px 48px 120px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(0, 240, 255, 0.35)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 28px rgba(0, 240, 255, 0.2)",
          }}
        >
          <img
            src={staticFile("plates/plate-matching.png")}
            alt="Feature Matching Execution"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Active Radar Sweep Overlay */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 500,
              height: 500,
              transform: `translate(-50%, -50%) rotate(${radarDeg}deg)`,
              pointerEvents: "none",
              background: "conic-gradient(from 0deg, rgba(0, 240, 255, 0.12) 0deg, transparent 60deg, transparent 360deg)",
              borderRadius: "50%",
              mixBlendMode: "screen",
            }}
          />
        </div>
      </div>

      <SubtitlesBar
        primaryText="Ingesting raw reconnaissance feeds, our pipeline extracts invariant features and executes robust RANSAC filtering."
        highlightWords={["invariant", "features", "RANSAC", "filtering", "reconnaissance"]}
      />
    </AbsoluteFill>
  );
};
