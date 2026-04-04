import { Box, Icon, IconSrc } from 'folds';
import React, { ReactNode } from 'react';
import { BubbleLayout, CompactLayout, ModernLayout } from '..';
import { MessageLayout } from '../../../state/settings';

export type EventContentProps = {
  messageLayout: number;
  time: ReactNode;
  iconSrc: IconSrc;
  content: ReactNode;
};
export function EventContent({ messageLayout, time, iconSrc, content }: EventContentProps) {
  if (messageLayout === MessageLayout.Bubble) {
    return (
      <Box justifyContent="Center" style={{ padding: '2px 0' }}>
        <Box
          alignItems="Center"
          gap="100"
          style={{
            background: 'var(--tg-surface-overlay)',
            borderRadius: '12px',
            padding: '3px 12px',
            display: 'inline-flex',
            maxWidth: '80%',
          }}
        >
          <Icon style={{ opacity: 0.4, flexShrink: 0 }} size="50" src={iconSrc} />
          <Box alignItems="Center" gap="100">
            {content}
            <Box shrink="No" style={{ opacity: 0.45 }}>
              {time}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
      {messageLayout === MessageLayout.Compact && time}
      <Box
        grow={messageLayout === MessageLayout.Compact ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Icon style={{ opacity: 0.6 }} size="50" src={iconSrc} />
      </Box>
    </Box>
  );

  const msgContentJSX = (
    <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
      {content}
      {messageLayout !== MessageLayout.Compact && time}
    </Box>
  );

  if (messageLayout === MessageLayout.Compact) {
    return <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>;
  }
  return <ModernLayout before={beforeJSX}>{msgContentJSX}</ModernLayout>;
}
