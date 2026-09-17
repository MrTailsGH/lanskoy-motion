import raw from '../../design-tokens.json';

/* Единственный источник оформления — design-tokens.json в корне.
   Его же вписывает в сцены tokens.py. Правим там, а не здесь. */
export const C = raw['цвет'];
export const S = raw['поверхность'];
export const LINE = raw['разделитель'].line;
export const LINE2 = raw['разделитель'].line2;
export const RAD = raw['скругление'];
export const MOT = raw['движение'];

/* Сцена — 1080 px по ширине. Storybook показывает в масштабе 1:1,
   поэтому кегли и отступы здесь те же, что в сценах. */
export const STAGE = 1080;
export const X0 = 60;
export const CW = 760;
