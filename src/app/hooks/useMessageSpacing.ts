import { useMemo } from 'react';
import { MessageSpacing } from '../state/settings';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] =>
  useMemo(
    () => [
      {
        spacing: '0',
        name: 'Нет',
      },
      {
        spacing: '100',
        name: 'Минимальный',
      },
      {
        spacing: '200',
        name: 'Очень маленький',
      },
      {
        spacing: '300',
        name: 'Маленький',
      },
      {
        spacing: '400',
        name: 'Обычный',
      },
      {
        spacing: '500',
        name: 'Большой',
      },
    ],
    []
  );
