import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as, color } from 'folds';
import * as css from './layout.css';

function BubbleLeftArrow() {
  return (
    <svg
      className={css.BubbleLeftArrow}
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00004 8V0H4.82847C3.04666 0 2.15433 2.15428 3.41426 3.41421L8.00004 8H9.00004Z"
        fill="var(--tg-bubble-in, currentColor)"
      />
    </svg>
  );
}

function BubbleRightArrow() {
  return (
    <svg
      className={css.BubbleRightArrow}
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 8V0H4.17157C5.95338 0 6.84571 2.15428 5.58579 3.41421L1 8H0Z"
        fill="var(--tg-bubble-out, currentColor)"
      />
    </svg>
  );
}

type BubbleLayoutProps = {
  hideBubble?: boolean;
  outgoing?: boolean;
  before?: ReactNode;
  header?: ReactNode;
  showTail?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(
  ({ hideBubble, outgoing, before, header, showTail, children, ...props }, ref) => {
    const hasTail = showTail !== undefined ? showTail : !!before;
    return (
      <Box
        gap="300"
        className={outgoing ? css.BubbleOutgoingRow : undefined}
        {...props}
        ref={ref}
      >
        {!outgoing && (
          <Box className={css.BubbleBefore} shrink="No">
            {before}
          </Box>
        )}
        <Box direction="Column" style={{ maxWidth: '100%' }}>
          {!outgoing && header}
          {hideBubble ? (
            children
          ) : (
            <Box justifyContent={outgoing ? 'End' : 'Start'}>
              <Box
                className={classNames(
                  css.BubbleContent,
                  outgoing && css.BubbleContentOutgoing,
                  !outgoing && hasTail && css.BubbleContentArrowLeft,
                  outgoing && hasTail && css.BubbleContentArrowRight
                )}
                direction="Column"
              >
                {!outgoing && hasTail ? <BubbleLeftArrow /> : null}
                {outgoing && hasTail ? <BubbleRightArrow /> : null}
                {children}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  }
);
