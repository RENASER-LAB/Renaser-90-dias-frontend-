import React from 'react';
import Svg, { Circle, Path, Rect, Ellipse, Polygon } from 'react-native-svg';

export type IconName =
  | 'bell' | 'sun' | 'moon' | 'doc' | 'diamond' | 'users' | 'user' | 'dots' | 'info' | 'bulb'
  | 'body' | 'brain' | 'heart' | 'spark' | 'briefcase' | 'chevron' | 'arrow' | 'arrowLeft' | 'clock' | 'stack'
  | 'mail' | 'lock' | 'eye' | 'eyeOff' | 'check' | 'logout' | 'google' | 'apple' | 'key' | 'trophy' | 'zap'
  | 'fire' | 'play' | 'pause' | 'plus' | 'chat' | 'send' | 'calendar' | 'award' | 'share' | 'filter'
  | 'dumbbell' | 'volume' | 'star' | 'checkCircle' | 'camera' | 'image'
  | 'close' | 'target' | 'thumbsUp' | 'mic' | 'search'
  | 'newspaper' | 'bookOpen' | 'quote' | 'globe' | 'headset' | 'messageCircle' | 'video' | 'fileText' | 'link' | 'pencil' | 'idCard' | 'layoutGrid';

/**
 * Grosor del trazo, en píxeles REALES de pantalla, a cualquier tamaño (decisión del dueño,
 * 2026-10-05: «unificar el grosor de los íconos en toda la app»).
 *
 * Antes el trazo se daba en unidades de la caja del dibujo (`strokeWidth = 1.1` en una caja de 20),
 * así que el grosor real dependía del tamaño: a 14 px quedaba en 0,77 px (casi invisible, sobre todo
 * en dorado sobre crema) y a 28 px en 1,54. Ahora se fija lo que se VE —1,75 px— y las unidades se
 * calculan para cada caja y cada tamaño (`grosorDelTrazo`).
 */
export const GROSOR_TRAZO_PX = 1.75;

/** Los tres tamaños de uso: 16 junto a texto chico, 20 en botones y filas, 24 en cabeceras y la flecha de volver. */
export const TAMANO_ICONO = { chico: 16, normal: 20, grande: 24 } as const;

/**
 * `strokeWidth` en unidades del `viewBox` para que el trazo mida `GROSOR_TRAZO_PX` en pantalla.
 *
 * - `lado`: el lado de la caja del dibujo que corresponde a `size` (20, 22 o 24; 15 en el chevron,
 *   cuya caja es de 9 × 15 y se dibuja a `size` de alto).
 * - `explicito`: el `strokeWidth` que pasa quien lo usa, en las unidades de siempre (las de la
 *   caja). Se respeta si es MÁS grueso que el normal —un ✓ sobre un fondo dorado, que se quiso
 *   marcado— y nunca deja el trazo más fino que el de toda la app.
 */
export function grosorDelTrazo({ lado, size, explicito }: { lado: number; size: number; explicito?: number }): number {
  const normal = (GROSOR_TRAZO_PX * lado) / size;
  return explicito === undefined ? normal : Math.max(explicito, normal);
}

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth }: Props) {
  /* Un trazo por caja: `s` para los dibujos de 20 (casi todos), `s22` y `s24` para los de esas
     cajas. Un ícono nuevo de Lucide va en caja de 24 y usa `s24`: con `s` saldría a 1,46 px. */
  const trazoPara = (lado: number, conElDeQuienLoUsa = true) => ({
    stroke: color,
    strokeWidth: grosorDelTrazo({ lado, size, explicito: conElDeQuienLoUsa ? strokeWidth : undefined }),
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  });
  const s = trazoPara(20);
  const s22 = trazoPara(22);
  const s24 = trazoPara(24);

  switch (name) {
    case 'fire':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path
            {...s}
            d="M10 2c0 3.5-3 5-3 8a5 5 0 0 0 10 0c0-4-3.5-6-3.5-6s.5 2.5-1 3.5c-.8.5-1.5 0-1.5-1.5 0-2 2-3 2-4-1 0-3 1-3 0z"
          />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Polygon points="6,4 16,10 6,16" fill={color} />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect x={5} y={4} width={3.5} height={12} fill={color} rx={1} />
          <Rect x={11.5} y={4} width={3.5} height={12} fill={color} rx={1} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} strokeWidth={s.strokeWidth * 1.3} d="M10 4v12M4 10h12" />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M17 9.5a6.5 6.5 0 0 1-9.5 5.7L3 16.5l1.3-4.5A6.5 6.5 0 1 1 17 9.5z" />
        </Svg>
      );
    case 'mic':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M10 2.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0V5A2.5 2.5 0 0 0 10 2.5zM5 9.5a5 5 0 0 0 10 0M10 14.5V18M7 18h6" />
        </Svg>
      );
    case 'send':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z" />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect {...s} x={3} y={4.5} width={14} height={13} rx={2} />
          <Path {...s} d="M13.5 2.5v4M6.5 2.5v4M3 8.5h14" />
        </Svg>
      );
    case 'award':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={7.5} r={4.5} />
          <Path {...s} d="M7 11.5L5.5 17.5 10 15l4.5 2.5-1.5-6" />
        </Svg>
      );
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={15} cy={5} r={2.5} />
          <Circle {...s} cx={5} cy={10} r={2.5} />
          <Circle {...s} cx={15} cy={15} r={2.5} />
          <Path {...s} d="M7.3 8.8l5.4-2.6M7.3 11.2l5.4 2.6" />
        </Svg>
      );
    case 'filter':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Polygon points="3,4 17,4 11.5,10.5 11.5,16 8.5,14 8.5,10.5" fill="none" stroke={color} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'dumbbell':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M2.5 7v6M5.5 5v10M14.5 5v10M17.5 7v6M5.5 10h9M3.5 7.5h2M14.5 7.5h2M3.5 12.5h2M14.5 12.5h2" />
        </Svg>
      );
    case 'volume':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Polygon points="3.5,7 7.5,7 12,3.5 12,16.5 7.5,13 3.5,13" fill="none" stroke={color} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path {...s} d="M15 7a4.5 4.5 0 0 1 0 6M16.5 4.5a8 8 0 0 1 0 11" />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Polygon points="10,2.5 12.5,7.5 18,8.2 14,12 15,17.5 10,14.8 5,17.5 6,12 2,8.2 7.5,7.5" fill={color} />
        </Svg>
      );
    case 'checkCircle':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={10} r={8} />
          <Path {...s} strokeWidth={s.strokeWidth * 1.3} d="M6.5 10.5l2.5 2.5 5-5.5" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M3 6.5h3l1.5-2.5h5L14 6.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 16V8a1.5 1.5 0 0 1 1.5-1.5z" />
          <Circle {...s} cx={10} cy={12} r={3.2} />
        </Svg>
      );
    case 'image':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Rect {...s} x={2.5} y={3.5} width={15} height={13} rx={2} />
          <Circle {...s} cx={6.5} cy={7.5} r={1.5} />
          <Path {...s} d="M17.5 13.5l-4.5-4.5-6.5 6.5" />
        </Svg>
      );
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
    /* `google` y `apple` son LOGOS, no íconos de interfaz, y están de salida: el reemplazo es
       `LogoDeMarca` (los archivos oficiales de svgl, con sus colores; 2026-10-05). Estos de acá
       pintan la marca de un solo color, que es justo lo que las guías de Google y Apple piden no
       hacer. Quedan mientras `LoginScreen` los use; cuando pase a `LogoDeMarca`, se borran los dos
       casos y sus nombres de `IconName`. No sumar usos nuevos. */
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
          <Path {...s} strokeWidth={s.strokeWidth * 1.2} d="M15.5 10H4.5M9 5.5L4.5 10 9 14.5" />
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
          <Path {...s} strokeWidth={s.strokeWidth * 1.3} d="M4 10.5l4 4 8-9" />
        </Svg>
      );
    /* `close`, `target` y `thumbsUp` sustituyen a los emojis que se usaban como iconos
       (✕, 🎯, 👍). Un emoji lo dibuja la fuente del sistema: cambia de forma y de color
       entre Android, iOS y web, ignora el color del tema y no escala con `size`. */
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={8.75} cy={8.75} r={5.25} />
          <Path {...s} d="M12.6 12.6 16.5 16.5" />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} strokeWidth={s.strokeWidth * 1.3} d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
        </Svg>
      );
    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle {...s} cx={10} cy={10} r={7} />
          <Circle {...s} cx={10} cy={10} r={3.2} />
          <Circle cx={10} cy={10} r={1.2} fill={color} />
        </Svg>
      );
    case 'thumbsUp':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path {...s} d="M6 9.5v7h8.2a1.6 1.6 0 0 0 1.6-1.3l1-4.6a1.2 1.2 0 0 0-1.2-1.5h-3.4l.5-2.6a1.7 1.7 0 0 0-1.7-2.1L9 8.2 6 9.5z" />
          <Rect {...s} x={2.6} y={9.2} width={3.4} height={7.6} rx={1} />
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
          <Path {...s22} d="M11 3.2a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9z" />
          <Path {...s22} d="M9 17.4h4M9.6 19.6h2.8" />
        </Svg>
      );
    case 'body':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle {...s22} cx={11} cy={4} r={1.9} />
          <Path {...s22} d="M11 6.2v6.4M11 7.6 4.8 10M11 7.6 17.2 10M11 12.6 7.8 19.6M11 12.6l3.2 7" />
        </Svg>
      );
    case 'brain':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s22} d="M11 4.2v13.4" />
          <Path {...s22} d="M11 5.6a3 3 0 0 0-5 2.2 2.6 2.6 0 0 0-.6 4.4A2.8 2.8 0 0 0 8 17.2a3 3 0 0 0 3-1.6" />
          <Path {...s22} d="M11 5.6a3 3 0 0 1 5 2.2 2.6 2.6 0 0 1 .6 4.4A2.8 2.8 0 0 1 14 17.2a3 3 0 0 1-3-1.6" />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s22} d="M11 18.2S3.6 13.6 3.6 8.9A3.9 3.9 0 0 1 11 7a3.9 3.9 0 0 1 7.4 1.9c0 4.7-7.4 9.3-7.4 9.3z" />
        </Svg>
      );
    case 'spark':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path {...s22} d="M11 2.4v17.2M2.4 11h17.2M4.9 4.9l12.2 12.2M17.1 4.9 4.9 17.1" />
          <Circle {...s22} cx={11} cy={11} r={2.4} />
        </Svg>
      );
    case 'briefcase':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Rect {...s22} x={3} y={6.6} width={16} height={11.4} rx={2} />
          <Path {...s22} d="M8.4 6.6V5a1.6 1.6 0 0 1 1.6-1.6h2A1.6 1.6 0 0 1 13.6 5v1.6M3 11.6h16" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle {...s22} cx={11} cy={11} r={7.4} />
          <Path {...s22} d="M11 6.4v4.6l3.2 2" />
        </Svg>
      );
    case 'stack':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Ellipse {...s22} cx={11} cy={6.2} rx={6.6} ry={2.6} />
          <Path {...s22} d="M4.4 6.2v9.6c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6V6.2" />
          <Path {...s22} d="M4.4 11c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6" />
        </Svg>
      );
    case 'arrow':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 12">
          {/* Caja de 16 × 12 dibujada a `size` × `size`: manda el ancho (16). Como antes, no toma el
              `strokeWidth` de quien lo usa (llevaba uno fijo). */}
          <Path {...trazoPara(16, false)} d="M1.6 6h12M9.4 1.8 13.6 6l-4.2 4.2" />
        </Svg>
      );
    /* Comunidad · tanda 1 (íconos) */
    /* Forma de referencia: Lucide (licencia ISC), caja de 24 y trazo `s24`. Reemplazan emojis y
       metáforas equivocadas de Comunidad (inventario del 2026-10-05): el Muro con el mismo globo de
       «Comentar», Cursos con un cilindro de base de datos, Testimonios con la estrella de «favorito». */
    case 'newspaper':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M15 18h-5M18 14h-8" />
          <Path {...s24} d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
          <Rect {...s24} x={10} y={6} width={8} height={4} rx={1} />
        </Svg>
      );
    case 'bookOpen':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M12 7v14" />
          <Path {...s24} d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </Svg>
      );
    case 'quote':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
          <Path {...s24} d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
        </Svg>
      );
    case 'globe':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle {...s24} cx={12} cy={12} r={10} />
          <Path {...s24} d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </Svg>
      );
    case 'headset':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
          <Path {...s24} d="M21 16v2a4 4 0 0 1-4 4h-5" />
        </Svg>
      );
    case 'messageCircle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </Svg>
      );
    case 'video':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
          <Rect {...s24} x={2} y={6} width={14} height={12} rx={2} />
        </Svg>
      );
    case 'fileText':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <Path {...s24} d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
        </Svg>
      );
    case 'link':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <Path {...s24} d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          <Path {...s24} d="m15 5 4 4" />
        </Svg>
      );
    case 'idCard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path {...s24} d="M16 10h2M16 14h2M6.17 15a3 3 0 0 1 5.66 0" />
          <Circle {...s24} cx={9} cy={11} r={2} />
          <Rect {...s24} x={2} y={5} width={20} height={14} rx={2} />
        </Svg>
      );
    case 'layoutGrid':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect {...s24} x={3} y={3} width={7} height={7} rx={1} />
          <Rect {...s24} x={14} y={3} width={7} height={7} rx={1} />
          <Rect {...s24} x={14} y={14} width={7} height={7} rx={1} />
          <Rect {...s24} x={3} y={14} width={7} height={7} rx={1} />
        </Svg>
      );
    case 'chevron':
    default:
      return (
        <Svg width={size * 0.6} height={size} viewBox="0 0 9 15">
          {/* Caja de 9 × 15 dibujada a `size` de alto: manda el alto (15). Antes llevaba 1,4 fijo, que
              ignoraba el `strokeWidth` de quien lo usara y a 12 px quedaba en 1,1 px reales. Lo sigue
              ignorando: `BotonBajarAlFinal` le pasa 1,8 pensado para otra caja y saldría a 2,9 px. */}
          <Path {...trazoPara(15, false)} d="M1.6 1.4 7 7.5l-5.4 6.1" />
        </Svg>
      );
  }
}