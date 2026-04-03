import React, { useState } from 'react';
import { Icon, Icons, Text, Spinner, Avatar } from 'folds';
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

// ── Action button (flat, Telegram-style) ──────────────────────────
function ActionBtn({
  icon, label, onClick, danger, active, loading,
}: {
  icon: React.ReactNode; label: string; onClick: () => void;
  danger?: boolean; active?: boolean; loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '1 1 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,0.06)',
        border: 'none',
        borderRadius: 10,
        padding: '12px 4px 10px',
        cursor: 'pointer',
        color: danger ? '#e57373' : active ? '#64b5f6' : 'rgba(255,255,255,0.85)',
        minWidth: 0,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 22 }}>
        {loading ? <Spinner size="200" variant="Secondary" /> : icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', lineHeight: 1.2 }}>
        {label}
      </span>
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />;
}

// ── Info row (link, description label, etc) ───────────────────────
function InfoRow({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 20px' }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', display: 'flex', paddingTop: 2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', wordBreak: 'break-word', lineHeight: 1.4 }}>{primary}</div>
        {secondary && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{secondary}</div>}
      </div>
    </div>
  );
}

// ── Media row ─────────────────────────────────────────────────────
function MediaRow({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 20px' }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>{count} {label}</span>
      <Icon size="100" src={Icons.ChevronRight} style={{ opacity: 0.3, flexShrink: 0 }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export function RoomInfoCard({ room, onClose }: { room: Room; onClose: () => void }) {
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

  const notifPrefs = useRoomsNotificationPreferencesContext();
  const notifMode = getRoomNotificationMode(notifPrefs, room.roomId);
  const { modeState, setMode } = useSetRoomNotificationPreference(room.roomId);
  const isMuted = notifMode === RoomNotificationMode.Mute;
  const isMuteLoading = modeState.status === AsyncStatus.Loading;

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const perms = useRoomPermissions(creators, powerLevels);
  const canInvite = perms.action('invite', mx.getSafeUserId());

  const [showLeave, setShowLeave] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const onlineCount = !direct && memberCount <= 300
    ? room.getJoinedMembers().filter(m => {
        const u = m.user;
        return u && (u.presence === 'online' || (u as any).currentlyActive === true);
      }).length
    : 0;

  const presenceText = (() => {
    if (direct && dmPresence) return isOnline ? 'в сети' : 'не в сети';
    const n = memberCount.toLocaleString('ru');
    return onlineCount > 0 ? `${n} участников` : `${n} участников`;
  })();

  const onlineText = onlineCount > 0 ? `${onlineCount} онлайн` : undefined;

  const handleMuteToggle = () => {
    if (isMuted) setMode(RoomNotificationMode.Unset, notifMode);
    else setMode(RoomNotificationMode.Mute, notifMode);
  };

  const handleCopyLink = () => {
    const alias = getCanonicalAliasOrRoomId(mx, room.roomId);
    const via = isRoomAlias(alias) ? undefined : getViaServers(room);
    copyToClipboard(getMatrixToRoom(alias, via));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeline = room.getLiveTimeline().getEvents();
  const photoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.image').length;
  const videoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.video').length;
  const fileCount = timeline.filter(e => e.getContent()?.msgtype === 'm.file').length;
  const voiceCount = timeline.filter(e => e.getContent()?.msgtype === 'm.audio').length;

  const roomAlias = getCanonicalAliasOrRoomId(mx, room.roomId);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ width: '100%', maxWidth: 400, maxHeight: '88vh', background: '#17212b', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 12px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
          >
            <Icon size="200" src={Icons.Cross} />
          </button>
        </div>

        {/* Scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 18px', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Avatar size="700" radii="Pill">
                <RoomAvatar
                  roomId={room.roomId}
                  src={avatarUrl}
                  alt={name}
                  renderFallback={() => <RoomIcon size="400" joinRule={room.getJoinRule()} roomType={room.getType()} />}
                />
              </Avatar>
              {direct && isOnline && (
                <span style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: '#3fc26d', border: '2px solid #17212b' }} />
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 600, color: '#fff', lineHeight: 1.25 }}>{name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                {presenceText}{onlineText ? `, ${onlineText}` : ''}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 16px' }}>
            <ActionBtn
              icon={<Icon size="300" src={isMuted ? Icons.Bell : Icons.BellCross} />}
              label={isMuted ? 'Включить' : 'Выключить'}
              onClick={handleMuteToggle}
              active={isMuted}
              loading={isMuteLoading}
            />
            {canInvite && (
              <ActionBtn icon={<Icon size="300" src={Icons.UserPlus} />} label="Пригласить" onClick={() => setShowInvite(true)} />
            )}
            <ActionBtn
              icon={<Icon size="300" src={copied ? Icons.CheckTwice : Icons.ArrowGoRight} />}
              label="Поделиться"
              onClick={handleCopyLink}
              active={copied}
            />
            <ActionBtn icon={<Icon size="300" src={Icons.Setting} />} label="Настройки" onClick={() => { openSettings(room.roomId, space?.roomId); onClose(); }} />
            <ActionBtn icon={<Icon size="300" src={Icons.ArrowGoLeft} />} label="Покинуть" onClick={() => setShowLeave(true)} danger />
          </div>

          <Divider />

          {/* Topic */}
          {topic && (
            <>
              <div style={{ padding: '10px 20px 4px' }}>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{topic}</div>
                <div style={{ fontSize: 13, color: '#2AABEE', marginTop: 4 }}>Описание</div>
              </div>
              <Divider />
            </>
          )}

          {/* Link */}
          <div style={{ padding: '10px 20px 4px' }}>
            <div style={{ fontSize: 15, color: '#2AABEE', wordBreak: 'break-all' }}>{roomAlias}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Ссылка на чат</div>
          </div>

          <Divider />

          {/* Media */}
          {(photoCount > 0 || videoCount > 0 || fileCount > 0 || voiceCount > 0) && (
            <>
              <div style={{ paddingTop: 4 }}>
                {photoCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.Photo} />} count={photoCount} label="фото" />}
                {videoCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.VideoCamera} />} count={videoCount} label="видео" />}
                {fileCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.File} />} count={fileCount} label="файлов" />}
                {voiceCount > 0 && <MediaRow icon={<Icon size="200" src={Icons.Mic} />} count={voiceCount} label="голосовых" />}
              </div>
              <Divider />
            </>
          )}

          {/* Members count */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 16 }}>
            <Icon size="200" src={Icons.User} style={{ opacity: 0.35, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {memberCount.toLocaleString('ru')} участников
            </span>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>

      {showInvite && <InviteUserPrompt room={room} requestClose={() => setShowInvite(false)} />}
      {showLeave && <LeaveRoomPrompt roomId={room.roomId} onDone={onClose} onCancel={() => setShowLeave(false)} />}
    </div>
  );
}
