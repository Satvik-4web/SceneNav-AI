import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Audio } from "remotion";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { HudOverlay } from "../components/HudOverlay";
import { SubtitlesBar } from "../components/SubtitlesBar";
import { fadeIn, fadeOut, scaleIn, blurIn } from "../utils/animations";

export const HookThreatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 10.8;

  // Compound Entrance
  const opacity = fadeIn(frame, fps, 0.1, 0.6);
  const scale = scaleIn(frame, fps, 0.1, 1.04, 1.0, 1.2);
  const blur = blurIn(frame, fps, 0.1, 0.6, 6);

  // Compound Exit
  const exitOpacity = fadeOut(frame, fps, durationSec - 0.4, 0.4);

  // Subtitle timing (two sentences)
  const isSecondHalf = frame > 6.0 * fps;
  const subText = isSecondHalf
    ? "When satellites go dark, autonomous aerial systems need to see."
    : "In contested airspace, GPS is vulnerable to jamming and electronic spoofing.";
  const highlightWords = isSecondHalf ? ["satellites", "dark", "autonomous", "see"] : ["GPS", "jamming", "spoofing"];

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Audio src={staticFile("vo/vo-hook-threat.mp3")} />
      <BackgroundGrid accentGlow={false} />

      <HudOverlay
        badgeText="[THREAT ASSESSMENT: GNSS-DENIED / EW JAMMED]"
        badgeAccent="danger"
        telemetryRight="RECON HUD // 60 FPS // DRDO AERO"
      />

      {/* Hero Plate with 3D Parallax & Frame */}
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
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(239, 68, 68, 0.15)",
          }}
        >
          <img
            src={staticFile("plates/plate-threat.png")}
            alt="Threat Assessment View"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <SubtitlesBar primaryText={subText} highlightWords={highlightWords} />
    </AbsoluteFill>
  );
};
