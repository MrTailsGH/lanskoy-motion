import React from 'react';
import {Composition, staticFile} from 'remotion';
import {HtmlScene, SceneProps} from './HtmlScene';

const FPS = 30;

/**
 * Длина ролика не назначается. Её задаёт дорожка: settime.py кладёт в сцену
 * объект T с DUR, отсюда и берём число кадров. Правило цеха «сколько
 * наговорил диктор — столько и ролик» держится само собой.
 */
const durationFromScene = async (scene: string): Promise<number> => {
  const html = await (await fetch(staticFile(scene))).text();
  const m = html.match(/DUR:\s*([0-9.]+)/);
  if (!m) throw new Error(`в ${scene} нет T.DUR — сцена не нового образца`);
  return Math.round(parseFloat(m[1]) * FPS);
};

const exists = async (name: string): Promise<boolean> => {
  if (!name) return false;
  try {
    const r = await fetch(staticFile(name), {method: 'HEAD'});
    return r.ok;
  } catch {
    return false;
  }
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Rolik"
    component={HtmlScene}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 46}
    defaultProps={{scene: 'scene.html', voice: 'voice.mp3', hasVoice: false} as SceneProps}
    calculateMetadata={async ({props}) => ({
      durationInFrames: await durationFromScene(props.scene),
      props: {...props, hasVoice: await exists(props.voice)},
    })}
  />
);
