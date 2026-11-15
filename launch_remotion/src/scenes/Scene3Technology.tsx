import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop, scaleIn } from "../utils/animations";

export const Scene3Technology: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 12.0;

  // Time milestones
  const isRansacActive = frame > 5.2 * fps;
  const siftVisualProgress = fadeIn(frame, fps, 5.2, 0.8);

  // Header entrance
  const headerOpacity = fadeIn(frame, fps, 0.2, 0.5);
  const headerScale = scaleIn(frame, fps, 0.2, 0.96, 1.0, 0.5);

  // Algorithm pill animations
  const siftPop = springPop(Math.max(0, frame - 1.2 * fps), fps, 0.1);
  const orbPop = springPop(Math.max(0, frame - 2.8 * fps), fps, 0.1);
  const ransacPop = springPop(Math.max(0, frame - 5.0 * fps), fps, 0.1);

  // Subtle zoom drift on final SIFT correspondence visual
  const imageScale = 1.0 + Math.min(0.04, Math.max(0, (frame - 5.2 * fps) * 0.0003));

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
      {/* Main Headline */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerOpacity,
          transform: `scale(${headerScale})`,
          zIndex: 40,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: 2,
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 0 35px rgba(0, 240, 255, 0.4)",
          }}
        >
          Invariant Feature Matching & RANSAC Filtering
        </h1>
        <p
          style={{
            margin: "8px 0 0 0",
            fontFamily: "Consolas, monospace",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 3,
            color: isRansacActive ? "#10b981" : COLORS.accent,
            textTransform: "uppercase",
          }}
        >
          {isRansacActive
            ? "224 GEOMETRIC INLIERS PRESERVED // OUTLIER VECTORS PURGED"
            : "SCALE-SPACE KEYPOINT EXTRACTION ACROSS RECON FEEDS"}
        </p>
      </div>

      {/* Center Stage: Real SIFT Inlier Correspondence Visualization */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 100,
          right: 100,
          height: 520,
          borderRadius: 14,
          overflow: "hidden",
          border: isRansacActive ? "2px solid #10b981" : "2px solid rgba(0, 240, 255, 0.45)",
          boxShadow: isRansacActive
            ? "0 20px 60px rgba(0,0,0,0.95), 0 0 45px rgba(16, 185, 129, 0.35)"
            : "0 20px 60px rgba(0,0,0,0.95), 0 0 35px rgba(0, 240, 255, 0.25)",
          backgroundColor: "#070e17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Layer 1: Real Separate Aerial Images (Initial 0 to 5s) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "24px 40px",
            opacity: 1 - siftVisualProgress,
          }}
        >
          {/* Reference Image Container with Keypoint Dots */}
          <div
            style={{
              width: "48%",
              height: "100%",
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(0,240,255,0.4)",
            }}
          >
            <Img
              src={staticFile("real_assets/ref_aerial.png")}
              alt="Ref"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Animated SIFT Keypoint markers on Reference */}
            {[
              { x: 120, y: 140, r: 12 },
              { x: 260, y: 190, r: 16 },
              { x: 380, y: 280, r: 14 },
              { x: 180, y: 340, r: 10 },
              { x: 440, y: 160, r: 18 },
              { x: 310, y: 390, r: 15 },
            ].map((pt, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y,
                  width: pt.r * 2,
                  height: pt.r * 2,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: "1.5px solid #00f0ff",
                  boxShadow: "0 0 8px #00f0ff",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 4,
                    height: 4,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#ffffff",
                    borderRadius: "50%",
                  }}
                />
              </div>
            ))}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "rgba(0,0,0,0.85)",
                padding: "5px 12px",
                borderRadius: 4,
                border: "1px solid rgba(0, 240, 255, 0.4)",
                fontFamily: "Consolas",
                fontSize: 12,
                color: COLORS.accent,
                fontWeight: 700,
              }}
            >
              REFERENCE ORTHOPHOTO // SCALE-SPACE OCTAVES
            </div>
          </div>

          {/* Center Correspondence Ray SVG Overlay (0 to 5s) */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {/* Emerald Inlier Ray Vectors */}
            <line x1="260" y1="214" x2="1480" y2="240" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
            <line x1="380" y1="304" x2="1580" y2="330" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
            <line x1="180" y1="364" x2="1420" y2="370" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
            <line x1="440" y1="184" x2="1640" y2="210" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />

            {/* Outlier Red Vectors (Disappear when RANSAC triggers) */}
            {!isRansacActive && (
              <>
                <line x1="120" y1="164" x2="1680" y2="420" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.75" />
                <line x1="310" y1="414" x2="1360" y2="170" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.75" />
              </>
            )}
          </svg>

          {/* Airborne Query Container with Keypoint Dots */}
          <div
            style={{
              width: "48%",
              height: "100%",
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(245,158,11,0.5)",
            }}
          >
            <Img
              src={staticFile("real_assets/query_aerial.png")}
              alt="Query"
              style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#020509" }}
            />
            {/* Animated SIFT Keypoint markers on Query */}
            {[
              { x: 180, y: 160, r: 12 },
              { x: 280, y: 250, r: 16 },
              { x: 140, y: 290, r: 10 },
              { x: 340, y: 130, r: 18 },
            ].map((pt, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y,
                  width: pt.r * 2,
                  height: pt.r * 2,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: "1.5px solid #f59e0b",
                  boxShadow: "0 0 8px #f59e0b",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 4,
                    height: 4,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#ffffff",
                    borderRadius: "50%",
                  }}
                />
              </div>
            ))}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "rgba(0,0,0,0.85)",
                padding: "5px 12px",
                borderRadius: 4,
                border: "1px solid rgba(245, 158, 11, 0.5)",
                fontFamily: "Consolas",
                fontSize: 12,
                color: COLORS.warning,
                fontWeight: 700,
              }}
            >
              AIRBORNE QUERY SENSOR // ROTATION-INVARIANT DESCRIPTORS
            </div>
          </div>
        </div>

        {/* Layer 2: Actual High-Resolution SIFT Correspondence Plot Generated by SceneNav AI Engine */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: siftVisualProgress,
            transform: `scale(${imageScale})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile("real_assets/sift_correspondences.png")}
            alt="Real SIFT Feature Correspondences"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

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
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.25)",
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
              GENUINE ENGINE OUTPUT // 224 SIFT INLIER CORRESPONDENCE RAYS VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Floating Algorithm Technology Badges */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 100,
          right: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 40,
        }}
      >
        {/* SIFT Badge */}
        <div
          style={{
            opacity: Math.min(1, siftPop),
            transform: `scale(${siftPop})`,
            padding: "12px 24px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(0, 240, 255, 0.45)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0, 240, 255, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            SIFT
          </div>
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: COLORS.accent,
              marginTop: 4,
              letterSpacing: 1,
            }}
          >
            128-DIM INVARIANT GRADIENT HISTOGRAMS
          </div>
        </div>

        {/* ORB Badge */}
        <div
          style={{
            opacity: Math.min(1, orbPop),
            transform: `scale(${orbPop})`,
            padding: "12px 24px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            ORB
          </div>
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: COLORS.warning,
              marginTop: 4,
              letterSpacing: 1,
            }}
          >
            ROTATION-AWARE BINARY DESCRIPTORS
          </div>
        </div>

        {/* RANSAC Badge */}
        <div
          style={{
            opacity: Math.min(1, ransacPop),
            transform: `scale(${ransacPop})`,
            padding: "12px 24px",
            backgroundColor: "rgba(11, 20, 32, 0.92)",
            border: "1px solid #10b981",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: "#10b981",
            }}
          >
            RANSAC
          </div>
          <div
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: "#ffffff",
              marginTop: 4,
              letterSpacing: 1,
            }}
          >
            HARTLEY-ZISSERMAN OUTLIER REJECTION
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
