import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { moodFromSemaforo, type PhoenixMood } from '../rive/phoenixMaster';

/**
 * El color del semáforo que manda el servidor → el ánimo del fénix (entrega v3.3, §8.2). No se recalcula nada: VERDE
 * alegre, AMARILLO serio, ROJO triste, y SIN_DATOS, `null` o cualquier color desconocido, neutral — nunca alegre por
 * falta de datos. La traducción es la del diseñador (`moodFromSemaforo`); esto solo le da nombre en la app.
 */
export function animoDelSemaforo(color: ColorSemaforo | null | undefined): PhoenixMood {
  return moodFromSemaforo(color);
}

/** El fénix del botón de SER: el ánimo del semáforo propio, o neutral para quien no se mide (staff). */
export function animoDelBotonDeSer(conSemaforoPropio: boolean, color: ColorSemaforo | null): PhoenixMood {
  return conSemaforoPropio ? animoDelSemaforo(color) : 'neutral';
}

/** Lo que dice el lector de pantalla del fénix de la tarjeta: la misma palabra que la tarjeta. */
export function nombreDelAnimo(animo: PhoenixMood): string {
  switch (animo) {
    case 'alegre':
      return 'contento';
    case 'serio':
      return 'atento';
    case 'triste':
      return 'decaído';
    default:
      return 'tranquilo';
  }
}
