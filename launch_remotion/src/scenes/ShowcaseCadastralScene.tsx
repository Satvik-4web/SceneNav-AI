import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Audio } from "remotion";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { HudOverlay } from "../components/HudOverlay";
import { SubtitlesBar } from "../components/SubtitlesBar";
import { fadeIn, fadeOut, slideIn, scaleIn, blurIn } from "../utils/animations";

export const ShowcaseCadastralScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 8.5;

  const opacity = fadeIn(frame, fps, 0.1, 0.5);
  const translateX = slideIn(frame, fps, 0.1, 30, 0.6);
  const scale = scaleIn(frame, fps, 0.1, 0.97, 1.0, 0.6);
  const blur = blurIn(frame, fps, 0.1, 0.5, 6);

  const exitOpacity = fadeOut(frame, fps, durationSec - 0.4, 0.4);

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Audio src={staticFile("vo/vo-showcase-cadastral.mp3")} />
      <BackgroundGrid accentGlow={true} />

      <HudOverlay
        badgeText="[MULTI-TEMPORAL: CADASTRAL CROSS-EXAMINATION]"
        badgeAccent="cyan"
        telemetryRight="HISTORICAL VS MODERN ORTHOPHOTO CORRELATION"
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
          transform: `translateX(${translateX}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 240, 255, 0.15)",
          }}
        >
          <img
            src={staticFile("plates/plate-cadastral.png")}
            alt="Munich Cadastral Comparison"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <SubtitlesBar
        primaryText="Inspect multi-temporal cadastral changes, test extreme illumination shifts, and evaluate spatial drift in real time."
        highlightWords={["cadastral", "illumination", "shifts", "spatial", "drift"]}
      />
    </AbsoluteFill>
  );
};
