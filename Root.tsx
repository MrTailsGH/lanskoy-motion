import React from 'react';
import { Composition } from 'remotion';
import { Skidka20 } from './Skidka20';
import { FPS } from './anim';
import { LAYOUT } from './theme';

/**
 * Здесь регистрируются все ролики канала.
 * Новый ролик = новый файл в compositions/ + одна <Composition> ниже.
 *
 * durationInFrames = длительность в секундах × FPS.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Skidka20"
      component={Skidka20}
      durationInFrames={38 * FPS}
      fps={FPS}
      width={LAYOUT.width}
      height={LAYOUT.height}
    />
  </>
);
