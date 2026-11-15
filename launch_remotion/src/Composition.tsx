import React from "react";
import { AbsoluteFill, Sequence, staticFile, Audio, useVideoConfig } from "remotion";
import { TIMELINE } from "./constants";
import { HookThreatScene } from "./scenes/HookThreatScene";
import { RevealPlatformScene } from "./scenes/RevealPlatformScene";
import { ShowcaseMatchingScene } from "./scenes/ShowcaseMatchingScene";
import { ShowcaseInliersScene } from "./scenes/ShowcaseInliersScene";
import { ShowcaseCadastralScene } from "./scenes/ShowcaseCadastralScene";
import { ClimaxCloseScene } from "./scenes/ClimaxCloseScene";

export const SceneNavLaunch: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#05080d" }}>
      {/* Layer 0: Continuous Dark Ambient Synth Bed */}
      <Audio src={staticFile("cinematic_ambient_score.wav")} volume={0.35} />

      {/* Scene 1: Hook / Threat Environment (0 to 10.8s) */}
      <Sequence
        from={Math.round(TIMELINE.hook.start * fps)}
        durationInFrames={Math.round(TIMELINE.hook.duration * fps)}
        premountFor={fps}
      >
        <HookThreatScene />
      </Sequence>

      {/* Scene 2: Reveal Platform (10.8 to 19.3s) */}
      <Sequence
        from={Math.round(TIMELINE.reveal.start * fps)}
        durationInFrames={Math.round(TIMELINE.reveal.duration * fps)}
        premountFor={fps}
      >
        <RevealPlatformScene />
      </Sequence>

      {/* Scene 3: Showcase Feature Matching (19.3 to 28.3s) */}
      <Sequence
        from={Math.round(TIMELINE.matching.start * fps)}
        durationInFrames={Math.round(TIMELINE.matching.duration * fps)}
        premountFor={fps}
      >
        <ShowcaseMatchingScene />
      </Sequence>

      {/* Scene 4: Showcase 224 Inliers & Footprint (28.3 to 37.3s) */}
      <Sequence
        from={Math.round(TIMELINE.inliers.start * fps)}
        durationInFrames={Math.round(TIMELINE.inliers.duration * fps)}
        premountFor={fps}
      >
        <ShowcaseInliersScene />
      </Sequence>

      {/* Scene 5: Showcase Munich Cadastral Slider (37.3 to 45.8s) */}
      <Sequence
        from={Math.round(TIMELINE.cadastral.start * fps)}
        durationInFrames={Math.round(TIMELINE.cadastral.duration * fps)}
        premountFor={fps}
      >
        <ShowcaseCadastralScene />
      </Sequence>

      {/* Scene 6: Climax Diagnostic Lock & Brand Reveal (45.8 to 58.0s) */}
      <Sequence
        from={Math.round(TIMELINE.climax.start * fps)}
        durationInFrames={Math.round(TIMELINE.climax.duration * fps)}
        premountFor={fps}
      >
        <ClimaxCloseScene />
      </Sequence>
    </AbsoluteFill>
  );
};
