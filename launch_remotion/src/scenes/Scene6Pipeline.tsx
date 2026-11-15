import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop } from "../utils/animations";

export const Scene6Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = 8.0;

  const headerOpacity = fadeIn(frame, fps, 0.1, 0.4);
  const sceneExit = fadeOut(frame, fps, durationSec - 0.5, 0.5);

  const steps = [
    { num: "01", title: "INPUT IMAGERY", desc: "Dual Aerial Receptors" },
    { num: "02", title: "FEATURE DETECTION", desc: "SIFT / ORB Keypoints" },
    { num: "03", title: "FEATURE MATCHING", desc: "Cosine Descriptors" },
    { num: "04", title: "RANSAC FILTERING", desc: "Outlier Purge" },
    { num: "05", title: "HOMOGRAPHY (H)", desc: "Projective Warp" },
    { num: "06", title: "FOOTPRINT ESTIMATION", desc: "4 Vertices Lock" },
    { num: "07", title: "RELIABILITY ASSESSMENT", desc: "Heuristic Score" },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity: sceneExit,
        backgroundColor: COLORS.background,
        overflow: "hidden",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headerOpacity,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: 2.5,
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 0 30px rgba(0, 240, 255, 0.3)",
          }}
        >
          The Unified Visual Localization Architecture
        </h1>
        <p
          style={{
            margin: "8px 0 0 0",
            fontFamily: "Consolas, monospace",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 3,
            color: COLORS.accent,
            textTransform: "uppercase",
          }}
        >
          FROM RAW OPTICAL SENSOR PIXELS TO CALIBRATED GEODESIC COORDINATES
        </p>
      </div>

      {/* Dynamic Animated Pipeline Chain */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Continuous Connecting Energy Rail */}
        <div
          style={{
            position: "absolute",
            top: 45,
            left: 50,
            right: 50,
            height: 3,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            zIndex: 1,
          }}
        />

        {/* Traveling Energy Pulse along Rail */}
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 50,
            width: `${Math.min(100, (frame / (durationSec * fps * 0.8)) * 100)}%`,
            height: 5,
            background: "linear-gradient(to right, transparent, #00f0ff, #10b981)",
            boxShadow: "0 0 16px #00f0ff",
            zIndex: 2,
          }}
        />

        {steps.map((st, i) => {
          const stepAge = frame - (0.4 * fps + i * (0.8 * fps));
          const isActivated = stepAge > 0;
          const pop = springPop(Math.max(0, stepAge), fps, 0.1);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 10,
                opacity: Math.min(1, pop),
                transform: `scale(${pop})`,
                width: 220,
              }}
            >
              {/* Step Node Circle */}
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: isActivated ? "#0b1e33" : "#091018",
                  border: isActivated
                    ? i === 6
                      ? "2px solid #10b981"
                      : "2px solid #00f0ff"
                    : "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: isActivated
                    ? i === 6
                      ? "0 0 24px rgba(16, 185, 129, 0.5)"
                      : "0 0 24px rgba(0, 240, 255, 0.4)"
                    : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  transition: "all 0.3s ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "Consolas, monospace",
                    fontSize: 18,
                    fontWeight: 800,
                    color: isActivated
                      ? i === 6
                        ? "#10b981"
                        : "#00f0ff"
                      : COLORS.muted,
                  }}
                >
                  {st.num}
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: isActivated ? "#ffffff" : COLORS.muted,
                  textAlign: "center",
                  letterSpacing: 1,
                  lineHeight: 1.3,
                  minHeight: 38,
                }}
              >
                {st.title}
              </div>

              {/* Desc Tag */}
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "Consolas, monospace",
                  fontSize: 11,
                  color: isActivated ? (i === 6 ? "#10b981" : COLORS.accent) : "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  letterSpacing: 0.5,
                }}
              >
                {st.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Mission Guarantee Banner */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 28px",
            backgroundColor: "rgba(11, 20, 32, 0.8)",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            borderRadius: 30,
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 10px #10b981",
            }}
          />
          <span
            style={{
              fontFamily: "Consolas, monospace",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2,
              color: "#ffffff",
            }}
          >
            REAL-TIME EXECUTION // ZERO DEPENDENCY ON EXTERNAL RADIO/GNSS EMISSIONS
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
