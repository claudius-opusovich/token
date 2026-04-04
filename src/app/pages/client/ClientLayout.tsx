import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { useMatch } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { BottomNav } from './BottomNav';
import {
  HOME_ROOM_PATH,
  DIRECT_ROOM_PATH,
  SPACE_ROOM_PATH,
} from '../paths';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const isDesktop = screenSize === ScreenSize.Desktop;

  const inHomeRoom   = useMatch({ path: HOME_ROOM_PATH,   end: false });
  const inDirectRoom = useMatch({ path: DIRECT_ROOM_PATH, end: false });
  const inSpaceRoom  = useMatch({ path: SPACE_ROOM_PATH,  end: false });
  const inRoom = !!(inHomeRoom || inDirectRoom || inSpaceRoom);

  const mobileBottomPadding = isMobile
    ? inRoom
      ? 'var(--safe-area-bottom)'
      : 'calc(var(--bottom-nav-height) + var(--safe-area-bottom))'
    : undefined;

  return (
    <Box grow="Yes" direction="Row">
      {/* Sidebar icon nav — only on tablet (not mobile, not desktop) */}
      {!isMobile && !isDesktop && nav}

      {/* Main content — with bottom padding on mobile to clear the nav bar */}
      <Box
        grow="Yes"
        direction="Column"
        style={mobileBottomPadding ? { paddingBottom: mobileBottomPadding } : undefined}
      >
        {children}
      </Box>

      {/* Bottom navigation — only on mobile */}
      {isMobile && <BottomNav />}
    </Box>
  );
}
