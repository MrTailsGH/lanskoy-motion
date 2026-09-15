import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLOR } from './theme';
import { seg, between, s, ru, pct, BACK, SMOOTH } from './anim';
import {
  useFonts, Backdrop, Flash, Footer, Caption, Cue,
  Card, Pills, Hero, Bars, WhiteCard, CTA,
} from './ui';



/* ─────────────────────────────────────────────────────────
   СЦЕНАРИЙ. Титры в секундах — снимаются с озвучки.
   ───────────────────────────────────────────────────────── */
const CUES: Cue[] = [
  { at: 0.0, text: 'СКИДКА ДВАДЦАТЬ' },
  { at: 1.1, text: 'ПРОЦЕНТОВ' },
  { at: 2.0, text: 'СЪЕДАЕТ НЕ ДВАДЦАТЬ.' },
  { at: 3.6, text: 'СМОТРИТЕ.' },
  { at: 4.6, text: 'ЦЕНА — ТЫСЯЧА.' },
  { at: 6.2, text: 'СЕБЕСТОИМОСТЬ —' },
  { at: 7.3, text: 'СЕМЬСОТ.' },
  { at: 8.4, text: 'ВАША ПРИБЫЛЬ —' },
  { at: 9.6, text: 'ТРИСТА РУБЛЕЙ.' },
  { at: 11.0, text: 'ТЕПЕРЬ СКИДКА.' },
  { at: 12.3, text: 'ДВАДЦАТЬ ПРОЦЕНТОВ.' },
  { at: 13.6, text: 'ЦЕНА — ВОСЕМЬСОТ.' },
  { at: 15.2, text: 'СЕБЕСТОИМОСТЬ' },
  { at: 16.2, text: 'НЕ ИЗМЕНИЛАСЬ.' },
  { at: 17.6, text: 'ПРИБЫЛЬ — СТО.' },
  { at: 19.2, text: 'БЫЛО ТРИСТА.' },
  { at: 20.4, text: 'СТАЛО СТО.' },
  { at: 21.6, text: 'МИНУС ШЕСТЬДЕСЯТ СЕМЬ' },
  { at: 23.0, text: 'ПРОЦЕНТОВ ПРИБЫЛИ.' },
  { at: 24.6, text: '' },
  { at: 27.8, text: 'ЧТОБЫ ЗАРАБОТАТЬ' },
  { at: 28.9, text: 'СТОЛЬКО ЖЕ —' },
  { at: 30.0, text: 'НАДО ПРОДАТЬ' },
  { at: 31.0, text: 'ВТРОЕ БОЛЬШЕ.' },
  { at: 32.6, text: 'СКИДКА — ЭТО НЕ' },
  { at: 33.7, text: 'МИНУС ДВАДЦАТЬ.' },
  { at: 34.8, text: '' },
];

const COST = 700;
const BASE_PRICE = 1000;

export const Skidka20: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  /* ── белая вставка: инвертирует тему на 25–27.4 с ── */
  const white = seg(frame, 24.6, 0.18, SMOOTH) * (1 - seg(frame, 27.4, 0.35, SMOOTH));
  const onWhite = white > 0.5;
  const inkNow = onWhite ? COLOR.bg : COLOR.ink;

  /* ── пересчёт цены после скидки ── */
  const discount = seg(frame, 13.0, 1.2, SMOOTH);
  const price = BASE_PRICE - 200 * discount;
  const profit = price - COST;
  const afterDiscount = frame >= s(13);

  /* ── карточка ── */
  const cardOn = between(frame, 4.2, 24.2);
  const cardIn = seg(frame, 4.2, 0.5, BACK);
  const pillsOn = between(frame, 11.0, 19.2);

  const c1 = seg(frame, 4.6, 0.7);
  const c2 = seg(frame, 6.2, 0.7);
  const c3 = seg(frame, 8.4, 0.8);

  const margin = (profit / price) * 100;
  const barOn = frame >= s(9.8);
  const shownMargin = afterDiscount ? margin : 30 * seg(frame, 9.8, 0.8);

  /* ── крупное число ── */
  const heroOn = between(frame, 20.8, 24.4);
  const heroP = seg(frame, 20.8, 0.45, BACK);

  /* ── столбики ── */
  const barsOn = between(frame, 27.8, 34.8);
  const g1 = seg(frame, 28.2, 0.7);
  const g2 = seg(frame, 30.2, 0.9);

  const ctaOn = frame >= s(34.8);
  const ctaP = seg(frame, 34.8, 0.5, BACK);

  return (
    <AbsoluteFill>
      <Backdrop />

      {cardOn ? (
        <Card
          top={pillsOn ? 620 : 560}
          opacity={seg(frame, 4.2, 0.3)}
          lift={(1 - cardIn) * 40}
          scale={0.97 + 0.03 * cardIn}
          rows={[
            {
              label: afterDiscount ? 'цена со скидкой' : 'цена',
              value: ru(afterDiscount ? price : BASE_PRICE * c1),
              unit: '₽',
              dot: 'red',
              opacity: seg(frame, 4.6, 0.35),
            },
            {
              label: 'себестоимость',
              value: ru(COST * c2),
              unit: '₽',
              dot: 'red',
              opacity: seg(frame, 6.2, 0.35),
            },
            {
              label: frame >= s(17) ? 'прибыль стала' : 'прибыль с продажи',
              value: ru(afterDiscount ? profit : 300 * c3),
              unit: '₽',
              tone: frame >= s(17) && profit < 150 ? 'red' : 'green',
              dot: 'green',
              opacity: seg(frame, 8.4, 0.35),
            },
          ]}
          bar={
            barOn
              ? {
                  label: 'маржинальность',
                  caption: pct(shownMargin),
                  fill: (shownMargin / 35) * 100,
                  tone: shownMargin < 20 ? 'red' : 'green',
                  opacity: seg(frame, 9.8, 0.4),
                }
              : undefined
          }
        />
      ) : null}

      {pillsOn ? (
        <Pills
          top={470}
          items={['дать скидку 20%', 'держать цену']}
          activeIndex={frame >= s(12.6) ? 0 : null}
          opacity={seg(frame, 11.0, 0.3) * (1 - seg(frame, 18.9, 0.3))}
        />
      ) : null}

      {heroOn ? (
        <Hero
          top={1180}
          value="−67%"
          sub="прибыли. за одну галочку «скидка»"
          opacity={seg(frame, 20.8, 0.25) * (1 - seg(frame, 24.1, 0.3))}
          scale={0.86 + 0.14 * heroP}
        />
      ) : null}

      {barsOn ? (
        <Bars
          top={760}
          height={620}
          opacity={seg(frame, 27.8, 0.3) * (1 - seg(frame, 34.5, 0.3))}
          cols={[
            { fill: 190 * g1, label: '1×', caption: 'сейчас', tone: 'green' },
            {
              fill: 570 * g2,
              label: (1 + 2 * g2).toFixed(1).replace('.', ',') + '×',
              caption: 'со скидкой',
              tone: 'red',
            },
          ]}
        />
      ) : null}

      {ctaOn ? (
        <CTA
          top={1180}
          line1="РАЗБОРЫ ЦИФР"
          line2="В TELEGRAM"
          handle="@lanskoy"
          opacity={seg(frame, 34.8, 0.3)}
          lift={(1 - ctaP) * 30}
        />
      ) : null}

      <Caption cues={CUES} color={inkNow} />

      <Flash opacity={white} />

      {between(frame, 25.0, 27.5) ? (
        <WhiteCard
          top={840}
          title="скидка не уменьшает выручку"
          sub="она уменьшает прибыль — а это разные деньги"
          opacity={seg(frame, 25.0, 0.3) * (1 - seg(frame, 27.2, 0.3))}
        />
      ) : null}

      <Footer
        calc="расчёт: цена 1000 ₽ · себестоимость 700 ₽ · скидка 20%"
        calcOpacity={between(frame, 4.2, 34.6) ? 1 : 0}
        signature="ланской · про деньги без воды"
        onWhite={onWhite}
      />
    </AbsoluteFill>
  );
};
