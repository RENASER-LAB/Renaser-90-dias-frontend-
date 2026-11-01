import type { IconName } from '../../../../components/Icon';

/**
 * Los íconos entre los que Administración elige el de una categoría (lista cerrada del servidor, `IconoDeCategoria`). Todos son
 * nombres que `Icon` ya dibuja: ampliar la lista pide una app nueva, y una categoría sin ícono (o con uno que esta versión no
 * conoce) usa el genérico.
 */
export const ICONOS_DE_CATEGORIA: readonly IconName[] = [
  'activity', 'brain', 'heart', 'sparkles', 'briefcase', 'bookOpen', 'flame', 'target',
  'compass', 'users', 'star', 'moon', 'sunrise', 'handHeart', 'award', 'bulb',
];

/** El de una categoría que no trae ícono (o trae uno desconocido). */
export const ICONO_GENERICO_DE_CATEGORIA: IconName = 'listChecks';

/** El nombre que lee el lector de pantalla en la grilla «Elige un ícono» (describe el dibujo). */
export const NOMBRE_DEL_ICONO_DE_CATEGORIA: Readonly<Record<string, string>> = {
  activity: 'Pulso',
  brain: 'Cerebro',
  heart: 'Corazón',
  sparkles: 'Destellos',
  briefcase: 'Maletín',
  bookOpen: 'Libro abierto',
  flame: 'Llama',
  target: 'Diana',
  compass: 'Brújula',
  users: 'Personas',
  star: 'Estrella',
  moon: 'Luna',
  sunrise: 'Amanecer',
  handHeart: 'Mano con corazón',
  award: 'Premio',
  bulb: 'Bombilla',
};

/** El ícono de línea para lo que mandó el servidor: el mismo si la app lo dibuja, si no el genérico. */
export function iconoDeCategoria(icono: string | null | undefined): IconName {
  return icono && (ICONOS_DE_CATEGORIA as readonly string[]).includes(icono) ? (icono as IconName) : ICONO_GENERICO_DE_CATEGORIA;
}
