import React from 'react';
import type { Preview } from '@storybook/react-vite';
import t from '../../design-tokens.json';

/* Сцена рисуется на тёмном фоне со слабым зелёным свечением — Storybook
   показывает детали в той же среде, иначе судить о них бессмысленно. */
const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: t['цвет'].bg,
          minHeight: '100vh',
          padding: 48,
          fontFamily: '"Golos Text", system-ui, sans-serif',
          color: t['цвет'].ink,
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(47,211,142,.07) 0%, rgba(10,13,12,0) 60%)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default preview;
