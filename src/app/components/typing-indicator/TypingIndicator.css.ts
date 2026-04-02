import { keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, toRem } from 'folds';

// Telegram-style bounce: dot jumps up with scale, then returns
const TypingDotAnime = keyframes({
  '0%':   { transform: 'translateY(0) scale(1)',    opacity: '0.55' },
  '30%':  { transform: 'translateY(-50%) scale(1.15)', opacity: '1'   },
  '60%':  { transform: 'translateY(0) scale(1)',    opacity: '0.55' },
  '100%': { transform: 'translateY(0) scale(1)',    opacity: '0.55' },
});

export const TypingDot = recipe({
  base: [
    DefaultReset,
    {
      display: 'inline-block',
      backgroundColor: 'currentColor',
      borderRadius: '50%',
      opacity: 0.55,
    },
  ],
  variants: {
    animated: {
      true: {
        animation: `${TypingDotAnime} 1.0s ease-in-out infinite`,
      },
    },
    size: {
      '300': {
        width: toRem(4),
        height: toRem(4),
      },
      '400': {
        width: toRem(7),
        height: toRem(7),
      },
    },
    index: {
      '0': { animationDelay: '0s'    },
      '1': { animationDelay: '0.18s' },
      '2': { animationDelay: '0.36s' },
    },
  },
  defaultVariants: {
    size: '400',
    animated: true,
  },
});
