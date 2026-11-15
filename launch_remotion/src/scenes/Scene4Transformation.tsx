import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop } from "../utils/animations";

export const Scene4Transformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 11.0;

  // Warp phase: 1.0 to 5.0s
  const warpStart = 1.0 * fps;
  const warpEnd = 5.0 * fps;
  const warpProgress = Math.min(1, Math.max(0, (frame - warpStart) / (warpEnd - warpStart)));
  const easeWarp = 0.5 - Math.cos(warpProgress * Math.PI) / 2;

  // Real Footprint Overlay Reveal: at 5.2s
  const isFootprintRevealed = frame > 5.2 * fps;
  const footprintProgress = fadeIn(frame, fps, 5.2, 0.8);
  const ringScale = springPop(Math.max(0, frame - 5.2 * fps), fps, 0.1, {
    damping: 14,
    stiffness: 240,
    mass: 0.8,
  });

  // Scene exit
  const sceneExit = fadeOut(frame, fps, durationSec - 0.5, 0.5);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneExit,
        backgroundColor: COLORS.background,
        overflow: "hidden",
      }}
    >
      {/* Top Header & Matrix HUD */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 40,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#ffffff",
              textTransform: "uppercase",
              textShadow: "0 0 30px rgba(0, 240, 255, 0.35)",
            }}
          >
            Projective Homography & Footprint Estimation
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              fontFamily: "Consolas, monospace",
              fontSize: 14,
              color: COLORS.accent,
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            MATHEMATICAL WARPING: H ∈ ℝ³ˣ³ LOCKS SENSOR PERSPECTIVE
          </p>
        </div>

        {/* Matrix Equation Box */}
        <div
          style={{
            padding: "8px 18px",
            backgroundColor: "rgba(11, 20, 32, 0.9)",
            border: "1px solid rgba(0, 240, 255, 0.4)",
            borderRadius: 8,
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.15)",
          }}
        >
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 1,
            }}
          >
            [x', y', 1]ᵀ ~ <span style={{ color: COLORS.accent }}>H₃ₓ₃</span> · [x, y, 1]ᵀ
          </span>
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 11,
              color: COLORS.muted,
              marginTop: 3,
            }}
          >
            κ(H) = 14.8 // DET(H) = 1.084 // EIGEN RATIO: 1.12
          </div>
        </div>
      </div>

      {/* Main Perspective Stage */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 100,
          right: 100,
          bottom: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Stage Container */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: 14,
            overflow: "hidden",
            border: isFootprintRevealed ? "2px solid #10b981" : "2px solid rgba(0, 240, 255, 0.45)",
            boxShadow: isFootprintRevealed
              ? "0 24px 60px rgba(0,0,0,0.95), 0 0 45px rgba(16, 185, 129, 0.35)"
              : "0 24px 60px rgba(0,0,0,0.95), 0 0 35px rgba(0, 240, 255, 0.25)",
            backgroundColor: "#03060a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Layer 1: Real Reference Base Orthophoto during warp */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1 - footprintProgress,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile("real_assets/ref_aerial.png")}
              alt="Reference Raster"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* Warping Query Plane over it */}
            <div
              style={{
                position: "absolute",
                width: 520,
                height: 400,
                transform: `rotate(${15.2 * (1 - easeWarp)}deg) scale(${0.78 + 0.22 * easeWarp})`,
                borderRadius: 8,
                overflow: "hidden",
                border: easeWarp > 0.85 ? "2px solid #10b981" : "2px solid #f59e0b",
                boxShadow: easeWarp > 0.85
                  ? "0 0 35px rgba(16, 185, 129, 0.6)"
                  : "0 0 30px rgba(245, 158, 11, 0.5)",
                opacity: 0.9,
              }}
            >
              <Img
                src={staticFile("real_assets/query_aerial.png")}
                alt="Warping Query"
                style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
              />
            </div>
          </div>

          {/* Layer 2: Actual High-Res Georeferenced Footprint Overlay from Engine */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: footprintProgress,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile("real_assets/footprint_overlay.png")}
              alt="Real Georeferenced Footprint Overlay"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* Top-Left Verification Tag */}
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 20,
                backgroundColor: "rgba(5, 10, 16, 0.94)",
                padding: "8px 18px",
                borderRadius: 6,
                border: "1px solid #10b981",
                backdropFilter: "blur(10px)",
                transform: `scale(${ringScale})`,
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
              }}
            >
              <span
                style={{
                  fontFamily: "Consolas, monospace",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#10b981",
                  letterSpacing: 1.5,
                }}
              >
                PROVEN GEOMETRIC FOOTPRINT // WGS-84 UTM GROUND POLYGON ESTIMATED
              </span>
            </div>

            {/* 4 Glowing Footprint Corner Vertices Telemetry Tags */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                right: 24,
                backgroundColor: "rgba(5, 10, 16, 0.94)",
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid rgba(255, 255, 255, 0.18)",
                fontFamily: "Consolas, monospace",
                fontSize: 12,
                color: "#ffffff",
                boxShadow: "0 0 20px rgba(0,0,0,0.8)",
              }}
            >
              <span style={{ color: "#10b981", fontWeight: 700 }}>4 CORNER VERTICES:</span> [P₁: 491210E, P₂: 491840E, P₃: 491910E, P₄: 491280E] LOCKED
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
