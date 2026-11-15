import React from "react";
import { AbsoluteFill, Sequence, staticFile, Audio, useVideoConfig } from "remotion";
import { TIMELINE_65S } from "./constants";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Technology } from "./scenes/Scene3Technology";
import { Scene4Transformation } from "./scenes/Scene4Transformation";
import { Scene5Intelligence } from "./scenes/Scene5Intelligence";
import { Scene6Pipeline } from "./scenes/Scene6Pipeline";
import { Scene7Brand } from "./scenes/Scene7Brand";
import { CinematicMasterHUD } from "./components/CinematicMasterHUD";

export const Cinematic65sComposition: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#03060a" }}>
      {/* Master 65s Mixed Soundtrack & SFX & Narration Audio */}
      <Audio src={staticFile("cinematic_master_audio_65s.wav")} volume={1.0} />

      {/* Persistent Aerospace Tactical HUD Overlay */}
      <CinematicMasterHUD />

      {/* 00–08s: THE HOOK */}
      <Sequence
        from={Math.round(TIMELINE_65S.hook.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.hook.duration * fps)}
        premountFor={fps}
      >
        <Scene1Hook />
      </Sequence>

      {/* 08–17s: THE PROBLEM */}
      <Sequence
        from={Math.round(TIMELINE_65S.problem.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.problem.duration * fps)}
        premountFor={fps}
      >
        <Scene2Problem />
      </Sequence>

      {/* 17–29s: THE TECHNOLOGY */}
      <Sequence
        from={Math.round(TIMELINE_65S.technology.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.technology.duration * fps)}
        premountFor={fps}
      >
        <Scene3Technology />
      </Sequence>

      {/* 29–40s: THE TRANSFORMATION */}
      <Sequence
        from={Math.round(TIMELINE_65S.transformation.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.transformation.duration * fps)}
        premountFor={fps}
      >
        <Scene4Transformation />
      </Sequence>

      {/* 40–50s: THE INTELLIGENCE */}
      <Sequence
        from={Math.round(TIMELINE_65S.intelligence.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.intelligence.duration * fps)}
        premountFor={fps}
      >
        <Scene5Intelligence />
      </Sequence>

      {/* 50–58s: THE PIPELINE */}
      <Sequence
        from={Math.round(TIMELINE_65S.pipeline.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.pipeline.duration * fps)}
        premountFor={fps}
      >
        <Scene6Pipeline />
      </Sequence>

      {/* 58–65s: THE BRAND REVEAL */}
      <Sequence
        from={Math.round(TIMELINE_65S.brand.start * fps)}
        durationInFrames={Math.round(TIMELINE_65S.brand.duration * fps)}
        premountFor={fps}
      >
        <Scene7Brand />
      </Sequence>
    </AbsoluteFill>
  );
};
