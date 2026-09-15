import React from 'react';
import { AbsoluteFill, useCurrentFrame, continueRender, delayRender } from 'remotion';
import { COLOR, FONT, LAYOUT, TYPE, BEAT } from './theme';
import { seg, s, FPS } from './anim';

/* ───────────────────────────────────────────────────────────
   ШРИФТ. Golos Text тянется с Google Fonts прямо на раннере —
   в CI есть интернет, поэтому бинарники в репозитории не нужны.
   delayRender держит кадр, пока шрифт не готов: иначе первые
   кадры отрендерятся системным шрифтом.
   ─────────────────────────────────────────────────────────── */
let fontsStarted = false;
export const useFonts = () => {
  if (fontsStarted || typeof document === 'undefined') return;
  fontsStarted = true;
  const handle = delayRender('Golos Text');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800;900&display=swap';
  document.head.appendChild(link);
  link.onload = () => {
    document.fonts.ready.then(() => continueRender(handle));
  };
  link.onerror = () => continueRender(handle);
};

/* ═══════════ Chrome ═══════════ */
/** Фон со свечением — постоянная подложка всех роликов. */
export const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% 38%, ${COLOR.glow} 0%, rgba(10,13,12,0) 62%)`,
      }}
    />
  </AbsoluteFill>
);

/** Белая вспышка — маркер смены акта. opacity 0..1. */
export const Flash: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity }} />
);

/** Две служебные строки внизу: расчёт и подпись канала. */
export const Footer: React.FC<{
  calc?: string;
  signature: string;
  calcOpacity?: number;
  onWhite?: boolean;
}> = ({ calc, signature, calcOpacity = 1, onWhite = false }) => {
  const color = onWhite ? '#B9C2BF' : COLOR.dim;
  return (
    <>
      {calc ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 196,
            textAlign: 'center',
            color,
            opacity: calcOpacity,
            ...TYPE.footnote,
          }}
        >
          {calc}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 130,
          textAlign: 'center',
          color,
          fontSize: 25,
          letterSpacing: '0.16em',
        }}
      >
        {signature}
      </div>
    </>
  );
};

export const GUTTER = LAYOUT.gutter;


/* ═══════════ Caption ═══════════ */
export type Cue = { at: number; text: string };

/**
 * Пословные титры — главный носитель ритма в этом формате.
 * Слова появляются лесенкой, а не все разом: глаз успевает прочитать.
 *
 * cues пишутся в секундах и в идеале снимаются с реальной озвучки,
 * а не расставляются на глаз.
 */
export const Caption: React.FC<{ cues: Cue[]; color?: string }> = ({
  cues,
  color = COLOR.ink,
}) => {
  const frame = useCurrentFrame();

  // текущая реплика — последняя, чьё время уже наступило
  let active: Cue | null = null;
  for (const c of cues) if (frame >= s(c.at)) active = c;
  if (!active || !active.text) return null;

  const words = active.text.split(' ');

  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.gutter,
        right: LAYOUT.gutter,
        top: LAYOUT.captionTop,
        textAlign: 'center',
        fontFamily: FONT.display,
        textTransform: 'uppercase',
        color,
        ...TYPE.caption,
      }}
    >
      {words.map((w, i) => {
        const p = seg(
          frame,
          active!.at + (i * BEAT.wordStagger) / FPS,
          BEAT.wordIn / FPS
        );
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              margin: '0 0.14em',
              opacity: p,
              transform: `translateY(${(1 - p) * 26}px) scale(${0.94 + 0.06 * p})`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};


/* ═══════════ Card ═══════════ */
export type Row = {
  label: string;
  value: string;
  unit?: string;
  tone?: 'ink' | 'green' | 'red';
  dot?: 'red' | 'green';
  opacity?: number;
};

const toneColor = (t: Row['tone']) =>
  t === 'green' ? COLOR.green : t === 'red' ? COLOR.red : COLOR.ink;

/**
 * «Карточка приложения» — центральный носитель смысла.
 * Зритель верит цифре, когда она стоит в интерфейсе, а не просто написана на фоне.
 */
export const Card: React.FC<{
  top: number;
  rows: Row[];
  opacity?: number;
  lift?: number;      // сдвиг вверх при въезде, px
  scale?: number;
  bar?: { label: string; caption: string; fill: number; tone: 'green' | 'red'; opacity?: number };
}> = ({ top, rows, opacity = 1, lift = 0, scale = 1, bar }) => (
  <div
    style={{
      position: 'absolute',
      left: LAYOUT.gutter,
      right: LAYOUT.gutter,
      top,
      background: COLOR.card,
      border: `1px solid ${COLOR.line}`,
      borderRadius: 34,
      padding: '46px 48px 50px',
      boxShadow: '0 40px 90px -50px #000',
      fontFamily: FONT.body,
      opacity,
      transform: `translateY(${lift}px) scale(${scale})`,
      transformOrigin: '50% 50%',
    }}
  >
    {rows.map((r, i) => (
      <div
        key={i}
        style={{
          marginBottom: i === rows.length - 1 ? 0 : 38,
          opacity: r.opacity ?? 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: COLOR.muted,
            marginBottom: 12,
            ...TYPE.label,
          }}
        >
          <i
            style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: r.dot === 'green' ? COLOR.green : COLOR.red,
              display: 'block',
              flex: 'none',
            }}
          />
          {r.label}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            color: toneColor(r.tone),
            fontVariantNumeric: 'tabular-nums',
            ...TYPE.value,
          }}
        >
          {r.value}
          {r.unit ? (
            <span style={{ fontSize: 34, fontWeight: 700, color: COLOR.muted }}>
              {r.unit}
            </span>
          ) : null}
        </div>
      </div>
    ))}

    {bar ? (
      <div style={{ marginTop: 26, opacity: bar.opacity ?? 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <span style={{ color: COLOR.muted, ...TYPE.label }}>{bar.label}</span>
          <b
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: bar.tone === 'red' ? COLOR.red : COLOR.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {bar.caption}
          </b>
        </div>
        <div
          style={{
            height: 20,
            borderRadius: 999,
            background: '#0C1211',
            border: `1px solid ${COLOR.line}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, bar.fill))}%`,
              background: bar.tone === 'red' ? COLOR.red : COLOR.green,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    ) : null}
  </div>
);


/* ═══════════ Bits ═══════════ */
/** Пилюли выбора. Активная становится зелёной — это визуальный «клик». */
export const Pills: React.FC<{
  top: number;
  items: string[];
  activeIndex: number | null;
  opacity?: number;
}> = ({ top, items, activeIndex, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: LAYOUT.gutter,
      right: LAYOUT.gutter,
      top,
      display: 'flex',
      gap: 20,
      fontFamily: FONT.body,
      opacity,
    }}
  >
    {items.map((t, i) => {
      const on = i === activeIndex;
      return (
        <div
          key={i}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '24px 10px',
            borderRadius: 999,
            background: on ? COLOR.green : COLOR.cardDim,
            border: `1px solid ${on ? COLOR.green : COLOR.line}`,
            color: on ? COLOR.onGreen : COLOR.muted,
            ...TYPE.pill,
          }}
        >
          {t}
        </div>
      );
    })}
  </div>
);

/** Крупное число — кульминация ролика. Одно на весь ролик, не больше. */
export const Hero: React.FC<{
  top: number;
  value: string;
  sub: string;
  color?: string;
  opacity?: number;
  scale?: number;
}> = ({ top, value, sub, color = COLOR.red, opacity = 1, scale = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: LAYOUT.gutter,
      right: LAYOUT.gutter,
      top,
      textAlign: 'center',
      fontFamily: FONT.display,
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <div style={{ color, fontVariantNumeric: 'tabular-nums', ...TYPE.hero }}>
      {value}
    </div>
    <div style={{ marginTop: 26, fontSize: 34, color: COLOR.muted }}>{sub}</div>
  </div>
);

/** Сравнение столбиками — когда надо показать «во сколько раз». */
export const Bars: React.FC<{
  top: number;
  height: number;
  cols: { fill: number; label: string; caption: string; tone: 'green' | 'red' }[];
  opacity?: number;
}> = ({ top, height, cols, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: LAYOUT.gutter,
      right: LAYOUT.gutter,
      top,
      height,
      display: 'flex',
      gap: 34,
      alignItems: 'flex-end',
      fontFamily: FONT.display,
      opacity,
    }}
  >
    {cols.map((c, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '100%',
        }}
      >
        <div
          style={{
            height: c.fill,
            borderRadius: '24px 24px 10px 10px',
            background: c.tone === 'red' ? COLOR.red : COLOR.green,
          }}
        />
        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            color: c.tone === 'red' ? COLOR.red : COLOR.ink,
          }}
        >
          <b style={{ display: 'block', fontSize: 54, fontWeight: 900, letterSpacing: '-0.03em' }}>
            {c.label}
          </b>
          <span
            style={{
              display: 'block',
              fontSize: 25,
              color: COLOR.muted,
              marginTop: 8,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {c.caption}
          </span>
        </div>
      </div>
    ))}
  </div>
);

/** Тезис на белом — пауза в ритме, чтобы мысль осела. */
export const WhiteCard: React.FC<{
  top: number;
  title: string;
  sub: string;
  opacity?: number;
}> = ({ top, title, sub, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: 100,
      right: 100,
      top,
      textAlign: 'center',
      color: COLOR.bg,
      fontFamily: FONT.display,
      opacity,
    }}
  >
    <div style={{ fontSize: 66, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
      {title}
    </div>
    <div style={{ marginTop: 28, fontSize: 34, color: '#5A6663', lineHeight: 1.35, fontWeight: 500 }}>
      {sub}
    </div>
  </div>
);

/** Финальный призыв — один, в конце, без «подпишись». */
export const CTA: React.FC<{
  top: number;
  line1: string;
  line2: string;
  handle: string;
  opacity?: number;
  lift?: number;
}> = ({ top, line1, line2, handle, opacity = 1, lift = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      textAlign: 'center',
      fontFamily: FONT.display,
      opacity,
      transform: `translateY(${lift}px)`,
    }}
  >
    <div style={{ fontSize: 52, color: COLOR.teal, letterSpacing: '0.2em', lineHeight: 0.6 }}>
      ⌃<br />⌃
    </div>
    <div style={{ marginTop: 30, fontSize: 62, fontWeight: 900, letterSpacing: '-0.02em', color: COLOR.ink }}>
      {line1}
    </div>
    <div style={{ marginTop: 10, fontSize: 62, fontWeight: 900, letterSpacing: '-0.02em', color: COLOR.green }}>
      {line2}
    </div>
    <div>
      <span
        style={{
          display: 'inline-block',
          marginTop: 46,
          padding: '22px 46px',
          borderRadius: 999,
          background: COLOR.ink,
          color: COLOR.bg,
          fontSize: 38,
          fontWeight: 700,
        }}
      >
        {handle}
      </span>
    </div>
  </div>
);
