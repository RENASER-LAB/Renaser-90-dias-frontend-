import voces from '../vocesDelRadar.json';
import type { CampoRadar } from './configRadar';

/**
 * Las voces de las cuatro preguntas del Código Renaser (spec 030, 2026-10-31): la voz Dora de las alarmas, grabada,
 * que se oye al tocar «Escuchar» sin necesitar red. Lo que dice cada una vive en `../vocesDelRadar.json`, el MISMO archivo
 * que lee `scripts/sonidos/generar-sonidos.sh` para hacer los MP3: la app y el script no pueden desincronizarse. Si cambia
 * el texto de una pregunta (`PREGUNTAS_RADAR`), una prueba avisa que hay que volver a generar su voz.
 *
 * Los `require` son estáticos a propósito: Metro los resuelve al empaquetar y no admite rutas armadas con una variable.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const VOZ_DE_LA_PREGUNTA: Readonly<Record<CampoRadar, number>> = {
  whatAmIDoing: require('../../../../assets/sonidos/voz_radar_que_hago.mp3'),
  whatAmIThinking: require('../../../../assets/sonidos/voz_radar_que_pienso.mp3'),
  whatAmIFeeling: require('../../../../assets/sonidos/voz_radar_que_siento.mp3'),
  whatAmIAvoiding: require('../../../../assets/sonidos/voz_radar_que_evito.mp3'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Los archivos de `assets/sonidos/` que nombra el Código Renaser: cada uno va también en `sounds` de `app.json`. */
export const ARCHIVOS_DE_VOZ_DEL_RADAR: readonly string[] = voces.preguntas.map(p => p.archivo);

/** Lo que dice la voz de una pregunta (para las pruebas y para quien lea el código). */
export function loQueDiceLaVoz(campo: CampoRadar): string | undefined {
  return voces.preguntas.find(p => p.campo === campo)?.dice;
}
