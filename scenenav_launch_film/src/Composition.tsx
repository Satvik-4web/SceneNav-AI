import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {TIMELINE} from './constants';
import {BrandReveal, HookOrbit, IntelligenceReliability, Pipeline, ProblemPair, TechnologyMatching, TransformationFootprint} from './scenes/Scenes';

const SceneAudio: React.FC<{src: string; start: number; duration: number}> = ({src, start, duration}) => {
  const {fps} = useVideoConfig();
  return <Sequence from={Math.round(start * fps)} durationInFrames={Math.round(duration * fps)}><Audio src={staticFile(src)} volume={1}/></Sequence>;
};

export const SceneNavLaunch: React.FC = () => {
  const {fps} = useVideoConfig();
  const S = ({from, duration, children}: {from:number;duration:number;children:React.ReactNode}) => <Sequence from={Math.round(from*fps)} durationInFrames={Math.round(duration*fps)} premountFor={fps}>{children}</Sequence>;
  return <AbsoluteFill style={{backgroundColor:'#03070d'}}>
    <Audio src={staticFile('audio/original-score.wav')} volume={0.33}/>
    <SceneAudio src="audio/vo-hook.wav" {...TIMELINE.hook}/>
    <SceneAudio src="audio/vo-problem.wav" {...TIMELINE.problem}/>
    <SceneAudio src="audio/vo-technology.wav" {...TIMELINE.technology}/>
    <SceneAudio src="audio/vo-transformation.wav" {...TIMELINE.transformation}/>
    <SceneAudio src="audio/vo-intelligence.wav" {...TIMELINE.intelligence}/>
    <SceneAudio src="audio/vo-pipeline.wav" {...TIMELINE.pipeline}/>
    <SceneAudio src="audio/vo-brand.wav" {...TIMELINE.brand}/>
    <S from={TIMELINE.hook.start} duration={TIMELINE.hook.duration}><HookOrbit/></S>
    <S from={TIMELINE.problem.start} duration={TIMELINE.problem.duration}><ProblemPair/></S>
    <S from={TIMELINE.technology.start} duration={TIMELINE.technology.duration}><TechnologyMatching/></S>
    <S from={TIMELINE.transformation.start} duration={TIMELINE.transformation.duration}><TransformationFootprint/></S>
    <S from={TIMELINE.intelligence.start} duration={TIMELINE.intelligence.duration}><IntelligenceReliability/></S>
    <S from={TIMELINE.pipeline.start} duration={TIMELINE.pipeline.duration}><Pipeline/></S>
    <S from={TIMELINE.brand.start} duration={TIMELINE.brand.duration}><BrandReveal/></S>
  </AbsoluteFill>;
};
