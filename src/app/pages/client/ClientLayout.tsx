import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { BottomNav } from './BottomNav';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const isDesktop = screenSize === ScreenSize.Desktop;

  return (
    <Box grow="Yes" direction="Row">
      {/* Sidebar icon nav — only on tablet (not mobile, not desktop) */}
      {!isMobile && !isDesktop && nav}

      {/* Main content — with bottom padding on mobile to clear the nav bar */}
      <Box
        grow="Yes"
        direction="Column"
        style={
          isMobile
            ? { paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom))' }
            : undefined
        }
      >
        {children}
      </Box>

      {/* Bottom navigation — only on mobile */}
      {isMobile && <BottomNav />}
    </Box>
  );
}
