import React, { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';
import { DIRECT_PATH, EXPLORE_PATH, HOME_PATH, INBOX_PATH, SPACE_PATH } from './paths';

type MobileFriendlyClientNavProps = {
  children: ReactNode;
};
export function MobileFriendlyClientNav({ children }: MobileFriendlyClientNavProps) {
  const screenSize = useScreenSizeContext();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const directMatch = useMatch({ path: DIRECT_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const inboxMatch = useMatch({ path: INBOX_PATH, caseSensitive: true, end: true });

  const isVisible =
    screenSize !== ScreenSize.Mobile ||
    !!(homeMatch || directMatch || spaceMatch || exploreMatch || inboxMatch);

  if (!isVisible) return null;

  if (screenSize === ScreenSize.Mobile) {
    return (
      <div
        key="client-nav"
        className="mobile-slide-left"
        style={{ display: 'contents' }}
      >
        {children}
      </div>
    );
  }

  return children;
}

type MobileFriendlyPageNavProps = {
  path: string;
  children: ReactNode;
};
export function MobileFriendlyPageNav({ path, children }: MobileFriendlyPageNavProps) {
  const screenSize = useScreenSizeContext();
  const exactPath = useMatch({
    path,
    caseSensitive: true,
    end: true,
  });

  const isVisible = screenSize !== ScreenSize.Mobile || !!exactPath;

  if (!isVisible) return null;

  if (screenSize === ScreenSize.Mobile && exactPath) {
    return (
      <div
        key={path}
        className="mobile-slide-right"
        style={{ display: 'contents' }}
      >
        {children}
      </div>
    );
  }

  return children;
}
