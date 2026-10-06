import type { ImageSourcePropType } from 'react-native';
import type { ClaveDeFase } from '../../home/hooks/useResumenHome';

/**
 * El animal que representa a quien está en cada fase (pedido del dueño, 2026-10-06): mono, gorila,
 * caballo y águila, en ese orden, que es el orden de la línea evolutiva del repo anterior
 * (`ARCHETYPE_ORDER = ["macaco", "gorila", "caballo", "aguila"]` en `src/lib/avatarMood.ts`).
 *
 * **Se corresponde con la fase por POSICIÓN, no por días.** El repo anterior cortaba los animales en
 * los días 1–16 / 17–34 / 35–64 / 65–90 (y otras dos pantallas usaban 1/30/60/90 y 1–22/23–45/46–67/
 * 68–90); las fases de ahora son 1–7 / 8–34 / 35–64 / 65–90. Acá no se copia ningún corte: la fase
 * actual la dice `descripcionDeFase` (`useResumenHome`) y esta tabla sólo dice «qué animal es».
 *
 * Las claves son las de `FASES_EN_ORDEN`, y `Record<ClaveDeFase, …>` obliga a que haya un animal por
 * cada fase: una quinta fase no compila hasta que alguien le elija uno.
 */
export interface AnimalDeFase {
  nombre: string;
  imagen: ImageSourcePropType;
}

export const ANIMAL_DE_FASE: Record<ClaveDeFase, AnimalDeFase> = {
  PHASE_1_REBIRTH: { nombre: 'Mono', imagen: require('../../../../assets/fases/fase-1-mono.webp') },
  PHASE_2_DEVELOPMENT: { nombre: 'Gorila', imagen: require('../../../../assets/fases/fase-2-gorila.webp') },
  PHASE_3_ALCHEMIST_WARRIOR: { nombre: 'Caballo', imagen: require('../../../../assets/fases/fase-3-caballo.webp') },
  PHASE_4_ASCENSION: { nombre: 'Águila', imagen: require('../../../../assets/fases/fase-4-aguila.webp') },
};
