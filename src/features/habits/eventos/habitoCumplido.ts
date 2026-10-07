/**
 * «Se cumplió un hábito»: un aviso dentro de la app, emitido por `completarRegistro` cuando el servidor confirma el
 * cierre (`POST /api/v1/habit-tracks/{id}/complete`). Es el único lugar por donde pasan todos los cierres hechos desde
 * la app (Training, la hoja de evidencia, el acompañante), así que nadie tiene que acordarse de avisar.
 *
 * Lo escuchan (2026-10-07): el semáforo vigente, que se vuelve a leer; el fénix vivo del centro de Hoy, que asiente; y
 * el fénix del botón de SER, que da un saltito (`FenixDeSerQueSalta`). Quien escucha no puede romper el cierre: un
 * error suyo se traga acá.
 *
 * > **Corregido 2026-10-07.** Decía «el fénix del botón de SER, que asiente»: el que asiente es el del centro de Hoy
 * > (`FenixDeSer`); el botón era foto fija sin reacción. El aviso ahora lleva QUÉ registro se cerró y los puntos que
 * > pagó el servidor, para que la tarjeta del hábito muestre «+N» sin calcular nada (pedido del dueño, 2026-10-07).
 */
export type HabitoCumplido = { registroId: string; puntosOtorgados: number };

type Oyente = (cumplido: HabitoCumplido) => void;

const oyentes = new Set<Oyente>();

/**
 * Los puntos de cada cierre confirmado, hasta que la tarjeta de ese registro los muestra (`tomarPuntosDe`). El aviso
 * llega ANTES de que la pantalla dibuje el check (la pantalla marca la tarjeta después de que `completarRegistro`
 * resolvió), así que la tarjeta los encuentra acá al dibujarse cumplida.
 */
const puntosSinMostrar = new Map<string, number>();

export function alCumplirUnHabito(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function avisarHabitoCumplido(cumplido: HabitoCumplido): void {
  puntosSinMostrar.set(cumplido.registroId, cumplido.puntosOtorgados);
  for (const oyente of [...oyentes]) {
    try {
      oyente(cumplido);
    } catch {
      /* el hábito ya quedó cumplido en el servidor: un oyente roto no lo deshace */
    }
  }
}

/**
 * Los puntos que el servidor pagó por ese registro, UNA vez: después de leerlos se olvidan, para que un check que se
 * vuelva a dibujar no repita el «+N». `null` si el cierre no pasó por `completarRegistro` (la Pastilla y la Clase
 * diaria se cierran por su propio endpoint, que no devuelve los puntos): ahí la tarjeta dice «Registrado».
 */
export function tomarPuntosDe(registroId: string): number | null {
  const puntos = puntosSinMostrar.get(registroId);
  puntosSinMostrar.delete(registroId);
  return puntos ?? null;
}
