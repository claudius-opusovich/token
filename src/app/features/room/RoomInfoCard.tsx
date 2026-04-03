import React, { useState } from 'react';
import {
  Avatar,
  Icon,
  Icons,
  Text,
  Spinner,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { useIsDirectRoom } from '../../hooks/useRoom';
import { mxcUrlToHttp, guessDmRoomUserId, getCanonicalAliasOrRoomId, isRoomAlias } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useUserPresence, Presence } from '../../hooks/useUserPresence';
import { copyToClipboard } from '../../utils/dom';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getViaServers } from '../../plugins/via-servers';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
  getRoomNotificationMode,
  RoomNotificationMode,
  useSetRoomNotificationPreference,
  useRoomsNotificationPreferencesContext,
} from '../../hooks/useRoomsNotificationPreferences';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { AsyncStatus } from '../../hooks/useAsyncCallback';

// ─── Action Button ───────────────────────────────────────────────
type ActionBtnProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  loading?: boolean;
};

function ActionBtn({ icon, label, onClick, danger, active, loading }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: '1 1 0',
        minWidth: 0,
        background: 'rgba(255,255,255,0.07)',
        border: 'none',
        borderRadius: 12,
        padding: '14px 6px 12px',
        cursor: 'pointer',
        color: danger ? '#ff6b6b' : active ? '#64b5f6' : 'rgba(255,255,255,0.9)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, display: 'flex' }}>
        {loading ? <Spinner size="300" variant="Secondary" /> : icon}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
        {label}
      </span>
    </button>
  );
}

// ─── Media Row Item ───────────────────────────────────────────────
function MediaRow({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
      <span style={{ color: '#5288c1', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <Text size="T300" style={{ flexGrow: 1, color: 'rgba(255,255,255,0.85)' }}>{label}</Text>
      <Text size="T300" priority="300">{count}</Text>
      <Icon size="100" src={Icons.ChevronRight} style={{ opacity: 0.4 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
type RoomInfoCardProps = {
  room: Room;
  onClose: () => void;
};

export function RoomInfoCard({ room, onClose }: RoomInfoCardProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const direct = useIsDirectRoom();
  const space = useSpaceOptionally();
  const openSettings = useOpenRoomSettings();

  const avatarMxc = useRoomAvatar(room, direct);
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const memberCount = room.getJoinedMemberCount();

  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 300, 300, 'crop') ?? undefined
    : undefined;

  const dmUserId = direct ? guessDmRoomUserId(room, mx.getSafeUserId()) : undefined;
  const dmPresence = useUserPresence(dmUserId ?? '');
  const isOnline = dmPresence?.presence === Presence.Online || dmPresence?.active === true;

  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const notificationMode = getRoomNotificationMode(notificationPreferences, room.roomId);
  const { modeState, setMode } = useSetRoomNotificationPreference(room.roomId);
  const isMuted = notificationMode === RoomNotificationMode.Mute;
  const isMuteLoading = modeState.status === AsyncStatus.Loading;

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', mx.getSafeUserId());

  const [showLeave, setShowLeave] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const onlineCount = !direct && memberCount <= 300
    ? room.getJoinedMembers().filter((m) => {
        const u = m.user;
        return u && (u.presence === 'online' || (u as any).currentlyActive === true);
      }).length
    : 0;

  const handleMuteToggle = () => {
    if (isMuted) setMode(RoomNotificationMode.Unset, notificationMode);
    else setMode(RoomNotificationMode.Mute, notificationMode);
  };

  const handleCopyLink = () => {
    const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
    const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
    copyToClipboard(getMatrixToRoom(roomIdOrAlias, viaServers));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettings = () => {
    openSettings(room.roomId, space?.roomId);
    onClose();
  };

  // Timeline media counts
  const timeline = room.getLiveTimeline().getEvents();
  const photoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.image').length;
  const videoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.video').length;
  const fileCount = timeline.filter(e => e.getContent()?.msgtype === 'm.file').length;
  const audioCount = timeline.filter(e => e.getContent()?.msgtype === 'm.audio' && !e.getContent()?.['org.matrix.msc3245.voice']).length;
  const voiceCount = timeline.filter(e => e.getContent()?.msgtype === 'm.audio' && e.getContent()?.['org.matrix.msc3245.voice']).length;

  const presenceText = (() => {
    if (direct && dmPresence) return isOnline ? 'в сети' : 'не в сети';
    const base = `${memberCount} участников`;
    return onlineCount > 0 ? `${base}, ${onlineCount} онлайн` : base;
  })();

  const roomLink = (() => {
    const alias = getCanonicalAliasOrRoomId(mx, room.roomId);
    return `https://matrix.to/#/${encodeURIComponent(alias)}`;
  })();

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '90vh',
          background: '#1c2733',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          margin: '0 16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Hero header with gradient + avatar ── */}
        <div style={{
          background: 'linear-gradient(180deg, #2b5278 0%, #1c2733 100%)',
          padding: '16px 16px 20px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* Close button */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              <Icon size="200" src={Icons.Cross} />
            </button>
          </div>

          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <Avatar size="700" radii="Pill">
              <RoomAvatar
                roomId={room.roomId}
                src={avatarUrl}
                alt={name}
                renderFallback={() => (
                  <RoomIcon size="400" joinRule={room.getJoinRule()} roomType={room.getType()} />
                )}
              />
            </Avatar>
            {direct && isOnline && (
              <span style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 16, height: 16, borderRadius: '50%',
                background: '#3fc26d', border: '3px solid #2b5278',
              }} />
            )}
          </div>

          {/* Name + status */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{presenceText}</div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, padding: '14px 12px' }}>
            <ActionBtn
              icon={<Icon size="300" src={isMuted ? Icons.Bell : Icons.BellCross} />}
              label={isMuted ? 'Включить' : 'Выключить'}
              onClick={handleMuteToggle}
              active={isMuted}
              loading={isMuteLoading}
            />
            {canInvite && (
              <ActionBtn
                icon={<Icon size="300" src={Icons.UserPlus} />}
                label="Пригласить"
                onClick={() => setShowInvite(true)}
              />
            )}
            <ActionBtn
              icon={<Icon size="300" src={copied ? Icons.CheckTwice : Icons.Link} />}
              label={copied ? 'Скопировано' : 'Ссылка'}
              onClick={handleCopyLink}
              active={copied}
            />
            <ActionBtn
              icon={<Icon size="300" src={Icons.Setting} />}
              label="Настройки"
              onClick={handleSettings}
            />
            <ActionBtn
              icon={<Icon size="300" src={Icons.ArrowGoLeft} />}
              label="Покинуть"
              onClick={() => setShowLeave(true)}
              danger
            />
          </div>

          {/* Info section */}
          <div style={{ background: 'rgba(0,0,0,0.15)', margin: '0 12px', borderRadius: 12, overflow: 'hidden' }}>
            {topic && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, color: '#5288c1', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Описание
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {topic}
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: '#5288c1', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Ссылка
              </div>
              <div style={{ fontSize: 13, color: '#5288c1', wordBreak: 'break-all' }}>
                {roomLink}
              </div>
            </div>

            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
                ID комнаты
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {room.roomId}
              </div>
            </div>
          </div>

          {/* Media stats */}
          {(photoCount > 0 || videoCount > 0 || fileCount > 0 || audioCount > 0 || voiceCount > 0) && (
            <div style={{ margin: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px 2px' }}>
                <div style={{ fontSize: 11, color: '#5288c1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Медиафайлы
                </div>
              </div>
              <div style={{ padding: '0 14px 8px' }}>
                {photoCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.Photo} />} count={photoCount} label="Фотографии" />}
                {videoCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.VideoCamera} />} count={videoCount} label="Видео" />}
                {fileCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.File} />} count={fileCount} label="Файлы" />}
                {audioCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.Headphone} />} count={audioCount} label="Аудиозаписи" />}
                {voiceCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.Mic} />} count={voiceCount} label="Голосовые" />}
              </div>
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>

      {/* Prompts */}
      {showInvite && <InviteUserPrompt room={room} requestClose={() => setShowInvite(false)} />}
      {showLeave && (
        <LeaveRoomPrompt roomId={room.roomId} onDone={onClose} onCancel={() => setShowLeave(false)} />
      )}
    </div>
  );
}
