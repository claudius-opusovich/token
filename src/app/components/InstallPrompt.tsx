import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, Icon, Icons, config } from 'folds';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const DISMISS_KEY = 'token_install_dismissed';

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isInStandaloneMode() || dismissed) return;

    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  if (dismissed || isInStandaloneMode()) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height, 0px) + var(--safe-area-bottom, 0px) + 12px)',
        left: 12,
        right: 12,
        zIndex: 100,
        background: 'var(--bg-surface, #17212b)',
        border: '1px solid var(--tg-surface-overlay)',
        borderRadius: 14,
        padding: `${config.space.S300} ${config.space.S400}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      direction="Column"
      gap="200"
    >
      <Box justifyContent="SpaceBetween" alignItems="Center">
        <Text size="H6" style={{ fontWeight: 600 }}>
          {t('install.title')}
        </Text>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('common.close')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--tg-icon-muted)',
            padding: 4,
          }}
        >
          <Icon size="200" src={Icons.Cross} />
        </button>
      </Box>

      {showIOSHint ? (
        <Text size="T300" style={{ color: 'var(--tg-text-secondary)', lineHeight: 1.5 }}>
          {t('install.iosHint')}
        </Text>
      ) : (
        <Box gap="200">
          <button
            type="button"
            onClick={handleInstall}
            style={{
              flex: 1,
              background: 'var(--tg-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('install.button')}
          </button>
        </Box>
      )}
    </Box>
  );
}
