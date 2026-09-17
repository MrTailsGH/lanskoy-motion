import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import '@heroui/styles';
import { Card } from '@heroui/react/card';
import { Chip } from '@heroui/react/chip';
import { ProgressBar } from '@heroui/react/progress-bar';

/* Родные компоненты HeroUI рядом с нашими — видно, что взято из системы, а
   что намеренно оставлено своим. Цвета здесь их собственные: в ролики они
   не идут, это образец для сравнения.
   HeroUI 3 отличается от второй версии: общего barrel-экспорта и провайдера
   нет, компоненты берутся подпутями, стили — отдельным пакетом. */
const meta: Meta = {
  title: 'HeroUI/Образец',
  decorators: [(Story) => <div className="dark"><Story /></div>],
};
export default meta;

export const Компоненты: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 28, maxWidth: 760 }}>
      <Card>
        <div style={{ padding: 20 }}>
          Карточка HeroUI: поверхность content1, скругление large,
          разделитель прозрачностью
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Chip color="success">success</Chip>
        <Chip color="danger">danger</Chip>
        <Chip color="primary">primary</Chip>
        <Chip>default</Chip>
      </div>
      <ProgressBar value={62} />
    </div>
  ),
};
