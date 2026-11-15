import React from "react";
import { Composition } from "remotion";
import { SceneNavLaunch } from "./Composition";
import { Cinematic65sComposition } from "./Cinematic65sComposition";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 65-Second Premium Cinematic Launch Film */}
      <Composition
        id="SceneNavCinematic65s"
        component={Cinematic65sComposition}
        durationInFrames={TOTAL_FRAMES} // 1950 frames = 65.0s @ 30 FPS
        fps={FPS} // 30 FPS
        width={WIDTH} // 1920
        height={HEIGHT} // 1080
      />

      {/* Previous 58s Workstation Showcase */}
      <Composition
        id="SceneNavLaunch"
        component={SceneNavLaunch}
        durationInFrames={3480}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
