/* eslint-disable jsx-a11y/media-has-caption */
import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Icon, Icons, Spinner, Text } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
} from '../../../hooks/media';
import { useThrottle } from '../../../hooks/useThrottle';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';

const PLAY_TIME_THROTTLE_OPS = {
  wait: 80,
  immediate: true,
};

const BAR_COUNT = 40;

/** Pseudo-random waveform from a seed string, returns 0..1 floats */
function generateWaveform(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9) >>> 0);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0);
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0);
    // bias towards mid-range heights for natural look
    const raw = (h >>> 0) / 0xffffffff;
    bars.push(0.15 + raw * 0.85);
  }
  return bars;
}

type RenderMediaControlProps = {
  after: ReactNode;
  leftControl: ReactNode;
  rightControl: ReactNode;
  children: ReactNode;
};
export type AudioContentProps = {
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  renderMediaControl: (props: RenderMediaControlProps) => ReactNode;
};
export function AudioContent({
  mimeType,
  url,
  info,
  encInfo,
  renderMediaControl,
}: AudioContentProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [srcState, loadSrc] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
      if (!mediaUrl) throw new Error('Invalid media URL');
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimeType, encInfo))
        : await downloadMedia(mediaUrl);
      return URL.createObjectURL(fileContent);
    }, [mx, url, useAuthentication, mimeType, encInfo])
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const infoDuration = info.duration ?? 0;
  const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);
  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(
    getAudioRef,
    useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPS)
  );

  const handlePlay = () => {
    if (srcState.status === AsyncStatus.Success) {
      setPlaying(!playing);
    } else if (srcState.status !== AsyncStatus.Loading) {
      loadSrc();
    }
  };

  // Generate waveform bars from URL seed (consistent for the same audio)
  const bars = useMemo(() => generateWaveform(url, BAR_COUNT), [url]);

  const handleWaveformClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(fraction * duration);
    },
    [seek, duration]
  );

  const progress = duration > 0 ? currentTime / duration : 0;
  const isLoading = srcState.status === AsyncStatus.Loading || loading;

  // Telegram-style audio player
  const tgPlayer = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 0',
        minWidth: '200px',
        maxWidth: '260px',
      }}
    >
      {/* Circular play button */}
      <button
        onClick={handlePlay}
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--tg-accent, #2AABEE)',
          border: 'none',
          cursor: isLoading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 150ms',
          opacity: isLoading ? 0.6 : 1,
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Spinner variant="Secondary" size="200" />
        ) : (
          <Icon
            src={playing ? Icons.Pause : Icons.Play}
            size="100"
            filled
            style={{ color: '#fff' }}
          />
        )}
      </button>

      {/* Waveform + time */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {/* Waveform bars */}
        <div
          onClick={handleWaveformClick}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            height: '28px',
            gap: '1.5px',
            cursor: 'pointer',
          }}
        >
          {bars.map((h, i) => {
            const barFraction = (i + 0.5) / BAR_COUNT;
            const played = barFraction <= progress;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(3, h * 28)}px`,
                  borderRadius: '1.5px',
                  backgroundColor: played
                    ? 'var(--tg-accent, #2AABEE)'
                    : 'rgba(255,255,255,0.30)',
                  transition: 'background-color 50ms',
                }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <Text
          as="span"
          size="T200"
          style={{ opacity: 0.6, fontSize: '11px', lineHeight: 1, userSelect: 'none' }}
        >
          {secondsToMinutesAndSeconds(playing || currentTime > 0 ? currentTime : duration)}
        </Text>
      </div>
    </div>
  );

  return renderMediaControl({
    after: null,
    leftControl: tgPlayer,
    rightControl: null,
    children: (
      <audio controls={false} autoPlay ref={audioRef}>
        {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
      </audio>
    ),
  }) as JSX.Element;
}
