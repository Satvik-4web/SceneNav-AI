import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop } from "../utils/animations";

export const Scene5Intelligence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 10.0;

  // Staggered card entrances
  const card1 = springPop(frame, fps, 0.2);
  const card2 = springPop(frame, fps, 0.4);
  const card3 = springPop(frame, fps, 0.6);
  const card4 = springPop(frame, fps, 0.8);

  const headerOpacity = fadeIn(frame, fps, 0.1, 0.4);
  const sceneExit = fadeOut(frame, fps, durationSec - 0.5, 0.5);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneExit,
        backgroundColor: COLORS.background,
        overflow: "hidden",
      }}
    >
      {/* Background: Actual Executive Research Overview Plate */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.28,
          filter: "blur(2px)",
        }}
      >
        <Img
          src={staticFile("real_assets/research_overview.png")}
          alt="Research Overview Background"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Top Header */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: headerOpacity,
          zIndex: 40,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            Mathematical Reliability & Verification
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              fontFamily: "Consolas, monospace",
              fontSize: 15,
              color: COLORS.accent,
              letterSpacing: 2,
            }}
          >
            MULTI-CRITERIA GEOMETRIC VALIDATION // NO BLIND TRUST
          </p>
        </div>

        <div
          style={{
            padding: "8px 18px",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            borderRadius: 6,
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "#10b981",
              letterSpacing: 1.5,
            }}
          >
            SYSTEM STATUS: ACCEPTED [HIGH CONFIDENCE]
          </span>
        </div>
      </div>

      {/* 4 Scientific Metrics Cards */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 64,
          right: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          zIndex: 30,
        }}
      >
        {/* Card 1: Spatial Dispersion */}
        <div
          style={{
            opacity: Math.min(1, card1),
            transform: `scale(${card1})`,
            padding: "22px 28px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(0, 240, 255, 0.35)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: 1.5,
            }}
          >
            01 // SPATIAL DISPERSION MATRIX
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#ffffff",
              marginTop: 6,
            }}
          >
            Quadrant Uniformity: 92.4%
          </div>
          <p
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Verifies feature inliers span the entire optical sensor frame across all four radial quadrants, preventing degenerate localized clustering.
          </p>
        </div>

        {/* Card 2: Homography Matrix Conditioning */}
        <div
          style={{
            opacity: Math.min(1, card2),
            transform: `scale(${card2})`,
            padding: "22px 28px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(0, 240, 255, 0.35)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: 1.5,
            }}
          >
            02 // HOMOGRAPHY MATRIX CONDITIONING
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#ffffff",
              marginTop: 6,
            }}
          >
            Condition Number κ(H) = 14.8
          </div>
          <p
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Eigenvalue ratio analysis ensures the projective transformation matrix is mathematically well-conditioned, avoiding near-singular projection artifacts.
          </p>
        </div>

        {/* Card 3: Inlier Consistency & Reprojection Error */}
        <div
          style={{
            opacity: Math.min(1, card3),
            transform: `scale(${card3})`,
            padding: "22px 28px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#10b981",
              letterSpacing: 1.5,
            }}
          >
            03 // REPROJECTION ERROR PRECISION
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#ffffff",
              marginTop: 6,
            }}
          >
            Mean Error: 0.42 px (Sub-pixel)
          </div>
          <p
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            224 geometric consensus inliers confirmed with sub-pixel Euclidean distance across rectified image spaces.
          </p>
        </div>

        {/* Card 4: Heuristic Reliability Index */}
        <div
          style={{
            opacity: Math.min(1, card4),
            transform: `scale(${card4})`,
            padding: "22px 28px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#10b981",
              letterSpacing: 1.5,
            }}
          >
            04 // HEURISTIC RELIABILITY INDEX
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#10b981",
              marginTop: 6,
            }}
          >
            Score: 98.4 / 100 [ACCEPTED]
          </div>
          <p
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              color: COLORS.muted,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Composite score weighting inlier ratio, condition number, geometric spread, and reprojection residual.
          </p>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 64,
          right: 64,
          padding: "12px 24px",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(245, 158, 11, 0.5)",
          borderRadius: 8,
          textAlign: "center",
          backdropFilter: "blur(12px)",
          zIndex: 40,
        }}
      >
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            color: COLORS.warning,
          }}
        >
          * SCIENTIFIC NOTICE: Confidence index is an uncalibrated heuristic metric of internal matching consistency — not an independent probabilistic guarantee of true geographic localization.
        </span>
      </div>
    </AbsoluteFill>
  );
};
