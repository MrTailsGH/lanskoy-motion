import { interpolate, Easing } from 'remotion';

/**
 * Хелперы времени. Это те же функции, что проверены на превью-рендере —
 * вся математика движения живёт здесь, а не размазана по компонентам.
 */

export const FPS = 30;

/** Секунды → кадры. Сценарий пишем в секундах, Remotion считает в кадрах. */
export const s = (seconds: number) => Math.round(seconds * FPS);

/** Прогресс 0..1 на отрезке [start, start+dur], в секундах. */
export const seg = (
  frame: number,
  startSec: number,
  durSec: number,
  easing = Easing.out(Easing.cubic)
) =>
  interpolate(frame, [s(startSec), s(startSec + durSec)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Появился и исчез: 1 в середине, 0 по краям. */
export const window_ = (
  frame: number,
  inSec: number,
  outSec: number,
  fade = 0.3
) => seg(frame, inSec, fade) * (1 - seg(frame, outSec - fade, fade));

/** Кадр внутри отрезка? */
export const between = (frame: number, aSec: number, bSec: number) =>
  frame >= s(aSec) && frame < s(bSec);

/** Лёгкий «перелёт» — для въезда карточек и крупных чисел. */
export const BACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const SMOOTH = Easing.bezier(0.4, 0, 0.2, 1);

/** Число с пробелами между разрядами: 4113126 → «4 113 126». */
export const ru = (n: number) =>
  Math.round(n)
    .toLocaleString('ru-RU')
    .replace(/ /g, ' ');

/** Проценты с запятой: 12.5 → «12,5%». */
export const pct = (n: number, digits = 1) =>
  n.toFixed(digits).replace('.', ',') + '%';
