import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Audio } from "remotion";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { HudOverlay } from "../components/HudOverlay";
import { SubtitlesBar } from "../components/SubtitlesBar";
import { fadeIn, fadeOut, scaleIn, blurIn } from "../utils/animations";

export const ShowcaseInliersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 9.0;

  const opacity = fadeIn(frame, fps, 0.1, 0.5);
  // Macro zoom pan across inliers
  const scale = scaleIn(frame, fps, 0.1, 1.03, 1.0, 1.0);
  const blur = blurIn(frame, fps, 0.1, 0.5, 6);

  const exitOpacity = fadeOut(frame, fps, durationSec - 0.4, 0.4);

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Audio src={staticFile("vo/vo-showcase-inliers.mp3")} />
      <BackgroundGrid accentGlow={true} />

      <HudOverlay
        badgeText="[RESULT: 224 GEOMETRIC INLIERS DETECTED]"
        badgeAccent="emerald"
        telemetryRight="WGS-84 UTM ZONE 32N // SUB-PIXEL FIX"
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
            width: "100%",
            height: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 28px rgba(16, 185, 129, 0.2)",
          }}
        >
          <img
            src={staticFile("plates/plate-inliers.png")}
            alt="Geometric Inliers Inspection"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <SubtitlesBar
        primaryText="Over two hundred geometric inliers lock the sensor footprint directly onto georeferenced satellite imagery."
        highlightWords={["two", "hundred", "geometric", "inliers", "footprint", "satellite"]}
      />
    </AbsoluteFill>
  );
};
