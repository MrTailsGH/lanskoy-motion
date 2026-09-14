/**
 * ВИЗУАЛЬНАЯ СИСТЕМА ЛАНСКОГО
 * Единственный источник правды по цвету и типографике.
 * Меняете здесь — меняется во всех роликах сразу.
 */

export const COLOR = {
  bg: '#0A0D0C',        // основной фон
  glow: '#123028',      // радиальное свечение за карточкой
  card: '#141A18',      // поверхность карточки
  cardDim: '#101614',   // неактивная пилюля
  line: '#212A27',      // обводки
  ink: '#F3F7F6',       // основной текст
  muted: '#788783',     // лейблы
  dim: '#4A5451',       // служебные подписи внизу
  green: '#2FD38E',     // деньги, положительное
  red: '#F0524D',       // потеря, отрицательное
  teal: '#3FB7C9',      // бренд, CTA
  onGreen: '#06231A',   // текст на зелёной пилюле
} as const;

export const FONT = {
  // Golos Text — кириллица родная, есть вес 900
  display: '"Golos Text", system-ui, sans-serif',
  body: '"Golos Text", system-ui, sans-serif',
} as const;

/** Кадр 1080×1920. Все размеры — в пикселях этого кадра. */
export const LAYOUT = {
  width: 1080,
  height: 1920,
  gutter: 70,
  captionTop: 120,
} as const;

export const TYPE = {
  caption: { fontSize: 80, fontWeight: 900, lineHeight: 0.98, letterSpacing: '-0.028em' },
  value: { fontSize: 84, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1 },
  label: { fontSize: 24, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const },
  hero: { fontSize: 196, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 0.92 },
  pill: { fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em' },
  footnote: { fontSize: 23, letterSpacing: '0.05em' },
} as const;

/** Ритм: сколько кадров занимают типовые движения при 24 fps. */
export const BEAT = {
  wordIn: 4,        // появление одного слова титра
  wordStagger: 1.3, // сдвиг между словами
  cardIn: 12,       // въезд карточки
  countUp: 17,      // набегание числа
  morph: 29,        // пересчёт значения при смене условий
} as const;
