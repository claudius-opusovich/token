import { createVar, keyframes, style, styleVariants, globalStyle } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

const bubbleAppear = keyframes({
  '0%': { opacity: 0, transform: 'translateY(4px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

export const StickySection = style({
  position: 'sticky',
  top: config.space.S100,
});

const SpacingVar = createVar();
const SpacingVariant = styleVariants({
  '0': {
    vars: {
      [SpacingVar]: config.space.S0,
    },
  },
  '100': {
    vars: {
      [SpacingVar]: config.space.S100,
    },
  },
  '200': {
    vars: {
      [SpacingVar]: config.space.S200,
    },
  },
  '300': {
    vars: {
      [SpacingVar]: config.space.S300,
    },
  },
  '400': {
    vars: {
      [SpacingVar]: config.space.S400,
    },
  },
  '500': {
    vars: {
      [SpacingVar]: config.space.S500,
    },
  },
});

const highlightAnime = keyframes({
  '0%':   { backgroundColor: 'transparent' },
  '20%':  { backgroundColor: 'rgba(82,136,193,0.30)' },
  '100%': { backgroundColor: 'transparent' },
});
const HighlightVariant = styleVariants({
  true: {
    animation: `${highlightAnime} 1600ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`,
    borderRadius: toRem(8),
  },
});

const SelectedVariant = styleVariants({
  true: {
    backgroundColor: color.Surface.ContainerActive,
  },
});

const AutoCollapse = style({
  selectors: {
    [`&+&`]: {
      marginTop: 0,
    },
  },
});

export const MessageBase = recipe({
  base: [
    DefaultReset,
    {
      marginTop: SpacingVar,
      padding: `${config.space.S100} ${config.space.S200} ${config.space.S100} ${config.space.S400}`,
      borderRadius: `0 ${config.radii.R400} ${config.radii.R400} 0`,
    },
  ],
  variants: {
    space: SpacingVariant,
    collapse: {
      true: {
        marginTop: 0,
      },
    },
    autoCollapse: {
      true: AutoCollapse,
    },
    highlight: HighlightVariant,
    selected: SelectedVariant,
  },
  defaultVariants: {
    space: '400',
  },
});

export type MessageBaseVariants = RecipeVariants<typeof MessageBase>;

export const CompactHeader = style([
  DefaultReset,
  StickySection,
  {
    maxWidth: toRem(170),
    width: '100%',
  },
]);

export const AvatarBase = style({
  paddingTop: toRem(4),
  transition: 'transform 200ms cubic-bezier(0, 0.8, 0.67, 0.97)',
  display: 'flex',
  alignSelf: 'start',

  selectors: {
    '&:hover': {
      transform: `translateY(${toRem(-2)})`,
    },
  },
});

export const ModernBefore = style({
  minWidth: toRem(36),
});

export const BubbleBefore = style({
  minWidth: toRem(36),
});

export const BubbleContent = style({
  maxWidth: toRem(480),
  padding: `${config.space.S200} ${config.space.S300}`,
  backgroundColor: 'var(--tg-bubble-in, ' + color.SurfaceVariant.Container + ')',
  color: 'var(--tg-bubble-in-text, ' + color.SurfaceVariant.OnContainer + ')',
  borderRadius: `${toRem(18)} ${toRem(18)} ${toRem(18)} ${toRem(4)}`,
  position: 'relative',
  overflow: 'hidden',
  animation: `${bubbleAppear} 200ms ease-out`,
});

export const BubbleImageWrap = style({
  // Pull image to bubble edges by negating the bubble's padding
  margin: `calc(-1 * ${config.space.S200}) calc(-1 * ${config.space.S300})`,
  overflow: 'hidden',
  borderRadius: 'inherit',
  lineHeight: 0,
});

export const BubbleContentOutgoing = style({
  backgroundColor: 'var(--tg-bubble-out, ' + color.Primary.Container + ')',
  color: 'var(--tg-bubble-out-text, ' + color.Primary.OnContainer + ')',
  borderRadius: `${toRem(18)} ${toRem(18)} ${toRem(4)} ${toRem(18)}`,
});

export const BubbleContentArrowLeft = style({
  borderTopLeftRadius: 0,
});

export const BubbleContentArrowRight = style({
  borderTopRightRadius: 0,
});

export const BubbleLeftArrow = style({
  width: toRem(9),
  height: toRem(8),

  position: 'absolute',
  top: 0,
  left: toRem(-8),
  zIndex: 1,
});

export const BubbleRightArrow = style({
  width: toRem(9),
  height: toRem(8),

  position: 'absolute',
  top: 0,
  right: toRem(-8),
  zIndex: 1,
});

export const BubbleOutgoingRow = style({
  justifyContent: 'flex-end',
});

export const BubbleTimestamp = style({
  display: 'inline-flex',
  float: 'right',
  marginLeft: config.space.S200,
  marginTop: config.space.S100,
  opacity: 0.7,
  fontSize: toRem(11),
  lineHeight: toRem(16),
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

export const Username = style({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    'button&:hover, button&:focus-visible': {
      textDecoration: 'underline',
    },
  },
});

export const UsernameBold = style({
  fontWeight: 550,
});

export const MessageTextBody = recipe({
  base: {
    wordBreak: 'break-word',
  },
  variants: {
    preWrap: {
      true: {
        whiteSpace: 'pre-wrap',
      },
    },
    jumboEmoji: {
      true: {
        fontSize: '2.8em',
        lineHeight: '1.35em',
      },
    },
    emote: {
      true: {
        color: color.Success.Main,
        fontStyle: 'italic',
      },
    },
  },
});

export type MessageTextBodyVariants = RecipeVariants<typeof MessageTextBody>;
