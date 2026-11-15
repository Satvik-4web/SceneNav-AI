import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, fontDisplay, fontMono} from '../constants';
import {enter, sceneStyle} from '../motion';

export const Kicker: React.FC<{children: React.ReactNode; delay?: number; color?: string}> = ({children, delay = 0, color = COLORS.cyan}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const p = enter(f, fps, delay, 0.4);
  return <div style={{fontFamily: fontMono, color, letterSpacing: 3, fontSize: 20, fontWeight: 600, opacity: p, transform: `translateY(${(1-p)*18}px)`, filter: `blur(${(1-p)*5}px)`}}>{children}</div>;
};

export const Title: React.FC<{children: React.ReactNode; delay?: number; size?: number; width?: number}> = ({children, delay = 0, size = 76, width = 780}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const p = enter(f, fps, delay, 0.7);
  return <div style={{fontFamily: fontDisplay, color: COLORS.white, fontWeight: 700, fontSize: size, width, lineHeight: 0.97, letterSpacing: -2, opacity: p, transform: `translateY(${(1-p)*42}px) scale(${0.94 + p * 0.06})`, filter: `blur(${(1-p)*12}px)`, textShadow: '0 16px 60px rgba(0,0,0,.45)'}}>{children}</div>;
};

export const Caption: React.FC<{children: React.ReactNode; delay?: number; width?: number}> = ({children, delay = 0.4, width = 660}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const p = enter(f, fps, delay, 0.5);
  return <div style={{fontFamily: fontDisplay, color: COLORS.muted, fontSize: 28, lineHeight: 1.32, width, opacity: p, transform: `translateY(${(1-p)*20}px)`, filter: `blur(${(1-p)*8}px)`}}>{children}</div>;
};

export const SceneContainer: React.FC<{duration: number; children: React.ReactNode}> = ({duration, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return <div style={{position: 'absolute', inset: 0, ...sceneStyle(f, fps, duration)}}>{children}</div>;
};

export const Glass: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <div style={{border: '1px solid rgba(154,226,255,.22)', background: 'linear-gradient(135deg, rgba(14,39,57,.73), rgba(4,13,22,.55))', boxShadow: '0 26px 80px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.06)', backdropFilter: 'blur(16px)', ...style}}>{children}</div>;
