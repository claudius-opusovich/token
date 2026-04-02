import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ReplyBend = style({
  flexShrink: 0,
});

export const ThreadIndicator = style({
  opacity: config.opacity.P300,

  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    ':hover&': {
      opacity: config.opacity.P500,
    },
  },
});

export const Reply = style({
  marginBottom: toRem(4),
  minWidth: 0,
  maxWidth: '100%',
  minHeight: config.lineHeight.T300,
  borderRadius: toRem(6),
  padding: `${toRem(4)} ${toRem(8)} ${toRem(4)} ${toRem(10)}`,
  background: 'rgba(255,255,255,0.06)',
  overflow: 'hidden',
  position: 'relative',
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    'button&:hover': {
      background: 'rgba(255,255,255,0.1)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: toRem(3),
      borderRadius: `${toRem(3)} 0 0 ${toRem(3)}`,
      background: 'var(--reply-color, var(--tg-accent, #5288c1))',
    },
  },
});

export const ReplyContent = style({
  opacity: 0.75,
  selectors: {
    [`${Reply}:hover &`]: {
      opacity: 0.9,
    },
  },
});
