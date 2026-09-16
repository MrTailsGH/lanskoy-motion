import React, {useRef, useState, useLayoutEffect, useEffect} from 'react';
import {
  useCurrentFrame, useVideoConfig, delayRender, continueRender, staticFile, Audio,
} from 'remotion';

export type SceneProps = {
  scene: string;     // имя файла сцены в public/
  voice: string;     // имя дорожки в public/ («» — без звука)
  hasVoice: boolean; // проставляется в calculateMetadata
};

/**
 * Обёртка над готовой сценой .html.
 *
 * Сцену не переписываем. Она как была чистой функцией window.seek(t) — так и
 * осталась; Remotion только открывает её в iframe, дёргает seek на каждом
 * кадре и пишет видео. Одна и та же сцена рендерится и локально покадровым
 * Chromium (render.py), и здесь — картинка совпадает кадр в кадр.
 */
export const HtmlScene: React.FC<SceneProps> = ({scene, voice, hasVoice}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ref = useRef<HTMLIFrameElement>(null);
  const [handle] = useState(() =>
    delayRender('загрузка сцены', {timeoutInMilliseconds: 60000}));
  const [ready, setReady] = useState(false);

  /* Ждём, пока внутри окна появится seek и догрузятся шрифты.
     На событие load полагаться нельзя: оно срабатывает и на пустом
     about:blank, который iframe показывает до настоящего документа. */
  useEffect(() => {
    const id = setInterval(() => {
      const w = ref.current?.contentWindow as any;
      if (w && typeof w.seek === 'function' && w.document?.fonts?.status === 'loaded') {
        clearInterval(id);
        w.seek(frame / fps);
        setReady(true);
        continueRender(handle);
      }
    }, 30);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Каждый кадр — синхронный seek до снимка. */
  useLayoutEffect(() => {
    if (!ready) return;
    const w = ref.current?.contentWindow as any;
    if (w && typeof w.seek === 'function') w.seek(frame / fps);
  });

  return (
    <>
      <iframe
        ref={ref}
        src={staticFile(scene)}
        style={{width: 1080, height: 1920, border: 0, display: 'block'}}
      />
      {hasVoice ? <Audio src={staticFile(voice)} /> : null}
    </>
  );
};
