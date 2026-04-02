import { useEffect, useState } from 'react';
import { Room, EventType, MsgType, RoomEvent, MatrixClient } from 'matrix-js-sdk';
import { getMemberDisplayName } from '../utils/room';
import { getMxIdLocalPart } from '../utils/matrix';

export type LastMessageInfo = {
  senderName: string;
  preview: string;
  timestamp: number;
  isOutgoing?: boolean;
  isRead?: boolean;
};

function getMessagePreview(msgtype: string | undefined, body: string | undefined): string {
  switch (msgtype) {
    case MsgType.Image:
      return '🖼 Фото';
    case MsgType.Video:
      return '📹 Видео';
    case MsgType.Audio:
      return '🎵 Аудио';
    case MsgType.File:
      return '📎 Файл';
    case MsgType.Location:
      return '📍 Местоположение';
    default:
      return body ? body.replace(/\n/g, ' ').slice(0, 60) : '';
  }
}

function computeLastMessage(room: Room, myUserId: string): LastMessageInfo | undefined {
  const events = room.getLiveTimeline().getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.isRedacted()) continue;
    const type = event.getType();
    const sender = event.getSender();
    if (!sender) continue;

    const isOutgoing = sender === myUserId;

    let preview: string | undefined;
    if (type === EventType.RoomMessage) {
      const content = event.getContent();
      const senderName = getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender;
      preview = getMessagePreview(content.msgtype, content.body);
      if (!preview) continue;

      let isRead = false;
      if (isOutgoing) {
        // check if any other member has read up to or past this event
        const readers = room.getUsersReadUpTo(event);
        isRead = readers.some((uid) => uid !== myUserId);
      }

      return { senderName, preview, timestamp: event.getTs(), isOutgoing, isRead };
    }

    if (type === EventType.Sticker) {
      const senderName = getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender;
      let isRead = false;
      if (isOutgoing) {
        const readers = room.getUsersReadUpTo(event);
        isRead = readers.some((uid) => uid !== myUserId);
      }
      return { senderName, preview: '🗿 Стикер', timestamp: event.getTs(), isOutgoing, isRead };
    }
  }
  return undefined;
}

export function useRoomLastMessage(room: Room, mx: MatrixClient): LastMessageInfo | undefined {
  const myUserId = mx.getUserId() ?? '';
  const [lastMessage, setLastMessage] = useState<LastMessageInfo | undefined>(() =>
    computeLastMessage(room, myUserId)
  );

  useEffect(() => {
    const update = () => setLastMessage(computeLastMessage(room, myUserId));
    room.on(RoomEvent.Timeline, update);
    room.on(RoomEvent.Redaction, update);
    room.on(RoomEvent.Receipt, update);
    return () => {
      room.off(RoomEvent.Timeline, update);
      room.off(RoomEvent.Redaction, update);
      room.off(RoomEvent.Receipt, update);
    };
  }, [room, myUserId]);

  return lastMessage;
}
