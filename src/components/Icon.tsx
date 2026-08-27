import React from 'react';
import Svg, { Circle, Path, Rect, Ellipse, G } from 'react-native-svg';

export type IconName =
  | 'bell' | 'sun' | 'moon' | 'doc' | 'diamond' | 'users' | 'user' | 'dots' | 'info' | 'bulb'
  | 'body' | 'brain' | 'heart' | 'spark' | 'briefcase' | 'chevron' | 'arrow' | 'clock' | 'stack';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth = 1.1 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (name) {
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