import React, {
  ChangeEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Avatar, Box, Icon, Icons, Scroll, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { Room } from 'matrix-js-sdk';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page, PageContent, PageContentCenter } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useHomeRooms } from './useHomeRooms';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useDirects, useRooms } from '../../../state/hooks/roomList';
import {
  SearchItemStrGetter,
  useAsyncSearch,
  UseAsyncSearchOptions,
} from '../../../hooks/useAsyncSearch';
import { useAllJoinedRoomsSet, useGetRoom } from '../../../hooks/useGetRoom';
import { RoomAvatar } from '../../../components/room-avatar';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../../utils/room';
import { highlightText, makeHighlightRegex } from '../../../plugins/react-custom-html-parser';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { nameInitials } from '../../../utils/common';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getMxIdLocalPart, guessDmRoomUserId } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';

type SearchTab = 'chats' | 'messages';

const TAB_LABELS: Record<SearchTab, string> = {
  chats: 'Чаты',
  messages: 'Сообщения',
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: { contain: true },
  normalizeOptions: { ignoreWhitespace: false },
};

function ChatSearchResults({
  query,
  onRoomClick,
}: {
  query: string;
  onRoomClick: (roomId: string) => void;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const mDirects = useAtomValue(mDirectAtom);
  const allRoomsSet = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allRoomsSet);
  const rooms = useRooms(mx, allRoomsAtom, mDirects);
  const directs = useDirects(mx, allRoomsAtom, mDirects);

  const allChats = useMemo(
    () => [...rooms, ...directs].sort(factoryRoomIdByActivity(mx)).slice(0, 60),
    [mx, rooms, directs]
  );

  const getTargetStr: SearchItemStrGetter<string> = useCallback(
    (roomId: string) => {
      const roomName = getRoom(roomId)?.name ?? roomId;
      if (mDirects.has(roomId)) {
        const targetUserId = guessDmRoomUserId(getRoom(roomId) as Room, mx.getSafeUserId());
        const targetUsername = targetUserId && getMxIdLocalPart(targetUserId);
        if (targetUsername) return [roomName, targetUsername];
      }
      return roomName;
    },
    [getRoom, mDirects, mx]
  );

  const [result, search, resetSearch] = useAsyncSearch(allChats, getTargetStr, SEARCH_OPTIONS);

  const prevQuery = useRef('');
  if (query !== prevQuery.current) {
    prevQuery.current = query;
    if (query) search(query);
    else resetSearch();
  }

  const roomsToRender = result ? result.items : allChats.slice(0, 20);
  const queryHighlightRegex = result?.query
    ? makeHighlightRegex(result.query.split(' '))
    : undefined;

  return (
    <div>
      {roomsToRender.map((roomId) => {
        const room = getRoom(roomId);
        if (!room) return null;
        const dm = mDirects.has(roomId);
        const dmUserId = dm ? guessDmRoomUserId(room as Room, mx.getSafeUserId()) : undefined;
        const dmUsername = dmUserId && getMxIdLocalPart(dmUserId);

        return (
          <button
            key={roomId}
            onClick={() => onRoomClick(roomId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              textAlign: 'left',
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <Avatar size="400" radii={dm ? '400' : '300'} style={{ flexShrink: 0 }}>
              <RoomAvatar
                roomId={room.roomId}
                src={
                  dm
                    ? getDirectRoomAvatarUrl(mx, room as Room, 40, useAuthentication)
                    : getRoomAvatarUrl(mx, room as Room, 40, useAuthentication)
                }
                alt={room.name}
                renderFallback={() => (
                  <Text as="span" size="H6">
                    {nameInitials(room.name)}
                  </Text>
                )}
              />
            </Avatar>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.9)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {queryHighlightRegex ? highlightText(queryHighlightRegex, [room.name]) : room.name}
              </div>
              {dmUsername && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  @{dmUsername}
                </div>
              )}
            </div>
          </button>
        );
      })}

      {roomsToRender.length === 0 && query && (
        <div
          style={{
            padding: '60px 16px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '14px',
          }}
        >
          Ничего не найдено
        </div>
      )}
    </div>
  );
}

export function HomeSearch() {
  const msgScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rooms = useHomeRooms();
  const screenSize = useScreenSizeContext();
  const navigate = useNavigate();
  const { navigateRoom } = useRoomNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<SearchTab>('chats');
  const [chatQuery, setChatQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const val = e.currentTarget.value;
    setInputValue(val);
    if (tab === 'chats') {
      setChatQuery(val);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val) next.set('term', val);
        else next.delete('term');
        return next;
      });
    }
  };

  const handleTabChange = (newTab: SearchTab) => {
    setTab(newTab);
    if (newTab === 'chats') {
      setChatQuery(inputValue);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (inputValue) next.set('term', inputValue);
        else next.delete('term');
        return next;
      });
    }
  };

  const handleClear = () => {
    setInputValue('');
    setChatQuery('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('term');
      return next;
    });
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <Page>
      {/* Telegram-style search header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {screenSize === ScreenSize.Mobile && (
          <BackRouteHandler>
            {(onBack) => (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2AABEE',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon src={Icons.ArrowLeft} size="200" />
              </button>
            )}
          </BackRouteHandler>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '20px',
            padding: '6px 14px',
          }}
        >
          <Icon src={Icons.Search} size="200" style={{ opacity: 0.4, flexShrink: 0 }} />
          <input
            ref={inputRef}
            autoFocus
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Поиск"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '15px',
            }}
          />
          {inputValue && (
            <button
              onClick={handleClear}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <Icon src={Icons.Cross} size="50" />
            </button>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#2AABEE',
            fontSize: '14px',
            flexShrink: 0,
            padding: '4px 0',
          }}
        >
          Отмена
        </button>
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {(Object.keys(TAB_LABELS) as SearchTab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #2AABEE' : '2px solid transparent',
              cursor: 'pointer',
              color: tab === t ? '#2AABEE' : 'rgba(255,255,255,0.45)',
              fontSize: '13px',
              fontWeight: tab === t ? 600 : 400,
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Chats tab */}
      {tab === 'chats' && (
        <Scroll hideTrack visibility="Hover">
          <div style={{ paddingTop: '4px' }}>
            <ChatSearchResults query={chatQuery} onRoomClick={(id) => navigateRoom(id)} />
          </div>
        </Scroll>
      )}

      {/* Messages tab */}
      {tab === 'messages' && (
        <Box style={{ position: 'relative', overflow: 'hidden' }} grow="Yes">
          <Scroll ref={msgScrollRef} hideTrack visibility="Hover">
            <PageContent>
              <PageContentCenter>
                <MessageSearch
                  defaultRoomsFilterName="Home"
                  allowGlobal
                  rooms={rooms}
                  scrollRef={msgScrollRef}
                  hideSearchInput
                />
              </PageContentCenter>
            </PageContent>
          </Scroll>
        </Box>
      )}
    </Page>
  );
}
