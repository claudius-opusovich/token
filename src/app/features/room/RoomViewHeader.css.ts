import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const HeaderTopic = style({
  ':hover': {
    cursor: 'pointer',
    opacity: config.opacity.P500,
    textDecoration: 'underline',
  },
});

export const CompactHeader = style({
  minHeight: '48px',
  maxHeight: '48px',
});

export const PinnedBanner = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 16px',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  background: 'var(--tg-bubble-in, rgba(255,255,255,0.04))',
  ':hover': {
    opacity: 0.85,
  },
});
