import React, { ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import { stopPropagation } from '../utils/keyboard';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';

type Modal500Props = {
  requestClose: () => void;
  children: ReactNode;
};
export function Modal500({ requestClose, children }: Modal500Props) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  if (isMobile) {
    return (
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          clickOutsideDeactivates: false,
          onDeactivate: requestClose,
          escapeDeactivates: stopPropagation,
        }}
      >
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: '#17212b',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInFromRight 220ms cubic-bezier(0.25,0.46,0.45,0.94) both',
          }}
        >
          {children}
        </div>
      </FocusTrap>
    );
  }

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal size="500" variant="Background">
            {children}
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
