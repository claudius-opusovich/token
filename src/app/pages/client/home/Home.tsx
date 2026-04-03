import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { Box, Button, Icon, IconButton, Icons, Text } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue } from 'jotai';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { NavEmptyCenter, NavEmptyLayout } from '../../../components/nav';
import { getHomeRoomPath, getHomeSearchPath, getHomeCreatePath, getInboxPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { Settings } from '../../../features/settings';
import { Modal500 } from '../../../components/Modal500';
import { mDirectAtom } from '../../../state/mDirectList';
import { pinnedRoomsAtom } from '../../../state/pinnedRooms';

type ChatFilter = 'all' | 'personal' | 'groups';

const FILTER_LABELS: Record<ChatFilter, string> = {
  all: 'Все',
  personal: 'Личка',
  groups: 'Группы',
};

function HomeHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchFocus = () => setSearchFocused(true);
  const handleSearchBlur = () => {
    if (searchInputRef.current && searchInputRef.current.value === '') {
      setSearchFocused(false);
    }
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInputRef.current?.value) {
      navigate(getHomeSearchPath());
    }
    if (e.key === 'Escape') {
      searchInputRef.current?.blur();
      setSearchFocused(false);
    }
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="200" style={{ padding: '4px 0' }}>
          {!isMobile && (
            <IconButton
              variant="Background"
              onClick={() => {
                if (searchFocused) {
                  setSearchFocused(false);
                  if (searchInputRef.current) searchInputRef.current.value = '';
                  searchInputRef.current?.blur();
                } else {
                  setSettingsOpen(true);
                }
              }}
              aria-label={searchFocused ? 'Назад' : 'Меню'}
              style={{ transition: 'transform 250ms cubic-bezier(0.25,0.1,0.25,1)' }}
            >
              <Icon
                src={searchFocused ? Icons.ArrowLeft : Icons.Setting}
                size="200"
              />
            </IconButton>
          )}
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск"
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 22,
              background: 'var(--bg-surface, #17212b)',
              border: 'none',
              padding: '0 16px',
              color: '#e4ecf2',
              fontSize: 14,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <IconButton
            variant="Background"
            onClick={() => navigate(getHomeCreatePath())}
            aria-label="Новый чат"
          >
            <Icon src={Icons.Plus} size="200" />
          </IconButton>
        </Box>
      </PageNavHeader>
      {settingsOpen && (
        isMobile ? (
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
        ) : (
          <Modal500 requestClose={() => setSettingsOpen(false)}>
            <Settings requestClose={() => setSettingsOpen(false)} />
          </Modal500>
        )
      )}
    </>
  );
}

function FilterTabs({
  active,
  onChange,
}: {
  active: ChatFilter;
  onChange: (f: ChatFilter) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeBtn) {
      setIndicator({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    }
  }, []);

  useEffect(() => {
    updateIndicator();
  }, [active, updateIndicator]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'relative',
      }}
    >
      {(Object.keys(FILTER_LABELS) as ChatFilter[]).map((f) => (
        <button
          key={f}
          data-active={active === f}
          onClick={() => onChange(f)}
          style={{
            flex: 1,
            padding: '10px 0 11px',
            background: 'none',
            color: active === f ? '#2AABEE' : 'rgba(255,255,255,0.45)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active === f ? 500 : 400,
            whiteSpace: 'nowrap',
            transition: 'color 150ms ease',
          }}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          borderRadius: '3px 3px 0 0',
          background: '#2AABEE',
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          transition: 'transform 250ms cubic-bezier(0.2,0,0,1), width 250ms cubic-bezier(0.2,0,0,1)',
        }}
      />
    </div>
  );
}

function HomeEmpty() {
  const navigate = useNavigate();

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Hash} />}
        title={
          <Text size="H5" align="Center">
            Нет чатов
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            У вас пока нет чатов.
          </Text>
        }
        options={
          <Button onClick={() => navigate(getHomeCreatePath())} variant="Secondary" size="300">
            <Text size="B300" truncate>
              Новый чат
            </Text>
          </Button>
        }
      />
    </NavEmptyCenter>
  );
}

export function Home() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const rooms = useHomeRooms();
  const mDirects = useAtomValue(mDirectAtom);
  const pinnedRooms = useAtomValue(pinnedRoomsAtom);
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const [filter, setFilter] = useState<ChatFilter>('all');

  const selectedRoomId = useSelectedRoom();

  const sortedRooms = useMemo(() => {
    const byActivity = factoryRoomIdByActivity(mx);
    const all = Array.from(rooms).sort(byActivity);
    const pinned = pinnedRooms.filter((id) => all.includes(id));
    const unpinned = all.filter((id) => !pinnedRooms.includes(id));
    return [...pinned, ...unpinned];
  }, [mx, rooms, pinnedRooms]);

  const filteredRooms = useMemo(() => {
    if (filter === 'personal') return sortedRooms.filter((id) => mDirects.has(id));
    if (filter === 'groups') return sortedRooms.filter((id) => !mDirects.has(id));
    return sortedRooms;
  }, [sortedRooms, filter, mDirects]);

  const noRoomToDisplay = filteredRooms.length === 0 && rooms.length === 0;

  const virtualizer = useVirtualizer({
    count: filteredRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  return (
    <PageNav>
      <HomeHeader />
      <FilterTabs active={filter} onChange={setFilter} />
      {noRoomToDisplay ? (
        <HomeEmpty />
      ) : (
        <PageNavContent scrollRef={scrollRef}>
          <div
            style={{
              position: 'relative',
              height: virtualizer.getTotalSize(),
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const roomId = filteredRooms[vItem.index];
              const room = mx.getRoom(roomId);
              if (!room) return null;
              const selected = selectedRoomId === roomId;

              return (
                <VirtualTile
                  virtualItem={vItem}
                  key={vItem.index}
                  ref={virtualizer.measureElement}
                >
                  <RoomNavItem
                    room={room}
                    selected={selected}
                    showAvatar
                    direct={mDirects.has(roomId)}
                    linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                    notificationMode={getRoomNotificationMode(
                      notificationPreferences,
                      room.roomId
                    )}
                  />
                </VirtualTile>
              );
            })}
          </div>
        </PageNavContent>
      )}
    </PageNav>
  );
}
