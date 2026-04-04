import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Icon, IconButton, Icons, Text } from 'folds';
import { secondsToMinutesAndSeconds } from '../../utils/common';

const BAR_COUNT = 32;

type VoiceRecordingUIProps = {
  duration: number; // seconds
  analyser: AnalyserNode | null;
  onSend: () => void;
  onCancel: () => void;
};

export function VoiceRecordingUI({ duration, analyser, onSend, onCancel }: VoiceRecordingUIProps) {
  const [bars, setBars] = useState<number[]>(() => new Array(BAR_COUNT).fill(0.15));
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe-to-cancel state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  // Animate waveform from analyser
  useEffect(() => {
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / BAR_COUNT);
      const newBars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = dataArray[i * step] / 255;
        newBars.push(0.1 + val * 0.9);
      }
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyser]);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    if (dx < 0) setSwipeOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset < -80) {
      setCancelled(true);
      onCancel();
    }
    touchStartRef.current = null;
    setSwipeOffset(0);
  }, [swipeOffset, onCancel]);

  if (cancelled) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        minWidth: 0,
        transform: swipeOffset < 0 ? `translateX(${swipeOffset}px)` : undefined,
        transition: swipeOffset === 0 ? 'transform 200ms ease' : undefined,
        opacity: swipeOffset < -60 ? 0.4 : 1,
      }}
    >
      {/* Cancel button */}
      <IconButton
        onClick={onCancel}
        variant="SurfaceVariant"
        size="300"
        radii="Pill"
        aria-label="Отмена"
      >
        <Icon src={Icons.Cross} size="100" />
      </IconButton>

      {/* Recording indicator + timer */}
      <Box alignItems="Center" gap="200" style={{ flexShrink: 0 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#e53935',
            animation: 'voicePulse 1s ease-in-out infinite',
          }}
        />
        <Text size="B400" style={{ fontVariantNumeric: 'tabular-nums', minWidth: '36px' }}>
          {secondsToMinutesAndSeconds(duration)}
        </Text>
      </Box>

      {/* Live waveform */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          height: 32,
          gap: '1.5px',
          overflow: 'hidden',
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(3, h * 32)}px`,
              borderRadius: '1.5px',
              backgroundColor: 'var(--tg-accent, #2AABEE)',
              opacity: 0.7,
              transition: 'height 80ms ease',
            }}
          />
        ))}
      </div>

      {/* Swipe hint (shows on mobile) */}
      <Text
        size="T200"
        style={{
          opacity: 0.4,
          fontSize: '11px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        ← отмена
      </Text>

      {/* Send button */}
      <IconButton
        onClick={onSend}
        variant="Primary"
        fill="Solid"
        size="400"
        radii="Pill"
        style={{
          flexShrink: 0,
          backgroundColor: 'var(--tg-accent, #2AABEE)',
          color: '#fff',
        }}
        aria-label="Отправить"
      >
        <Icon src={Icons.Send} />
      </IconButton>

      <style>{`
        @keyframes voicePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
