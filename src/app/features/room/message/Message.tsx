import {
  Avatar,
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  RectCords,
  Spinner,
  Text,
  as,
  color,
  config,
} from 'folds';
import React, {
  FormEventHandler,
  MouseEventHandler,
  ReactNode,
  TouchEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { useHover, useFocusWithin } from 'react-aria';
import { MatrixEvent, MatrixEventEvent, Room } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';
import classNames from 'classnames';
import { RoomPinnedEventsEventContent } from 'matrix-js-sdk/lib/types';
import {
  AvatarBase,
  BubbleLayout,
  CompactLayout,
  MessageBase,
  ModernLayout,
  Time,
  Username,
  UsernameBold,
} from '../../../components/message';
import * as layoutCss from '../../../components/message/layout/layout.css';
import {
  canEditEvent,
  getEventEdits,
  getMemberAvatarMxc,
  getMemberDisplayName,
} from '../../../utils/room';
import {
  getCanonicalAliasOrRoomId,
  getMxIdLocalPart,
  isRoomAlias,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { MessageLayout, MessageSpacing } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import * as css from './styles.css';
import { EventReaders } from '../../../components/event-readers';
import { TextViewer } from '../../../components/text-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { EmojiBoard } from '../../../components/emoji-board';
import { ReactionViewer } from '../reaction-viewer';
import { MessageEditor } from './MessageEditor';
import { UserAvatar } from '../../../components/user-avatar';
import { copyToClipboard } from '../../../utils/dom';
import { stopPropagation } from '../../../utils/keyboard';
import { getMatrixToRoomEvent } from '../../../plugins/matrix-to';
import { getViaServers } from '../../../plugins/via-servers';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useRoomPinnedEvents } from '../../../hooks/useRoomPinnedEvents';
import { MemberPowerTag, StateEvent } from '../../../../types/matrix/room';
import { PowerIcon } from '../../../components/power';
import colorMXID from '../../../../util/colorMXID';
import { getPowerTagIconSrc } from '../../../hooks/useMemberPowerTag';
import { useMessageSelection } from '../MessageSelectionContext';

export type ReactionHandler = (keyOrMxc: string, shortcode: string) => void;

type MessageQuickReactionsProps = {
  onReaction: ReactionHandler;
};
export const MessageQuickReactions = as<'div', MessageQuickReactionsProps>(
  ({ onReaction, ...props }, ref) => {
    const mx = useMatrixClient();
    const recentEmojis = useRecentEmoji(mx, 4);

    if (recentEmojis.length === 0) return <span />;
    return (
      <>
        <Box
          style={{ padding: config.space.S200 }}
          alignItems="Center"
          justifyContent="Center"
          gap="200"
          {...props}
          ref={ref}
        >
          {recentEmojis.map((emoji) => (
            <IconButton
              key={emoji.unicode}
              className={css.MessageQuickReaction}
              size="300"
              variant="SurfaceVariant"
              radii="Pill"
              title={emoji.shortcode}
              aria-label={emoji.shortcode}
              onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
            >
              <Text size="T500">{emoji.unicode}</Text>
            </IconButton>
          ))}
        </Box>
        <Line size="300" />
      </>
    );
  }
);

export const MessageAllReactionItem = as<
  'button',
  {
    room: Room;
    relations: Relations;
    onClose?: () => void;
  }
>(({ room, relations, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay
        onContextMenu={(evt: any) => {
          evt.stopPropagation();
        }}
        open={open}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => handleClose(),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <ReactionViewer
                room={room}
                relations={relations}
                requestClose={() => setOpen(false)}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.Smile} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          View Reactions
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageReadReceiptItem = as<
  'button',
  {
    room: Room;
    eventId: string;
    onClose?: () => void;
  }
>(({ room, eventId, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <EventReaders room={room} eventId={eventId} requestClose={handleClose} />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.CheckTwice} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Прочитано
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageSourceCodeItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const getContent = (evt: MatrixEvent) =>
    evt.isEncrypted()
      ? {
          [`<== DECRYPTED_EVENT ==>`]: evt.getEffectiveEvent(),
          [`<== ORIGINAL_EVENT ==>`]: evt.event,
        }
      : evt.event;

  const getText = (): string => {
    const evtId = mEvent.getId()!;
    const evtTimeline = room.getTimelineForEvent(evtId);
    const edits =
      evtTimeline &&
      getEventEdits(evtTimeline.getTimelineSet(), evtId, mEvent.getType())?.getRelations();

    if (!edits) return JSON.stringify(getContent(mEvent), null, 2);

    const content: Record<string, unknown> = {
      '<== MAIN_EVENT ==>': getContent(mEvent),
    };

    edits.forEach((editEvt, index) => {
      content[`<== REPLACEMENT_EVENT_${index + 1} ==>`] = getContent(editEvt);
    });

    return JSON.stringify(content, null, 2);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="500">
              <TextViewer
                name="Source Code"
                langName="json"
                text={getText()}
                requestClose={handleClose}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.BlockCode} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          View Source
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageCopyLinkItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();

  const handleCopy = () => {
    const eventId = mEvent.getId();
    if (!eventId) return;
    copyToClipboard(getMatrixToRoomEvent(room.roomId, eventId, getViaServers(room)));
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Link} />}
      radii="300"
      onClick={handleCopy}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        Копировать ссылку
      </Text>
    </MenuItem>
  );
});

export const MessagePinItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const pinnedEvents = useRoomPinnedEvents(room);
  const isPinned = pinnedEvents.includes(mEvent.getId() ?? '');

  const handlePin = () => {
    const eventId = mEvent.getId();
    const pinContent: RoomPinnedEventsEventContent = {
      pinned: Array.from(pinnedEvents).filter((id) => id !== eventId),
    };
    if (!isPinned && eventId) {
      pinContent.pinned.push(eventId);
    }
    mx.sendStateEvent(room.roomId, StateEvent.RoomPinnedEvents as any, pinContent);
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Pin} />}
      radii="300"
      onClick={handlePin}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        {isPinned ? 'Открепить' : 'Закрепить'}
      </Text>
    </MenuItem>
  );
});

export const MessageDeleteItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const [open, setOpen] = useState(false);

  const [deleteState, deleteMessage] = useAsyncCallback(
    useCallback(
      (eventId: string, reason?: string) =>
        mx.redactEvent(room.roomId, eventId, undefined, reason ? { reason } : undefined),
      [mx, room]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const eventId = mEvent.getId();
    if (
      !eventId ||
      deleteState.status === AsyncStatus.Loading ||
      deleteState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    deleteMessage(eventId, reason);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Удалить сообщение</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  Это действие необратимо! Вы уверены, что хотите удалить это сообщение?
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">
                    Причина{' '}
                    <Text as="span" size="T200">
                      (необязательно)
                    </Text>
                  </Text>
                  <Input name="reasonInput" variant="Background" />
                  {deleteState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      Не удалось удалить сообщение. Попробуйте ещё раз.
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    deleteState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={deleteState.status === AsyncStatus.Loading}
                >
                  <Text size="B400">
                    {deleteState.status === AsyncStatus.Loading ? 'Удаление...' : 'Удалить'}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.Delete} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Удалить
        </Text>
      </Button>
    </>
  );
});

export const MessageForwardItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    onClose?.();
  };

  const joinedRooms = mx.getRooms().filter((r) => {
    if (r.roomId === room.roomId) return false;
    const name = (r.name ?? '').toLowerCase();
    return query.trim() === '' || name.includes(query.toLowerCase());
  }).slice(0, 20);

  const handleForward = useCallback(
    async (targetRoomId: string) => {
      setSendingTo(targetRoomId);
      try {
        const content = { ...mEvent.getContent() };
        await mx.sendMessage(targetRoomId, content);
      } catch {
        // ignore
      } finally {
        setSendingTo(null);
        handleClose();
      }
    },
    [mEvent, mx]
  );

  return (
    <>
      <Overlay
        onContextMenu={(evt: any) => evt.stopPropagation()}
        open={open}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog
              style={{
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                width: '320px',
              }}
            >
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  flexShrink: 0,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Переслать в...</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                style={{ padding: `${config.space.S200} ${config.space.S300}`, flexShrink: 0 }}
              >
                <Input
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  placeholder="Поиск чата..."
                  variant="Background"
                  style={{ width: '100%' }}
                />
              </Box>
              <Box
                direction="Column"
                style={{ overflowY: 'auto', flex: 1, padding: `0 ${config.space.S100}` }}
              >
                {joinedRooms.length === 0 && (
                  <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                    <Text size="T300" priority="300">Чаты не найдены</Text>
                  </Box>
                )}
                {joinedRooms.map((r) => (
                  <MenuItem
                    key={r.roomId}
                    size="300"
                    radii="300"
                    before={
                      sendingTo === r.roomId ? (
                        <Spinner size="200" />
                      ) : (
                        <Icon size="100" src={Icons.Hash} />
                      )
                    }
                    onClick={() => handleForward(r.roomId)}
                    aria-disabled={sendingTo !== null}
                  >
                    <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                      {r.name ?? r.roomId}
                    </Text>
                  </MenuItem>
                ))}
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Secondary"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.ArrowGoRight} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Переслать
        </Text>
      </Button>
    </>
  );
});

export const MessageReportItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const [open, setOpen] = useState(false);

  const [reportState, reportMessage] = useAsyncCallback(
    useCallback(
      (eventId: string, score: number, reason: string) =>
        mx.reportEvent(room.roomId, eventId, score, reason),
      [mx, room]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const eventId = mEvent.getId();
    if (
      !eventId ||
      reportState.status === AsyncStatus.Loading ||
      reportState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    if (reasonInput) reasonInput.value = '';
    reportMessage(eventId, reason ? -100 : -50, reason || 'No reason provided');
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Пожаловаться</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  Пожаловаться на сообщение модераторам сервера.
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">Причина</Text>
                  <Input name="reasonInput" variant="Background" required />
                  {reportState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      Не удалось отправить жалобу. Попробуйте ещё раз.
                    </Text>
                  )}
                  {reportState.status === AsyncStatus.Success && (
                    <Text style={{ color: color.Success.Main }} size="T300">
                      Жалоба отправлена.
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    reportState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={
                    reportState.status === AsyncStatus.Loading ||
                    reportState.status === AsyncStatus.Success
                  }
                >
                  <Text size="B400">
                    {reportState.status === AsyncStatus.Loading ? 'Отправка...' : 'Отправить'}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.Warning} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Пожаловаться
        </Text>
      </Button>
    </>
  );
});

export type MessageProps = {
  room: Room;
  mEvent: MatrixEvent;
  collapse: boolean;
  highlight: boolean;
  edit?: boolean;
  canDelete?: boolean;
  canSendReaction?: boolean;
  canPinEvent?: boolean;
  imagePackRooms?: Room[];
  relations?: Relations;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  onReplyClick: (
    ev: Parameters<MouseEventHandler<HTMLButtonElement>>[0],
    startThread?: boolean
  ) => void;
  onEditId?: (eventId?: string) => void;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  reply?: ReactNode;
  reactions?: ReactNode;
  hideReadReceipts?: boolean;
  readByOther?: boolean;
  isLastInGroup?: boolean;
  jumboEmoji?: boolean;
  isSticker?: boolean;
  showDeveloperTools?: boolean;
  memberPowerTag?: MemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
};
export const Message = as<'div', MessageProps>(
  (
    {
      className,
      room,
      mEvent,
      collapse,
      highlight,
      edit,
      canDelete,
      canSendReaction,
      canPinEvent,
      imagePackRooms,
      relations,
      messageLayout,
      messageSpacing,
      onUserClick,
      onUsernameClick,
      onReplyClick,
      onReactionToggle,
      onEditId,
      reply,
      reactions,
      hideReadReceipts,
      readByOther,
      isLastInGroup,
      jumboEmoji,
      isSticker,
      showDeveloperTools,
      memberPowerTag,
      accessibleTagColors,
      legacyUsernameColor,
      hour24Clock,
      dateFormatString,
      children,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const selection = useMessageSelection();
    const evtId = mEvent.getId() ?? '';
    const isSelected = selection.selected.has(evtId);
    const senderId = mEvent.getSender() ?? '';
    const isOutgoing = senderId === mx.getUserId();

    // Track send status reactively for pending clock indicator
    const [sendStatus, setSendStatus] = useState(() => mEvent.status);
    useEffect(() => {
      const handleStatus = () => setSendStatus(mEvent.status);
      mEvent.on(MatrixEventEvent.Status, handleStatus);
      return () => { mEvent.off(MatrixEventEvent.Status, handleStatus); };
    }, [mEvent]);
    const isPending = isOutgoing && sendStatus !== null;

    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const [emojiBoardAnchor, setEmojiBoardAnchor] = useState<RectCords>();

    const senderDisplayName =
      getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
    const senderAvatarMxc = getMemberAvatarMxc(room, senderId);

    const tagColor = memberPowerTag?.color
      ? accessibleTagColors?.get(memberPowerTag.color)
      : undefined;
    const tagIconSrc = memberPowerTag?.icon
      ? getPowerTagIconSrc(mx, useAuthentication, memberPowerTag.icon)
      : undefined;

    // legacyUsernameColor: always use MXID hash color
    // otherwise: use power-tag color, falling back to MXID hash color so all users have color
    const usernameColor = legacyUsernameColor ? colorMXID(senderId) : (tagColor ?? colorMXID(senderId));

    const headerJSX = !collapse && (
      <Box
        gap="300"
        direction={messageLayout === MessageLayout.Compact ? 'RowReverse' : 'Row'}
        justifyContent="SpaceBetween"
        alignItems="Baseline"
        grow="Yes"
      >
        <Box alignItems="Center" gap="200">
          <Username
            as="button"
            style={{ color: usernameColor }}
            data-user-id={senderId}
            onContextMenu={onUserClick}
            onClick={onUsernameClick}
          >
            <Text
              as="span"
              size={messageLayout === MessageLayout.Bubble ? 'T300' : 'T400'}
              truncate
            >
              <UsernameBold>{senderDisplayName}</UsernameBold>
            </Text>
          </Username>
          {tagIconSrc && <PowerIcon size="100" iconSrc={tagIconSrc} />}
        </Box>
        {messageLayout !== MessageLayout.Bubble && (
          <Box shrink="No" gap="100">
            {messageLayout === MessageLayout.Modern && hover && (
              <>
                <Text as="span" size="T200" priority="300">
                  {senderId}
                </Text>
                <Text as="span" size="T200" priority="300">
                  |
                </Text>
              </>
            )}
            <Time
              ts={mEvent.getTs()}
              compact={messageLayout === MessageLayout.Compact}
              hour24Clock={hour24Clock}
              dateFormatString={dateFormatString}
            />
            {isOutgoing && readByOther !== undefined && (
              <Text
                as="span"
                size="T200"
                style={{ color: readByOther ? '#4fc3f7' : 'currentColor', opacity: readByOther ? 1 : 0.5 }}
              >
                {readByOther ? '✓✓' : '✓'}
              </Text>
            )}
          </Box>
        )}
      </Box>
    );

    const bubbleTimestampJSX = messageLayout === MessageLayout.Bubble ? (
      <span className={layoutCss.BubbleTimestamp}>
        <Time
          ts={mEvent.getTs()}
          hour24Clock={hour24Clock}
          dateFormatString={dateFormatString}
        />
        {isOutgoing && (
          <Text
            as="span"
            size="T200"
            style={{
              marginLeft: '3px',
              opacity: isPending ? 0.5 : (readByOther ? 1 : 0.6),
              color: !isPending && readByOther ? '#4fc3f7' : 'currentColor',
            }}
          >
            {isPending ? '⏳' : (readByOther !== undefined ? (readByOther ? '✓✓' : '✓') : '✓')}
          </Text>
        )}
      </span>
    ) : null;

    const avatarJSX = !collapse && messageLayout !== MessageLayout.Compact && (
      <AvatarBase
        className={messageLayout === MessageLayout.Bubble ? css.BubbleAvatarBase : undefined}
      >
        <Avatar
          className={css.MessageAvatar}
          as="button"
          size="300"
          data-user-id={senderId}
          onClick={onUserClick}
        >
          <UserAvatar
            userId={senderId}
            src={
              senderAvatarMxc
                ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 48, 48, 'crop') ?? undefined
                : undefined
            }
            alt={senderDisplayName}
            renderFallback={() => <Icon size="200" src={Icons.User} filled />}
          />
        </Avatar>
      </AvatarBase>
    );

    const msgContentJSX = (
      <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
        {reply}
        {edit && onEditId ? (
          <MessageEditor
            style={{
              maxWidth: '100%',
              width: '100vw',
            }}
            roomId={room.roomId}
            room={room}
            mEvent={mEvent}
            imagePackRooms={imagePackRooms}
            onCancel={() => onEditId()}
          />
        ) : (
          <>
            {isPending ? (
              <div style={{ position: 'relative' }}>
                {children}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.28)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                  }}
                >
                  <Spinner variant="Secondary" size="600" />
                </div>
              </div>
            ) : (
              children
            )}
            {bubbleTimestampJSX}
          </>
        )}
        {reactions}
      </Box>
    );

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (selection.active) {
        evt.preventDefault();
        selection.toggle(evtId);
        return;
      }
      if (evt.altKey || !window.getSelection()?.isCollapsed || edit) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    const handleOpenEmojiBoard: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setEmojiBoardAnchor(target.getBoundingClientRect());
    };
    const handleAddReactions: MouseEventHandler<HTMLButtonElement> = () => {
      const rect = menuAnchor;
      closeMenu();
      // open it with timeout because closeMenu
      // FocusTrap will return focus from emojiBoard

      setTimeout(() => {
        setEmojiBoardAnchor(rect);
      }, 100);
    };

    const isThreadedMessage = mEvent.threadRootId !== undefined;

    // Swipe-to-reply + Long-press context menu (mobile touch)
    const swipeStartX = useRef(0);
    const swipeStartY = useRef(0);
    const swipeLocked = useRef<'none' | 'h' | 'v'>('none');
    const [swipeDx, setSwipeDx] = useState(0);
    const [swipeReleasing, setSwipeReleasing] = useState(false);
    const swipeReplyBtnRef = useRef<HTMLButtonElement>(null);
    const SWIPE_THRESHOLD = 64;
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart: TouchEventHandler<HTMLDivElement> = useCallback((e) => {
      swipeStartX.current = e.touches[0].clientX;
      swipeStartY.current = e.touches[0].clientY;
      swipeLocked.current = 'none';
      setSwipeReleasing(false);

      // Long-press: enter selection mode (or toggle if already active) after 500ms
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        if (selection.active) {
          selection.toggle(evtId);
        } else {
          selection.enter(evtId);
        }
      }, 500);
    }, []);

    const handleTouchMove: TouchEventHandler<HTMLDivElement> = useCallback((e) => {
      const dx = e.touches[0].clientX - swipeStartX.current;
      const dy = e.touches[0].clientY - swipeStartY.current;
      // Cancel long-press if finger moved more than 8px
      if (longPressTimer.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (messageLayout !== MessageLayout.Bubble) return;
      if (swipeLocked.current === 'none') {
        if (Math.abs(dy) > Math.abs(dx)) { swipeLocked.current = 'v'; return; }
        if (Math.abs(dx) > 6) swipeLocked.current = 'h';
      }
      if (swipeLocked.current !== 'h') return;
      if (dx > 0) {
        const capped = dx < SWIPE_THRESHOLD ? dx : SWIPE_THRESHOLD + (dx - SWIPE_THRESHOLD) * 0.25;
        setSwipeDx(Math.min(capped, SWIPE_THRESHOLD * 1.4));
      }
    }, [messageLayout]);

    const handleTouchEnd: TouchEventHandler<HTMLDivElement> = useCallback((e) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (swipeLocked.current !== 'h') { setSwipeDx(0); return; }
      const dx = e.changedTouches[0].clientX - swipeStartX.current;
      setSwipeReleasing(true);
      setSwipeDx(0);
      if (dx >= SWIPE_THRESHOLD) {
        swipeReplyBtnRef.current?.click();
      }
      setTimeout(() => setSwipeReleasing(false), 200);
    }, []);

    return (
      <MessageBase
        className={classNames(css.MessageBase, className, {
          [css.MessageBaseBubbleCollapsed]: messageLayout === MessageLayout.Bubble && collapse,
        })}
        tabIndex={0}
        space={messageSpacing}
        collapse={collapse}
        highlight={highlight}
        selected={isSelected || !!menuAnchor || !!emojiBoardAnchor}
        style={{ position: 'relative' }}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
        onClick={selection.active ? () => selection.toggle(evtId) : undefined}
      >
        {selection.active && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.35)',
              background: isSelected ? '#5288c1' : 'rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              pointerEvents: 'none',
              flexShrink: 0,
              transition: 'background 150ms, border 150ms',
            }}
          >
            {isSelected && (
              <span style={{ color: 'white', fontSize: '11px', lineHeight: '1' }}>✓</span>
            )}
          </div>
        )}
        {!edit && (hover || !!menuAnchor || !!emojiBoardAnchor) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                {canSendReaction && (
                  <PopOut
                    position="Bottom"
                    align={emojiBoardAnchor?.width === 0 ? 'Start' : 'End'}
                    offset={emojiBoardAnchor?.width === 0 ? 0 : undefined}
                    anchor={emojiBoardAnchor}
                    content={
                      <EmojiBoard
                        imagePackRooms={imagePackRooms ?? []}
                        returnFocusOnDeactivate={false}
                        allowTextCustomEmoji
                        onEmojiSelect={(key) => {
                          onReactionToggle(mEvent.getId()!, key);
                          setEmojiBoardAnchor(undefined);
                        }}
                        onCustomEmojiSelect={(mxc, shortcode) => {
                          onReactionToggle(mEvent.getId()!, mxc, shortcode);
                          setEmojiBoardAnchor(undefined);
                        }}
                        requestClose={() => {
                          setEmojiBoardAnchor(undefined);
                        }}
                      />
                    }
                  >
                    <IconButton
                      onClick={handleOpenEmojiBoard}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                      aria-pressed={!!emojiBoardAnchor}
                    >
                      <Icon src={Icons.SmilePlus} size="100" />
                    </IconButton>
                  </PopOut>
                )}
                <IconButton
                  onClick={onReplyClick}
                  data-event-id={mEvent.getId()}
                  variant="SurfaceVariant"
                  size="300"
                  radii="300"
                >
                  <Icon src={Icons.ReplyArrow} size="100" />
                </IconButton>
                {!isThreadedMessage && (
                  <IconButton
                    onClick={(ev) => onReplyClick(ev, true)}
                    data-event-id={mEvent.getId()}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon src={Icons.ThreadPlus} size="100" />
                  </IconButton>
                )}
                {canEditEvent(mx, mEvent) && onEditId && (
                  <IconButton
                    onClick={() => onEditId(mEvent.getId())}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon src={Icons.Pencil} size="100" />
                  </IconButton>
                )}
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu style={{
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        background: 'rgba(30,43,56,0.92)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                        minWidth: '200px',
                      }}>
                        {canSendReaction && (
                          <MessageQuickReactions
                            onReaction={(key, shortcode) => {
                              onReactionToggle(mEvent.getId()!, key, shortcode);
                              closeMenu();
                            }}
                          />
                        )}
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {canSendReaction && (
                            <MenuItem
                              size="300"
                              after={<Icon size="100" src={Icons.SmilePlus} />}
                              radii="300"
                              onClick={handleAddReactions}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                Реакция
                              </Text>
                            </MenuItem>
                          )}
                          {relations && (
                            <MessageAllReactionItem
                              room={room}
                              relations={relations}
                              onClose={closeMenu}
                            />
                          )}
                          <MenuItem
                            size="300"
                            after={<Icon size="100" src={Icons.ReplyArrow} />}
                            radii="300"
                            data-event-id={mEvent.getId()}
                            onClick={(evt: any) => {
                              onReplyClick(evt);
                              closeMenu();
                            }}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              Ответить
                            </Text>
                          </MenuItem>
                          {!isThreadedMessage && (
                            <MenuItem
                              size="300"
                              after={<Icon src={Icons.ThreadPlus} size="100" />}
                              radii="300"
                              data-event-id={mEvent.getId()}
                              onClick={(evt: any) => {
                                onReplyClick(evt, true);
                                closeMenu();
                              }}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                Ответить в треде
                              </Text>
                            </MenuItem>
                          )}
                          <MessageForwardItem
                            room={room}
                            mEvent={mEvent}
                            onClose={closeMenu}
                          />
                          {canEditEvent(mx, mEvent) && onEditId && (
                            <MenuItem
                              size="300"
                              after={<Icon size="100" src={Icons.Pencil} />}
                              radii="300"
                              data-event-id={mEvent.getId()}
                              onClick={() => {
                                onEditId(mEvent.getId());
                                closeMenu();
                              }}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                Редактировать
                              </Text>
                            </MenuItem>
                          )}
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem
                              room={room}
                              eventId={mEvent.getId() ?? ''}
                              onClose={closeMenu}
                            />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem
                              room={room}
                              mEvent={mEvent}
                              onClose={closeMenu}
                            />
                          )}
                          <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                          {canPinEvent && (
                            <MessagePinItem room={room} mEvent={mEvent} onClose={closeMenu} />
                          )}
                        </Box>
                        {((!mEvent.isRedacted() && canDelete) ||
                          mEvent.getSender() !== mx.getUserId()) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!mEvent.isRedacted() && canDelete && (
                                <MessageDeleteItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                              {mEvent.getSender() !== mx.getUserId() && (
                                <MessageReportItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={handleOpenMenu}
                    aria-pressed={!!menuAnchor}
                  >
                    <Icon src={Icons.VerticalDots} size="100" />
                  </IconButton>
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        {messageLayout === MessageLayout.Compact && (
          <CompactLayout before={headerJSX} onContextMenu={handleContextMenu}>
            {msgContentJSX}
          </CompactLayout>
        )}
        {messageLayout === MessageLayout.Bubble && (
          <div
            style={{
              position: 'relative',
              transform: `translateX(${swipeDx}px)`,
              transition: swipeReleasing || swipeDx === 0 ? 'transform 200ms ease' : undefined,
              touchAction: 'pan-y',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {swipeDx > 8 && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: isOutgoing ? undefined : `${-28 + swipeDx * 0.4}px`,
                  right: isOutgoing ? `${-28 + swipeDx * 0.4}px` : undefined,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: Math.min(swipeDx / SWIPE_THRESHOLD, 1),
                  fontSize: '18px',
                  pointerEvents: 'none',
                  transition: swipeDx === 0 ? 'opacity 150ms' : undefined,
                }}
              >
                ↩
              </span>
            )}
            {/* Hidden reply trigger button for swipe gesture */}
            <button
              ref={swipeReplyBtnRef}
              data-event-id={mEvent.getId()}
              onClick={onReplyClick}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
            <BubbleLayout
              before={avatarJSX}
              header={headerJSX}
              outgoing={isOutgoing}
              showTail={(jumboEmoji || isSticker) ? false : (isLastInGroup ?? !collapse)}
              hideBubble={jumboEmoji || isSticker}
              onContextMenu={handleContextMenu}
            >
              {msgContentJSX}
            </BubbleLayout>
          </div>
        )}
        {messageLayout !== MessageLayout.Compact && messageLayout !== MessageLayout.Bubble && (
          <ModernLayout before={avatarJSX} onContextMenu={handleContextMenu}>
            {headerJSX}
            {msgContentJSX}
          </ModernLayout>
        )}
      </MessageBase>
    );
  }
);

export type EventProps = {
  room: Room;
  mEvent: MatrixEvent;
  highlight: boolean;
  canDelete?: boolean;
  messageSpacing: MessageSpacing;
  hideReadReceipts?: boolean;
  showDeveloperTools?: boolean;
};
export const Event = as<'div', EventProps>(
  (
    {
      className,
      room,
      mEvent,
      highlight,
      canDelete,
      messageSpacing,
      hideReadReceipts,
      showDeveloperTools,
      children,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const stateEvent = typeof mEvent.getStateKey() === 'string';

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (evt.altKey || !window.getSelection()?.isCollapsed) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    return (
      <MessageBase
        className={classNames(css.MessageBase, className)}
        tabIndex={0}
        space={messageSpacing}
        autoCollapse
        highlight={highlight}
        selected={!!menuAnchor}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
      >
        {(hover || !!menuAnchor) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu {...props} ref={ref} style={{
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        background: 'rgba(30,43,56,0.92)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                        minWidth: '200px',
                      }}>
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem
                              room={room}
                              eventId={mEvent.getId() ?? ''}
                              onClose={closeMenu}
                            />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem
                              room={room}
                              mEvent={mEvent}
                              onClose={closeMenu}
                            />
                          )}
                          <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                        </Box>
                        {((!mEvent.isRedacted() && canDelete && !stateEvent) ||
                          (mEvent.getSender() !== mx.getUserId() && !stateEvent)) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!mEvent.isRedacted() && canDelete && (
                                <MessageDeleteItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                              {mEvent.getSender() !== mx.getUserId() && (
                                <MessageReportItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={handleOpenMenu}
                    aria-pressed={!!menuAnchor}
                  >
                    <Icon src={Icons.VerticalDots} size="100" />
                  </IconButton>
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        <div onContextMenu={handleContextMenu}>{children}</div>
      </MessageBase>
    );
  }
);
