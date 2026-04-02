import { keyframes, style } from '@vanilla-extract/css';
import { color, config } from 'folds';

const fadeIn = keyframes({
  '0%': { opacity: 0, transform: 'scale(0.9)' },
  '100%': { opacity: 1, transform: 'scale(1)' },
});

export const SplashScreen = style({
  minHeight: '100%',
  backgroundColor: '#0e1621',
  color: '#e4ecf2',
});

export const SplashScreenFooter = style({
  padding: config.space.S400,
  animation: `${fadeIn} 400ms ease-out`,
});
