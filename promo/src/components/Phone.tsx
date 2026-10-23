import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile } from 'remotion';

/** Screenshots are 390 × 844 pt phone captures (1170 × 2532 px). */
const SCREEN_RATIO = 2532 / 1170;

/** A phone frame showing a real GripWise screen. `zoom` crops into part of the screen. */
export function Phone({
  screen,
  width = 400,
  zoom,
  style,
  children,
}: {
  screen: string;
  width?: number;
  zoom?: { scale: number; originY: number };
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const bezel = width * 0.035;
  const screenWidth = width - bezel * 2;
  return (
    <div
      style={{
        position: 'absolute',
        width,
        padding: bezel,
        borderRadius: width * 0.16,
        background: '#0f1f1c',
        boxShadow: '0 0 0 2px rgb(255 255 255 / 0.08) inset, 0 50px 100px rgb(11 36 32 / 0.35), 0 20px 40px rgb(11 36 32 / 0.2)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: screenWidth,
          height: screenWidth * SCREEN_RATIO,
          borderRadius: width * 0.125,
          overflow: 'hidden',
          background: '#f6f3ed',
        }}
      >
        <Img
          src={staticFile(`screens/${screen}.png`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: zoom ? `scale(${zoom.scale})` : undefined,
            transformOrigin: zoom ? `50% ${zoom.originY}%` : undefined,
          }}
        />
        {children}
      </div>
    </div>
  );
}
