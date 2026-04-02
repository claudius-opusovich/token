import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { Box, Button, Icon, IconButton, Icons, Text } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue } from 'jotai';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { NavEmptyCenter, NavEmptyLayout } from '../../../components/nav';
import { getHomeRoomPath, getHomeSearchPath, getHomeCreatePath } from '../../pathUtils';
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
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="200">
          {!isMobile && (
            <IconButton
              variant="Background"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Icon src={Icons.Setting} size="200" />
            </IconButton>
          )}
          <Box grow="Yes">
            <Text size="H4" truncate>
              Token
            </Text>
          </Box>
          <IconButton
            variant="Background"
            onClick={() => navigate(getHomeSearchPath())}
            aria-label="Search"
          >
            <Icon src={Icons.Search} size="200" />
          </IconButton>
          <IconButton
            variant="Background"
            onClick={() => navigate(getHomeCreatePath())}
            aria-label="New Chat"
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
  return (
    <Box
      style={{
        padding: '6px 12px 4px',
        gap: '6px',
        display: 'flex',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}
    >
      {(Object.keys(FILTER_LABELS) as ChatFilter[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          style={{
            borderRadius: '16px',
            padding: '4px 14px',
            background: active === f ? '#5288c1' : 'rgba(255,255,255,0.06)',
            color: active === f ? '#fff' : 'rgba(255,255,255,0.55)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active === f ? 600 : 400,
            whiteSpace: 'nowrap',
            transition: 'background 150ms ease, color 150ms ease',
          }}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
    </Box>
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
    estimateSize: () => 62,
    overscan: 10,
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
