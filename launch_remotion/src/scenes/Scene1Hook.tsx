import React, { useRef, useEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, fadeOut, springPop, glitchOffset } from "../utils/animations";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const durationSec = 8.0;
  const isSignalLost = frame > 4.5 * fps;

  // Title spring entrance
  const titleOpacity = fadeIn(frame, fps, 0.4, 0.6);
  const titleScale = springPop(frame, fps, 0.4, { damping: 16, stiffness: 200, mass: 0.8 });
  const sceneExit = fadeOut(frame, fps, durationSec - 0.5, 0.5);

  // Glitch effect on signal loss
  const glitch = isSignalLost && frame < 5.8 * fps ? glitchOffset(frame, 6) : { x: 0, y: 0, opacity: 1 };

  // Canvas 3D Earth, Starfield & Satellite Orbital Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1920, 1080);

    const cx = 960;
    const cy = 520;
    const R = 250;
    const rot = (frame / fps) * 0.35;

    // 1. Deep Space Starfield (120 procedural twinkling stars)
    for (let s = 0; s < 120; s++) {
      const sx = ((s * 137.5) % 1920);
      const sy = ((s * 293.7) % 1080);
      const distFromCenter = Math.hypot(sx - cx, sy - cy);
      if (distFromCenter < R * 1.1) continue; // Don't draw behind opaque earth core
      const twinkle = Math.sin(frame * 0.1 + s) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * twinkle})`;
      ctx.fillRect(sx, sy, (s % 3 === 0 ? 2 : 1.2), (s % 3 === 0 ? 2 : 1.2));
    }

    // 2. Outer Atmospheric Glow (Volumetric Blue / Cyan Halo)
    const atmosphericGlow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.6);
    atmosphericGlow.addColorStop(0, "rgba(0, 240, 255, 0.22)");
    atmosphericGlow.addColorStop(0.5, "rgba(0, 150, 255, 0.08)");
    atmosphericGlow.addColorStop(0.85, "rgba(0, 50, 150, 0.02)");
    atmosphericGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = atmosphericGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Earth Core Sphere (Deep Obsidian Navy Body)
    const bodyGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 20, cx, cy, R);
    bodyGrad.addColorStop(0, "#0a2238");
    bodyGrad.addColorStop(0.7, "#040b17");
    bodyGrad.addColorStop(1, "#020409");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rotating 3D Latitude Wireframe
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
    for (let lat = -60; lat <= 60; lat += 20) {
      const latRad = (lat * Math.PI) / 180;
      const rLat = R * Math.cos(latRad);
      const yLat = cy - R * Math.sin(latRad);
      ctx.beginPath();
      ctx.ellipse(cx, yLat, rLat, rLat * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Rotating 3D Longitude Wireframe
    for (let lon = 0; lon < 180; lon += 24) {
      const lonRad = ((lon + rot * 60) * Math.PI) / 180;
      const rx = R * Math.cos(lonRad);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(rx), R, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Glowing Equator & Prime Meridian Highlight
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.65)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 7. Outer Boundary Rim with Neon Highlight
    ctx.lineWidth = 2;
    ctx.strokeStyle = isSignalLost ? "rgba(239, 68, 68, 0.5)" : "rgba(0, 240, 255, 0.75)";
    ctx.shadowColor = isSignalLost ? "rgba(239, 68, 68, 0.8)" : "rgba(0, 240, 255, 0.8)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 8. Electronic Warfare Radial Jamming Wave (Triggers at 4.5s)
    if (isSignalLost) {
      const jamProgress = Math.min(1, (frame - 4.5 * fps) / (1.5 * fps));
      const jamRadius = R * (0.8 + jamProgress * 1.4);
      ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, (1 - jamProgress) * 0.85)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, jamRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 9. 3 Orbital Satellites & Vector Beams
    const satOrbits = [
      { r: R * 1.55, tilt: 0.38, speed: 0.55, phase: 0.6, name: "NAVSTAR-42" },
      { r: R * 1.88, tilt: -0.42, speed: 0.42, phase: 2.4, name: "GPS-IIF-08" },
      { r: R * 2.22, tilt: 0.18, speed: 0.32, phase: 4.2, name: "GALILEO-19" },
    ];

    satOrbits.forEach((sat, i) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sat.tilt);

      // Orbital Track
      ctx.beginPath();
      ctx.ellipse(0, 0, sat.r, sat.r * 0.32, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = isSignalLost ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 240, 255, 0.12)";
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Satellite position
      const theta = (frame / fps) * sat.speed + sat.phase;
      const sx = sat.r * Math.cos(theta);
      const sy = sat.r * 0.32 * Math.sin(theta);

      const cosT = Math.cos(sat.tilt);
      const sinT = Math.sin(sat.tilt);
      const satScreenX = cx + (sx * cosT - sy * sinT);
      const satScreenY = cy + (sx * sinT + sy * cosT);

      // Target surface point
      const targetX = cx + Math.sin(theta + i) * R * 0.55;
      const targetY = cy + Math.cos(theta + i) * R * 0.35;

      if (!isSignalLost) {
        // Active healthy cyan signal beam with gradient
        const beamGrad = ctx.createLinearGradient(satScreenX, satScreenY, targetX, targetY);
        beamGrad.addColorStop(0, "rgba(0, 240, 255, 0.9)");
        beamGrad.addColorStop(1, "rgba(0, 240, 255, 0.15)");
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(satScreenX, satScreenY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Target surface ping ring
        const pingR = ((frame * 1.5 + i * 10) % 28);
        ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, 1 - pingR / 28)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(targetX, targetY, pingR, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Severed / Jammed Red-shifted signal
        const flicker = Math.sin(frame * 2.2 + i * 2) > 0.0;
        if (flicker && frame < 6.8 * fps) {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.moveTo(satScreenX, satScreenY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Satellite Body
      ctx.fillStyle = isSignalLost ? "#ef4444" : "#00f0ff";
      ctx.shadowColor = isSignalLost ? "rgba(239, 68, 68, 0.9)" : "rgba(0, 240, 255, 0.9)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(satScreenX, satScreenY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Solar Panels
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(satScreenX - 11, satScreenY - 1.5, 5, 3);
      ctx.fillRect(satScreenX + 6, satScreenY - 1.5, 5, 3);

      // Satellite Micro Label
      ctx.font = "9px Consolas, monospace";
      ctx.fillStyle = isSignalLost ? "#ef4444" : "rgba(0, 240, 255, 0.75)";
      ctx.fillText(isSignalLost ? `[JAMMED] ${sat.name}` : sat.name, satScreenX + 10, satScreenY - 8);

      ctx.restore();
    });
  }, [frame, fps, isSignalLost]);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneExit,
        backgroundColor: COLORS.background,
        transform: `translate(${glitch.x}px, ${glitch.y}px)`,
      }}
    >
      {/* 3D Earth & Satellite Canvas */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Top Threat Ribbon */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px",
          backgroundColor: isSignalLost ? "rgba(239, 68, 68, 0.2)" : "rgba(0, 240, 255, 0.12)",
          border: `1px solid ${isSignalLost ? "rgba(239, 68, 68, 0.55)" : "rgba(0, 240, 255, 0.35)"}`,
          borderRadius: 6,
          backdropFilter: "blur(12px)",
          boxShadow: isSignalLost ? "0 0 20px rgba(239, 68, 68, 0.3)" : "0 0 20px rgba(0, 240, 255, 0.15)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isSignalLost ? "#ef4444" : "#00f0ff",
            boxShadow: `0 0 10px ${isSignalLost ? "#ef4444" : "#00f0ff"}`,
          }}
        />
        <span
          style={{
            fontFamily: "Consolas, monospace",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            color: isSignalLost ? "#ef4444" : "#00f0ff",
          }}
        >
          {isSignalLost
            ? "CRITICAL ALERT: GNSS SATELLITE SIGNALS UNAVAILABLE"
            : "ORBITAL TELEMETRY // GLOBAL POSITIONING CONSTELLATION"}
        </span>
      </div>

      {/* Main Dramatic Headline */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          padding: "0 64px",
          zIndex: 30,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: 2.5,
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: isSignalLost
              ? "0 4px 30px rgba(239, 68, 68, 0.4), 0 0 50px rgba(0,0,0,0.9)"
              : "0 4px 30px rgba(0, 240, 255, 0.4), 0 0 50px rgba(0,0,0,0.9)",
          }}
        >
          What happens when positioning signals are unavailable?
        </h1>
        <p
          style={{
            margin: "12px 0 0 0",
            fontFamily: "Consolas, monospace",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 4,
            color: isSignalLost ? "#ef4444" : COLORS.accent,
            textTransform: "uppercase",
          }}
        >
          {isSignalLost
            ? "// SATELLITE DENIAL DETECTED // ELECTRONIC WARFARE JAMMING ACTIVE"
            : "// CONTESTED AIRSPACE ENVIRONMENT // GNSS COMPROMISED"}
        </p>
      </div>
    </AbsoluteFill>
  );
};
