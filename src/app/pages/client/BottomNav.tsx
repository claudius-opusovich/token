import React, { useState } from 'react';
import { useNavigate, useMatch } from 'react-router-dom';
import { Icon, Icons, IconSrc } from 'folds';
import { useAtomValue } from 'jotai';
import {
  HOME_PATH,
  HOME_ROOM_PATH,
  DIRECT_PATH,
  DIRECT_ROOM_PATH,
  INBOX_PATH,
  EXPLORE_PATH,
  SPACE_ROOM_PATH,
} from '../paths';
import {
  getHomePath,
  getDirectPath,
  getInboxPath,
  getExploreFeaturedPath,
} from '../pathUtils';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { Settings } from '../../features/settings';

type Tab = {
  id: string;
  label: string;
  icon: IconSrc;
};

const TABS: Tab[] = [
  { id: 'home',     label: 'Чаты',      icon: Icons.Home    },
  { id: 'direct',   label: 'Личные',    icon: Icons.Message },
  { id: 'inbox',    label: 'Входящие',  icon: Icons.Inbox   },
  { id: 'explore',  label: 'Поиск',     icon: Icons.Globe   },
  { id: 'settings', label: 'Настройки', icon: Icons.Setting },
];

export function BottomNav() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  // Detect current active tab
  const homeMatch    = useMatch({ path: HOME_PATH,    end: false });
  const directMatch  = useMatch({ path: DIRECT_PATH,  end: false });
  const inboxMatch   = useMatch({ path: INBOX_PATH,   end: false });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, end: false });

  // Hide bottom nav when inside a specific room chat
  const inHomeRoom   = useMatch({ path: HOME_ROOM_PATH,   end: false });
  const inDirectRoom = useMatch({ path: DIRECT_ROOM_PATH, end: false });
  const inSpaceRoom  = useMatch({ path: SPACE_ROOM_PATH,  end: false });
  const inRoom = !!(inHomeRoom || inDirectRoom || inSpaceRoom);

  if (inRoom) return null;

  const activeTab = homeMatch    ? 'home'
                  : directMatch  ? 'direct'
                  : inboxMatch   ? 'inbox'
                  : exploreMatch ? 'explore'
                  : undefined;

  const handleTabPress = (id: string) => {
    switch (id) {
      case 'home':     navigate(getHomePath()); break;
      case 'direct':   navigate(getDirectPath()); break;
      case 'inbox':    navigate(getInboxPath()); break;
      case 'explore':  navigate(getExploreFeaturedPath()); break;
      case 'settings': setSettingsOpen(true); break;
    }
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'stretch',
          height: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom))',
          paddingBottom: 'var(--safe-area-bottom)',
          background: '#17212b',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              aria-label={tab.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                position: 'relative',
                color: isActive ? '#2AABEE' : 'rgba(255,255,255,0.45)',
                transition: 'color 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                position: 'relative',
              }}>
                <Icon src={tab.icon} size="200" />
                {/* Unread badge on Inbox tab */}
                {tab.id === 'inbox' && inviteCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: '#e17076',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                    border: '2px solid #17212b',
                  }}>
                    {inviteCount > 99 ? '99+' : inviteCount}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                lineHeight: 1,
                letterSpacing: 0.1,
              }}>
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#2AABEE',
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Full-screen settings overlay */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: '#17212b',
            overflowY: 'auto',
            animation: 'slideInFromRight 220ms cubic-bezier(0.25,0.46,0.45,0.94) both',
          }}
        >
          <Settings requestClose={() => setSettingsOpen(false)} />
        </div>
      )}
    </>
  );
}
