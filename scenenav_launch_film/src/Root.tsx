import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './constants';
import {SceneNavLaunch} from './Composition';

export const RemotionRoot: React.FC = () => <Composition id="SceneNavLaunch65" component={SceneNavLaunch} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT}/>;
