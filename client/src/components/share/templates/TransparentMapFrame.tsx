import { forwardRef, ReactNode } from 'react';

/** Checkerboard outer + transparent inner capture target for PNG export */
export const TransparentMapFrame = forwardRef<
  HTMLDivElement,
  { children: ReactNode }
>(({ children }, ref) => (
  <div
    style={{
      width: 240,
      height: 380,
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundImage:
        'repeating-conic-gradient(#E8E8E8 0% 25%, #FFFFFF 0% 50%)',
      backgroundSize: '14px 14px',
    }}
  >
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  </div>
));

TransparentMapFrame.displayName = 'TransparentMapFrame';
