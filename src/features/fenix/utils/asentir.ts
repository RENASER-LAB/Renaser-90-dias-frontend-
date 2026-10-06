import type { PhoenixDirector } from '../rive/phoenixMaster';

/**
 * La reacción del fénix al cumplir UN hábito (2026-10-06): asiente una vez y sonríe, **700 ms** en total. Nada más.
 *
 * Por qué tan poco (Emil Kowalski, «frecuencia»): cumplir un hábito pasa varias veces al día; lo que se ve muchas veces
 * tiene que ser breve o cansa. El hábito ya tiene su propia respuesta (la pantalla que lo cierra, la vibración de
 * logro); esto solo dice «te vi». Sin superposición, sin bloquear, sin sonido. La celebración corta
 * (`trgCelebrateShort`, ~2 s) queda para los hitos (`hitosDelFenix`).
 *
 * Por qué no `trgSuccess`: su clip dura hasta 2,6 s (el Director lo espera hasta ahí) — es una celebración, no un gesto.
 * El asentir se arma con los ejes del rig (`headPitch`, `emotion`, `trgBlink`) y respeta el ánimo: la actitud del
 * ánimo se suma encima (§8.2), así que un fénix triste asiente triste.
 */
export const ASENTIR_MS = 700;
const BAJA_MS = 240;
const VUELVE_MS = 520;

export function asentir(director: PhoenixDirector): void {
  director.expression('happy');
  director.trigger('blink');
  director.actTo({ headPitch: -0.35 });
  void director.wait(BAJA_MS).then(() => director.actTo({ headPitch: 0.05 }));
  void director.wait(VUELVE_MS).then(() => director.actTo({ headPitch: 0 }));
  void director.wait(ASENTIR_MS).then(() => director.expression('neutral'));
}
