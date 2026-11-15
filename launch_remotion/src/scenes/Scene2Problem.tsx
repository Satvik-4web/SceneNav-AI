import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, slideIn, scaleIn, float } from "../utils/animations";

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 9.0;

  // Altitude descent simulation: 32000m down to 1450m
  const altitudeProgress = Math.min(1, (frame / (durationSec * fps)) * 1.25);
  const altitude = Math.round(32000 - altitudeProgress * 30550);

  // 3D Plane Entrance Animations
  const leftOpacity = fadeIn(frame, fps, 0.3, 0.6);
  const leftTranslateX = slideIn(frame, fps, 0.3, -50, 0.7);
  const rightOpacity = fadeIn(frame, fps, 0.6, 0.6);
  const rightTranslateX = slideIn(frame, fps, 0.6, 50, 0.7);

  // Subtle natural floating
  const floatA = float(frame, fps, 6, 4, 0);
  const floatB = float(frame, fps, 7, 4.5, 90);

  // Headline Entrance
  const headlineOpacity = fadeIn(frame, fps, 0.15, 0.5);
  const headlineScale = scaleIn(frame, fps, 0.15, 0.96, 1.0, 0.6);

  // Laser scanner sweep across planes
  const scanY = ((frame * 2.5) % 520);

  // Scene Exit
  const sceneExit = fadeOut(frame, fps, durationSec - 0.5, 0.5);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneExit,
        backgroundColor: COLORS.background,
        overflow: "hidden",
      }}
    >
      {/* Background Altitude Descent Telemetry */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 20px",
          backgroundColor: "rgba(11, 20, 32, 0.9)",
          border: "1px solid rgba(0, 240, 255, 0.4)",
          borderRadius: 6,
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 20px rgba(0, 240, 255, 0.15)",
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: COLORS.accent,
            boxShadow: `0 0 10px ${COLORS.accent}`,
          }}
        />
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            color: COLORS.accent,
          }}
        >
          DESCENT ALTITUDE: {altitude.toLocaleString()} M // SENSOR PERSPECTIVE DESYNCHRONIZED
        </span>
      </div>

      {/* Main Headline */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headlineOpacity,
          transform: `scale(${headlineScale})`,
          zIndex: 30,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: 3,
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 0 35px rgba(0, 240, 255, 0.4)",
          }}
        >
          The world still leaves visual clues.
        </h1>
        <p
          style={{
            margin: "8px 0 0 0",
            fontFamily: "Consolas, monospace",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 4,
            color: COLORS.muted,
            textTransform: "uppercase",
          }}
        >
          Between satellite reference and airborne cameras: scale, orientation, and perspective collide.
        </p>
      </div>

      {/* 3D Stage for Floating Dual Image Planes */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          perspective: 1400,
        }}
      >
        {/* Plane A: Real USGS Greenwood Satellite Reference (Nadir View) */}
        <div
          style={{
            width: 740,
            height: 520,
            opacity: leftOpacity,
            transform: `translateX(${leftTranslateX}px) translateY(${floatA}px) rotateY(12deg) rotateX(6deg)`,
            transformStyle: "preserve-3d",
            borderRadius: 12,
            border: "1px solid rgba(0, 240, 255, 0.45)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 240, 255, 0.25)",
            backgroundColor: "#070e17",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile("real_assets/ref_aerial.png")}
            alt="Real USGS Satellite Reference"
            style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#020509" }}
          />

          {/* Cyan Laser Scanline Sweep */}
          <div
            style={{
              position: "absolute",
              top: scanY,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #00f0ff, transparent)",
              boxShadow: "0 0 12px #00f0ff",
            }}
          />

          {/* Target Reticles over Land Features */}
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: "42%",
              width: 24,
              height: 24,
              border: "1px solid rgba(0, 240, 255, 0.8)",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(0, 240, 255, 0.6)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "65%",
              left: "70%",
              width: 20,
              height: 20,
              border: "1px solid rgba(0, 240, 255, 0.8)",
              borderRadius: "50%",
            }}
          />

          {/* Plane A Overlay Tag */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: "rgba(5, 10, 16, 0.92)",
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid rgba(0, 240, 255, 0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                fontFamily: "Consolas, monospace",
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.accent,
                letterSpacing: 1.5,
              }}
            >
              STORED SATELLITE BASE [USGS NADIR // 0.15M GSD]
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              backgroundColor: "rgba(5, 10, 16, 0.92)",
              padding: "4px 12px",
              borderRadius: 4,
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: COLORS.muted,
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            COORDINATE GRID: WGS-84 UTM 32N
          </div>
        </div>

        {/* Center Perspective Disparity Indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            zIndex: 10,
          }}
        >
          {/* Animated Rotation Compass Disc */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "2px dashed #f59e0b",
              transform: `rotate(${frame * 1.5}deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 2,
                backgroundColor: "#f59e0b",
              }}
            />
          </div>

          <div
            style={{
              padding: "12px 22px",
              backgroundColor: "rgba(20, 10, 15, 0.9)",
              border: "1px solid rgba(239, 68, 68, 0.55)",
              borderRadius: 8,
              textAlign: "center",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 30px rgba(239, 68, 68, 0.2)",
            }}
          >
            <span
              style={{
                fontFamily: "Consolas, monospace",
                fontSize: 15,
                fontWeight: 800,
                color: "#ef4444",
                letterSpacing: 2,
              }}
            >
              SCALE DISPARITY: 4.8×
            </span>
            <div
              style={{
                fontFamily: "Consolas, monospace",
                fontSize: 12,
                color: "#ffffff",
                marginTop: 4,
                letterSpacing: 1,
              }}
            >
              ROTATION: 15.2° // SKEW: 24.6°
            </div>
          </div>

          <div
            style={{
              width: 1,
              height: 120,
              background: "linear-gradient(to bottom, #ef4444, transparent)",
            }}
          />
        </div>

        {/* Plane B: Real Airborne Query Sensor (Oblique & Tilted) */}
        <div
          style={{
            width: 740,
            height: 520,
            opacity: rightOpacity,
            transform: `translateX(${rightTranslateX}px) translateY(${floatB}px) rotateY(-18deg) rotateX(15deg) rotateZ(-4deg)`,
            transformStyle: "preserve-3d",
            borderRadius: 12,
            border: "1px solid rgba(245, 158, 11, 0.55)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(245, 158, 11, 0.3)",
            backgroundColor: "#070e17",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile("real_assets/query_aerial.png")}
            alt="Real Airborne Query Aerial Feed"
            style={{ width: "90%", height: "90%", objectFit: "contain" }}
          />

          {/* Amber Laser Scanline Sweep */}
          <div
            style={{
              position: "absolute",
              top: (scanY * 0.9) % 480,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
              boxShadow: "0 0 12px #f59e0b",
            }}
          />

          {/* Plane B Overlay Tag */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: "rgba(5, 10, 16, 0.92)",
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid rgba(245, 158, 11, 0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                fontFamily: "Consolas, monospace",
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.warning,
                letterSpacing: 1.5,
              }}
            >
              LIVE UAV OPTICAL FEED [ROTATED & CROPPED]
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              backgroundColor: "rgba(5, 10, 16, 0.92)",
              padding: "4px 12px",
              borderRadius: 4,
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: COLORS.warning,
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            POSITION UNCALIBRATED // UNKNOWN GROUND FIX
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
