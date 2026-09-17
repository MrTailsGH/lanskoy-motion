import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Row, Pill, Hero, Bars, Caption, Footer } from './Primitives';
import { C, S, LINE, RAD, MOT } from './tokens';

const meta: Meta = { title: 'Сцена/Детали' };
export default meta;
type S0 = StoryObj;

export const Карточка: S0 = {
  render: () => (
    <Card>
      <Row label="на руки" value="80 000 ₽" color={C.dim2} />
      <Row label="начислено" value="92 000 ₽" dot={C.ink} pill="+ НДФЛ 13%" pillColor={C.red} />
      <Row label="страховые взносы" value="27 600 ₽" dot={C.red} color={C.red}
           pill="30% от начисленного" pillColor={C.red} />
      <Row label="рабочее место" value="14 400 ₽" dot={C.red} color={C.red} />
    </Card>
  ),
};

export const Титры: S0 = {
  render: () => (
    <div style={{ display: 'grid', gap: 60 }}>
      <Caption head="ВЫ ПЛАТИТЕ ЕМУ" />
      <Caption head="А ТРАТИТЕ" tail="СТО ТРИДЦАТЬ ЧЕТЫРЕ." color={C.red} />
      <Caption head="ОСТАЁТСЯ" tail="ДВЕСТИ ОДИННАДЦАТЬ." color={C.green} />
    </div>
  ),
};

export const ГлавноеЧисло: S0 = {
  render: () => (
    <div style={{ display: 'grid', gap: 80 }}>
      <Hero label="итого в месяц. на одного" value="134 000 ₽" sub="× 1,7 к окладу" color={C.red} />
      <Hero label="ваш ноль" value="750" sub="штук в месяц · 750 000 ₽ выручки" color={C.green} />
    </div>
  ),
};

export const Столбики: S0 = {
  render: () => (
    <Bars left={{ cap: 'рост продаж', num: '+10%', h: 0.3 }}
          right={{ cap: 'рост цены', num: '+33%', h: 1 }}
          mark="×3,3" markColor={C.green} />
  ),
};

export const Пилюли: S0 = {
  render: () => (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <Pill text="+10% к цене" color={C.green} />
      <Pill text="30% от начисленного" color={C.red} />
      <Pill text="не меняется" color={C.dim} />
      <Pill text="@lanskoy" color={C.teal} />
    </div>
  ),
};

export const Футер: S0 = {
  render: () => <Footer calc="расчёт: оклад на руки 80 000 ₽ · взносы 30% · 2026" />,
};

export const Токены: S0 = {
  name: 'Токены оформления',
  render: () => {
    const swatch = (name: string, val: string) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
        <div style={{ width: 96, height: 96, borderRadius: RAD.sm, background: val,
                      border: `1px solid ${LINE}` }} />
        <div>
          <div style={{ font: '30px "Golos Text SemiBold"', color: C.ink }}>{name}</div>
          <div style={{ font: '26px "Golos Text Medium"', color: C.dim,
                        fontVariantNumeric: 'tabular-nums' }}>{val}</div>
        </div>
      </div>
    );
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
        <div>
          <h3 style={{ font: '34px "Golos Text Black"', color: C.ink, marginBottom: 24 }}>Смысл цвета</h3>
          {swatch('деньги', C.green)}
          {swatch('потеря', C.red)}
          {swatch('бренд', C.teal)}
          {swatch('текст', C.ink)}
          {swatch('приглушённый', C.dim)}
          {swatch('фон', C.bg)}
        </div>
        <div>
          <h3 style={{ font: '34px "Golos Text Black"', color: C.ink, marginBottom: 24 }}>
            Поверхности · лесенка HeroUI
          </h3>
          {swatch('content 1 · карточка', S.c1)}
          {swatch('content 2', S.c2)}
          {swatch('content 3 · столбик', S.c3)}
          {swatch('content 4', S.c4)}
          <h3 style={{ font: '34px "Golos Text Black"', color: C.ink, margin: '40px 0 20px' }}>
            Скругление и движение
          </h3>
          <div style={{ font: '28px "Golos Text Medium"', color: C.dim, lineHeight: 1.7 }}>
            sm {RAD.sm} · md {RAD.md} · lg {RAD.lg} · full<br />
            приход {MOT.in} с · уход {MOT.out} с
          </div>
        </div>
      </div>
    );
  },
};
