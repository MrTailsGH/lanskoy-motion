import React from 'react';
import { C, S, LINE, RAD, CW } from './tokens';

/* Детали сцены, вынесенные из i0*.html один в один: те же кегли, отступы и
   токены. Storybook нужен, чтобы судить о них по отдельности — гонять
   четырёхминутный рендер ради скругления пилюли неразумно. */

export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    width: CW, background: C.card, border: `1px solid ${LINE}`,
    borderRadius: RAD.lg, padding: '30px 34px',
  }}>{children}</div>
);

export const Row: React.FC<{
  label: string; value: string; dot?: string; color?: string; pill?: string; pillColor?: string;
}> = ({ label, value, dot = C.dim, color = C.ink, pill, pillColor = C.red }) => (
  <div style={{ position: 'relative', height: 122 }}>
    <div style={{ position: 'absolute', left: 0, bottom: 10, width: '100%', height: 1, background: LINE, opacity: .55 }} />
    <div style={{ position: 'absolute', left: 0, top: 15, width: 12, height: 12, borderRadius: 6, background: dot }} />
    <div style={{
      position: 'absolute', left: 26, top: 4, font: '28px "Golos Text Medium"',
      letterSpacing: '.11em', textTransform: 'uppercase', color: C.dim, whiteSpace: 'nowrap',
    }}>{label}</div>
    <div style={{
      position: 'absolute', left: 0, top: 44, font: '64px "Golos Text Black"',
      letterSpacing: '-.01em', color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
    }}>{value}</div>
    {pill && <Pill text={pill} color={pillColor} style={{ position: 'absolute', right: 0, top: 52 }} />}
  </div>
);

export const Pill: React.FC<{ text: string; color?: string; style?: React.CSSProperties }> =
  ({ text, color = C.green, style }) => (
  <span style={{
    display: 'inline-block', font: '25px "Golos Text SemiBold"', padding: '10px 18px',
    borderRadius: RAD.full, whiteSpace: 'nowrap', color,
    background: color === C.green ? 'rgba(47,211,142,.13)'
              : color === C.red ? 'rgba(240,82,77,.13)' : 'rgba(255,255,255,.05)',
    ...style,
  }}>{text}</span>
);

export const Hero: React.FC<{ label: string; value: string; sub?: string; color?: string }> =
  ({ label, value, sub, color = C.red }) => (
  <div style={{ width: CW }}>
    <div style={{ height: 4, width: 130, background: color }} />
    <div style={{
      font: '31px "Golos Text Medium"', letterSpacing: '.14em', textTransform: 'uppercase',
      color: C.dim, marginTop: 26,
    }}>{label}</div>
    <div style={{
      font: '138px "Golos Text Black"', letterSpacing: '-.03em', whiteSpace: 'nowrap',
      color, marginTop: 8, lineHeight: 1.02, fontVariantNumeric: 'tabular-nums',
    }}>{value}</div>
    {sub && <div style={{ font: '34px "Golos Text Medium"', color: C.dim, marginTop: 14 }}>{sub}</div>}
  </div>
);

export const Bars: React.FC<{
  left: { cap: string; num: string; h: number }; right: { cap: string; num: string; h: number };
  mark?: string; markColor?: string;
}> = ({ left, right, mark, markColor = C.green }) => {
  const BH = 520;
  const col = (b: { cap: string; num: string; h: number }, x: number, color: string, fill: string) => (
    <div style={{ position: 'absolute', left: x, bottom: 0, width: 300 }}>
      <div style={{ font: '28px "Golos Text Medium"', letterSpacing: '.1em', textTransform: 'uppercase',
        color: C.dim, textAlign: 'center', marginBottom: 14 }}>{b.cap}</div>
      <div style={{ font: '66px "Golos Text Black"', textAlign: 'center', color,
        fontVariantNumeric: 'tabular-nums', marginBottom: 18 }}>{b.num}</div>
      <div style={{ height: Math.round(BH * b.h), background: fill, borderRadius: RAD.sm }} />
    </div>
  );
  return (
    <div style={{ position: 'relative', width: CW, height: BH + 190 }}>
      {col(left, 0, C.dim, S.c3)}
      {col(right, 460, markColor, markColor)}
      {mark && <div style={{
        position: 'absolute', left: 300, top: 410, width: 160, textAlign: 'center',
        font: '52px "Golos Text Black"', color: markColor,
      }}>{mark}</div>}
    </div>
  );
};

export const Caption: React.FC<{ head: string; tail?: string; color?: string }> =
  ({ head, tail, color = C.ink }) => (
  <div style={{
    width: CW, font: '76px "Golos Text Black"', lineHeight: 1.08, letterSpacing: '-.015em',
    textTransform: 'uppercase', color: C.ink,
  }}>
    {head}{tail && <><br /><span style={{ color }}>{tail}</span></>}
  </div>
);

export const Footer: React.FC<{ calc: string }> = ({ calc }) => (
  <div style={{ width: CW }}>
    <div style={{ font: '25px "Golos Text Medium"', color: C.dim2, letterSpacing: '.05em' }}>{calc}</div>
    <div style={{ marginTop: 14 }}>
      <span style={{ font: '28px "Golos Text Black"', color: C.ink, letterSpacing: '.16em' }}>ЛАНСКОЙ</span>
      <span style={{ font: '25px "Golos Text Medium"', color: C.dim, letterSpacing: '.05em', marginLeft: 22 }}>
        · про деньги без воды
      </span>
    </div>
  </div>
);
