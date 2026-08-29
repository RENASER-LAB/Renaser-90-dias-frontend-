import React from 'react';
import Svg, { Circle, Path, Rect, Ellipse, G } from 'react-native-svg';

export type IconName =
  | 'bell' | 'sun' | 'moon' | 'doc' | 'diamond' | 'users' | 'user' | 'dots' | 'info' | 'bulb'
  | 'body' | 'brain' | 'heart' | 'spark' | 'briefcase' | 'chevron' | 'arrow' | 'arrowLeft' | 'clock' | 'stack'
  | 'mail' | 'lock' | 'eye' | 'eyeOff' | 'check' | 'logout' | 'google' | 'apple' | 'key' | 'trophy' | 'zap';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth = 1.1 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (name) {
    case 'trophy':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M5 3.5h10v4.5a5 5 0 0 1-10 0V3.5z" />
          <Path {...s} d="M5 5.5H2.5a1.5 1.5 0 0 0-1.5 1.5v1a3 3 0 0 0 3 3H5M15 5.5h2.5a1.5 1.5 0 0 1 1.5 1.5v1a3 3 0 0 1-3 3H15" />
          <Path {...s} d="M10 13v3.5M6.5 16.5h7" />
        </Svg>
      );
    case 'zap':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M11 2L3.5 11h6L8.5 18 16.5 9h-6L11 2z" />
        </Svg>
      );
    case 'google':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            fill={color}
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <Path
            fill={color}
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <Path
            fill={color}
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <Path
            fill={color}
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </Svg>
      );
    case 'apple':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            fill={color}
            d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.87.94-2.97-.93.04-2.09.63-2.73 1.38-.56.65-1.06 1.76-.92 2.84 1.04.08 2.09-.54 2.71-1.25z"
          />
        </Svg>
      );
    case 'key':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={7} cy={7} r={4.5} />
          <Path {...s} d="M10.2 10.2L16.5 16.5M13.5 13.5l2-0.5M15 15l2-0.5" />
          <Circle cx={7} cy={7} r={1.5} fill={color} />
        </Svg>
      );
    case 'arrowLeft':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} strokeWidth={strokeWidth * 1.2} d="M15.5 10H4.5M9 5.5L4.5 10 9 14.5" />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect {...s} x={2.5} y={4.5} width={15} height={11} rx={2} />
          <Path {...s} d="M3.2 5.5l6.8 5.5 6.8-5.5" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect {...s} x={3.5} y={8.5} width={13} height={9.5} rx={2} />
          <Path {...s} d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" />
          <Circle cx={10} cy={13} r={1.2} fill={color} />
        </Svg>
      );
    case 'eye':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z" />
          <Circle {...s} cx={10} cy={10} r={2.5} />
        </Svg>
      );
    case 'eyeOff':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M3 3l14 14M9.2 9.2a2.5 2.5 0 0 0 3.6 3.6M6.5 6.7C4.6 7.8 3.2 9.4 2 10c0 0 3 5.5 8 5.5 2.1 0 3.9-.9 5.3-2.1M10 4.5c5 0 8 5.5 8 5.5-.7 1.3-1.8 2.6-3.2 3.6" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} strokeWidth={strokeWidth * 1.3} d="M4 10.5l4 4 8-9" />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M7 16.5H4.5A1.5 1.5 0 0 1 3 15V5a1.5 1.5 0 0 1 1.5-1.5H7" />
          <Path {...s} d="M12.5 13.5L16 10l-3.5-3.5" />
          <Path {...s} d="M16 10H7.5" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M10 2.4c-3 0-5 2.2-5 5 0 4-1.6 5.2-2.4 6-.5.5-.2 1.3.5 1.3h13.8c.7 0 1-.8.5-1.3-.8-.8-2.4-2-2.4-6 0-2.8-2-5-5-5z" />
          <Path {...s} d="M7.9 17.2a2.3 2.3 0 0 0 4.2 0" />
        </Svg>
      );
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={10} r={3.4} />
          <Path {...s} d="M10 1.8v2.2M10 16v2.2M1.8 10H4M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M15.8 4.2l-1.6 1.6M5.8 14.2l-1.6 1.6" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M15.8 12.1A6.6 6.6 0 1 1 7.9 4.2a5.2 5.2 0 0 0 7.9 7.9z" />
        </Svg>
      );
    case 'doc':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect {...s} x={4.2} y={2.2} width={11.6} height={15.6} rx={2.2} />
          <Path {...s} d="M7.2 6.6h5.6M7.2 10h5.6M7.2 13.4h3.4" />
        </Svg>
      );
    case 'diamond':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M10 2.4 12 8l5.6 2-5.6 2-2 5.6L8 12l-5.6-2L8 8z" />
        </Svg>
      );
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={7.6} cy={7.4} r={2.7} />
          <Path {...s} d="M2.2 16.8c0-2.9 2.4-4.8 5.4-4.8s5.4 1.9 5.4 4.8" />
          <Circle {...s} cx={14.4} cy={6} r={2.1} />
          <Path {...s} d="M12.6 11.6c3 0 5.2 1.7 5.2 4.4" />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={6.6} r={3.2} />
          <Path {...s} d="M3.6 17.4c0-3.3 2.9-5.6 6.4-5.6s6.4 2.3 6.4 5.6" />
        </Svg>
      );
    case 'dots':
      return (
        <Svg width={size} height={size / 3} viewBox="0 0 20 6">
          <Circle cx={3} cy={3} r={1.6} fill={color} />
          <Circle cx={10} cy={3} r={1.6} fill={color} />
          <Circle cx={17} cy={3} r={1.6} fill={color} />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={10} r={8} />
          <Path {...s} d="M10 9v5" />
          <Circle cx={10} cy={6.4} r={0.9} fill={color} />
        </Svg>
      );
    case 'bulb':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s} d="M11 3.2a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9z" />
          <Path {...s} d="M9 17.4h4M9.6 19.6h2.8" />
        </Svg>
      );
    case 'body':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle {...s} cx={11} cy={4} r={1.9} />
          <Path {...s} d="M11 6.2v6.4M11 7.6 4.8 10M11 7.6 17.2 10M11 12.6 7.8 19.6M11 12.6l3.2 7" />
        </Svg>
      );
    case 'brain':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s} d="M11 4.2v13.4" />
          <Path {...s} d="M11 5.6a3 3 0 0 0-5 2.2 2.6 2.6 0 0 0-.6 4.4A2.8 2.8 0 0 0 8 17.2a3 3 0 0 0 3-1.6" />
          <Path {...s} d="M11 5.6a3 3 0 0 1 5 2.2 2.6 2.6 0 0 1 .6 4.4A2.8 2.8 0 0 1 14 17.2a3 3 0 0 1-3-1.6" />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s} d="M11 18.2S3.6 13.6 3.6 8.9A3.9 3.9 0 0 1 11 7a3.9 3.9 0 0 1 7.4 1.9c0 4.7-7.4 9.3-7.4 9.3z" />
        </Svg>
      );
    case 'spark':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s} d="M11 2.4v17.2M2.4 11h17.2M4.9 4.9l12.2 12.2M17.1 4.9 4.9 17.1" />
          <Circle {...s} cx={11} cy={11} r={2.4} />
        </Svg>
      );
    case 'briefcase':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Rect {...s} x={3} y={6.6} width={16} height={11.4} rx={2} />
          <Path {...s} d="M8.4 6.6V5a1.6 1.6 0 0 1 1.6-1.6h2A1.6 1.6 0 0 1 13.6 5v1.6M3 11.6h16" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle {...s} cx={11} cy={11} r={7.4} />
          <Path {...s} d="M11 6.4v4.6l3.2 2" />
        </Svg>
      );
    case 'stack':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Ellipse {...s} cx={11} cy={6.2} rx={6.6} ry={2.6} />
          <Path {...s} d="M4.4 6.2v9.6c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6V6.2" />
          <Path {...s} d="M4.4 11c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6" />
        </Svg>
      );
    case 'arrow':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 12">
          <Path {...s} strokeWidth={1.5} d="M1.6 6h12M9.4 1.8 13.6 6l-4.2 4.2" />
        </Svg>
      );
    case 'chevron':
    default:
      return (
        <Svg width={size * 0.6} height={size} viewBox="0 0 9 15">
          <Path {...s} strokeWidth={1.4} d="M1.6 1.4 7 7.5l-5.4 6.1" />
        </Svg>
      );
  }
}