import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Audio } from "remotion";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { HudOverlay } from "../components/HudOverlay";
import { SubtitlesBar } from "../components/SubtitlesBar";
import { fadeIn, fadeOut, scaleIn, springPop } from "../utils/animations";

export const ClimaxCloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 12.2;

  // Split scene: Analytics plate until 5.7s, then cinematic brand climax
  const isLogoReveal = frame > 5.7 * fps;

  // Analytics plate animation
  const plateOpacity = isLogoReveal
    ? fadeOut(frame, fps, 5.5, 0.4)
    : fadeIn(frame, fps, 0.1, 0.5);
  const plateScale = scaleIn(frame, fps, 0.1, 0.97, 1.0, 0.6);

  // Logo Reveal Animation
  const logoFrame = Math.max(0, frame - 5.7 * fps);
  const logoScale = springPop(logoFrame, fps, 0.1, { damping: 14, stiffness: 240, mass: 0.8 });
  const logoOpacity = fadeIn(logoFrame, fps, 0.1, 0.4);

  // Subtitles
  const subText = isLogoReveal
    ? "Even when the satellites fail."
    : "SceneNav AI. Visual Intelligence. Spatial Understanding.";
  const highlightWords = isLogoReveal ? ["satellites", "fail"] : ["SceneNav", "AI", "Visual", "Spatial"];

  // Final master fade to black
  const masterFade = fadeOut(frame, fps, durationSec - 1.2, 1.2);

  return (
    <AbsoluteFill style={{ opacity: masterFade }}>
      <Audio src={staticFile("vo/vo-climax-close.mp3")} />
      <BackgroundGrid accentGlow={true} />

      <HudOverlay
        badgeText="[MISSION STATUS: AUTONOMOUS POSITION LOCK ACQUIRED]"
        badgeAccent="emerald"
        telemetryRight="0.42M RELIABILITY // HARTLEY-ZISSERMAN PASS"
      />

      {/* Part 1: Analytics Plate */}
      {!isLogoReveal && (
        <div
          style={{
            position: "absolute",
            inset: "90px 48px 120px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: plateOpacity,
            transform: `scale(${plateScale})`,
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
              src={staticFile("plates/plate-analytics.png")}
              alt="Research Analytics Diagnostic"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      )}

      {/* Part 2: Cinematic Brand Hero Reveal */}
      {isLogoReveal && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            zIndex: 40,
          }}
        >
          {/* Glowing Reticle Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "2px solid #00f0ff",
              boxShadow: "0 0 32px rgba(0, 240, 255, 0.5), inset 0 0 24px rgba(0, 240, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#00f0ff",
                boxShadow: "0 0 12px #00f0ff",
              }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: 4,
              color: "#ffffff",
              textTransform: "uppercase",
              textShadow: "0 0 40px rgba(0, 240, 255, 0.4)",
            }}
          >
            SCENENAV AI
          </h1>

          <p
            style={{
              margin: "16px 0 0 0",
              fontFamily: "Consolas, monospace",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 6,
              color: "#00f0ff",
              textTransform: "uppercase",
            }}
          >
            Visual Intelligence. Spatial Understanding.
          </p>

          <div
            style={{
              marginTop: 36,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 24px",
              backgroundColor: "rgba(11, 17, 26, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 30,
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
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 2,
                color: "#94a3b8",
              }}
            >
              DEFENSE RECONNAISSANCE & GEOSPATIAL odometry
            </span>
          </div>
        </AbsoluteFill>
      )}

      <SubtitlesBar primaryText={subText} highlightWords={highlightWords} />
    </AbsoluteFill>
  );
};
