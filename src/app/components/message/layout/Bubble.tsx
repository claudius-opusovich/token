import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as, color } from 'folds';
import * as css from './layout.css';

function BubbleLeftArrow() {
  return (
    <svg
      className={css.BubbleLeftArrow}
      width="7"
      height="17"
      viewBox="0 0 7 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 0L0 0L0 17C0.193 14.161 0.876 11.233 2.05 8.218C2.954 5.893 4.496 3.733 6.675 1.738C7.083 1.365 7.11 0.732 6.737 0.325C6.548 0.118 6.28 0 6 0Z"
        fill="var(--tg-bubble-in, currentColor)"
      />
    </svg>
  );
}

function BubbleRightArrow() {
  return (
    <svg
      className={css.BubbleRightArrow}
      width="7"
      height="17"
      viewBox="0 0 7 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 0L7 0L7 17C6.807 14.161 6.124 11.233 4.95 8.218C4.046 5.893 2.504 3.733 0.325 1.738C-0.083 1.365 -0.11 0.732 0.263 0.325C0.452 0.118 0.72 0 1 0Z"
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
