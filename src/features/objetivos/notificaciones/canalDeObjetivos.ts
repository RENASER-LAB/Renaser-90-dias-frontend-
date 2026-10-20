import { preferenciasDeAlarmas } from '../../alarmas/preferenciasDeAlarmas';
import type { CanalDeAlarma } from '../../alarmas/sonidoDeAlarma';
import {
  canalDeLaCombinacion,
  COMBINACION_POR_DEFECTO,
  type CombinacionDeAlarma,
} from '../../habits/notificaciones/utils/combinacionDeAlarma';

/**
 * El canal de Android por el que sale una alarma de las acciones de los objetivos (spec 010): el de la combinación
 * «cómo suena» de su día —con o sin vibración, solo vibrar, la voz de objetivos— y el tono de Yo → Alarmas.
 *
 * Es la misma tabla que los hábitos (`canalDeLaCombinacion`, spec 009) con el tipo `objetivos`: los ids son
 * `recordatorios-objetivos-vib`, `…-sinvib`, `…-vibrar-vib`, `…-voz-vib`, etc. **E-641 (vibrar por defecto) también vale
 * para objetivos**: el canal base `recordatorios-objetivos` no vibra (Android crea un canal sin vibración si no se le
 * pide) y por eso toda alarma de las acciones sale ahora por un canal que dice si vibra. Los de hábitos y eventos no se
 * tocan.
 *
 * Una acción no tiene voz propia: «Voz» es la frase de objetivos que ya existe («Tienes acciones de tus objetivos por
 * hacer»), sin grabar nada.
 */
export async function canalDeLaAlarmaDeObjetivos(
  userId: string,
  alarma: CombinacionDeAlarma | null | undefined,
): Promise<CanalDeAlarma> {
  const tono = (await preferenciasDeAlarmas(userId)).sonido;
  return canalDeLaCombinacion('objetivos', tono, alarma ?? COMBINACION_POR_DEFECTO);
}
