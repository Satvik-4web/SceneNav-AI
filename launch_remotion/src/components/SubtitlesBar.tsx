import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../constants";

interface SubtitlesBarProps {
  primaryText: string;
  highlightWords?: string[];
  opacity?: number;
}

export const SubtitlesBar: React.FC<SubtitlesBarProps> = ({
  primaryText,
  highlightWords = [],
  opacity = 1,
}) => {
  // Highlight words
  const words = primaryText.split(" ");

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 48,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          padding: "14px 28px",
          backgroundColor: "rgba(8, 12, 18, 0.90)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "Segoe UI, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.4,
            color: COLORS.primary,
            letterSpacing: 0.2,
          }}
        >
          {words.map((word, i) => {
            const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
            const isHighlighted = highlightWords.some(
              (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
            );

            return (
              <span
                key={i}
                style={{
                  color: isHighlighted ? COLORS.accent : COLORS.primary,
                  marginRight: 6,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </p>
      </div>
    </AbsoluteFill>
  );
};
