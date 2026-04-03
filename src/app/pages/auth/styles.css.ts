import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: 0,
  position: 'relative',
});

export const AuthCard = style({
  marginTop: '1vh',
  maxWidth: toRem(400),
  width: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R500,
  boxShadow: config.shadow.E200,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
});

export const AuthLogoSection = style({
  padding: `${toRem(36)} ${config.space.S400} ${toRem(24)}`,
  textAlign: 'center',
});

export const AuthLogo = style([
  DefaultReset,
  {
    width: toRem(80),
    height: toRem(80),
    borderRadius: '50%',
    marginBottom: config.space.S300,
  },
]);

/** @deprecated kept for compat, no longer rendered */
export const AuthHeader = style({
  display: 'none',
});

export const AuthCardContent = style({
  maxWidth: toRem(360),
  width: '100%',
  margin: 'auto',
  padding: config.space.S400,
  paddingTop: 0,
  paddingBottom: toRem(36),
  gap: toRem(28),
});

export const AuthFooter = style({
  padding: config.space.S200,
});
