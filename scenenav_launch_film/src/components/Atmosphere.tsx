import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../constants';

const particles = Array.from({length: 44}, (_, i) => ({
  x: (i * 137) % 100,
  y: (i * 61) % 100,
  size: 1 + (i % 4),
  phase: i * 0.71,
}));

export const Atmosphere: React.FC<{accent?: string; intensity?: number}> = ({
  accent = COLORS.cyan,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drift = Math.sin(frame / fps / 3) * 4;
  const bloom = 0.32 + Math.sin(frame / fps * 0.7) * 0.08;

  return (
    <>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute', width: 1180, height: 1180, left: -260 + drift * 8,
            top: -560 + drift * 2, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}${Math.round(26 * intensity).toString(16).padStart(2, '0')} 0%, transparent 63%)`,
            filter: 'blur(8px)', transform: `scale(${1 + bloom})`,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 940, height: 940, right: -260 - drift * 8,
            bottom: -470, borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.emerald}18 0%, transparent 63%)`,
            filter: 'blur(16px)', transform: `scale(${1.05 - bloom * 0.4})`,
          }}
        />
        <div style={{position: 'absolute', inset: 0, opacity: 0.34,
          backgroundImage: `linear-gradient(${COLORS.line} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.line} 1px, transparent 1px)`,
          backgroundSize: '96px 96px', transform: `translate(${drift}px, ${-drift}px) perspective(1200px) rotateX(56deg) scale(1.65)`, transformOrigin: '50% 105%',
        }}/>
        {particles.map((p) => {
          const y = p.y + Math.sin(frame / fps * 0.6 + p.phase) * 2 - (frame / fps * (1 + (p.phase % 1.4))) % 10;
          const opacity = 0.15 + (Math.sin(frame / fps + p.phase) + 1) * 0.12;
          return <span key={p.phase} style={{position: 'absolute', left: `${p.x}%`, top: `${y}%`, width: p.size, height: p.size, borderRadius: '50%', background: accent, boxShadow: `0 0 ${p.size * 5}px ${accent}`, opacity}}/>;
        })}
        <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.035}}>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/></filter>
          <rect width="100%" height="100%" filter="url(#grain)"/>
        </svg>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.55) 100%)'}}/>
      </div>
    </>
  );
};

export const ScanLine: React.FC<{top?: number; color?: string; width?: number}> = ({top = 50, color = COLORS.cyan, width = 100}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x = interpolate(frame, [0, fps * 4], [-width, 100], {extrapolateRight: 'extend'});
  return <div style={{position: 'absolute', top: `${top}%`, left: `${x}%`, width: `${width}%`, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 16px ${color}`}}/>;
};
