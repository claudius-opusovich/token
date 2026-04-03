import { createVar, style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, color, config, toRem } from 'folds';

const Container = createVar();
const ContainerHover = createVar();
const ContainerActive = createVar();
const ContainerLine = createVar();
const OnContainer = createVar();

export const Reaction = style([
  FocusOutline,
  {
    vars: {
      [Container]: 'rgba(255,255,255,0.07)',
      [ContainerHover]: 'rgba(255,255,255,0.13)',
      [ContainerActive]: 'rgba(255,255,255,0.18)',
      [ContainerLine]: 'rgba(255,255,255,0.12)',
      [OnContainer]: color.SurfaceVariant.OnContainer,
    },
    padding: `${toRem(3)} ${toRem(8)} ${toRem(3)} ${toRem(6)}`,
    backgroundColor: Container,
    border: `1px solid ${ContainerLine}`,
    borderRadius: toRem(14),
    transition: 'background-color 120ms ease, border-color 120ms ease, transform 80ms ease',

    selectors: {
      'button&': {
        cursor: 'pointer',
      },
      'button&:active': {
        transform: 'scale(0.93)',
      },
      '&[aria-pressed=true]': {
        vars: {
          [Container]: 'rgba(82,136,193,0.22)',
          [ContainerHover]: 'rgba(82,136,193,0.32)',
          [ContainerActive]: 'rgba(82,136,193,0.40)',
          [ContainerLine]: 'rgba(82,136,193,0.65)',
          [OnContainer]: '#2AABEE',
        },
        backgroundColor: Container,
        borderColor: ContainerLine,
      },
      '&[aria-selected=true]': {
        borderColor: color.Secondary.Main,
      },
      '&:hover, &:focus-visible': {
        backgroundColor: ContainerHover,
      },
      '&:active': {
        backgroundColor: ContainerActive,
      },
      '&[aria-disabled=true], &:disabled': {
        cursor: 'not-allowed',
      },
    },
  },
]);

export const ReactionText = style([
  DefaultReset,
  {
    minWidth: 0,
    maxWidth: toRem(150),
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: toRem(20),
    fontSize: '1.1em',
  },
]);

export const ReactionImg = style([
  DefaultReset,
  {
    height: '1.1em',
    minWidth: 0,
    maxWidth: toRem(150),
    objectFit: 'contain',
  },
]);
