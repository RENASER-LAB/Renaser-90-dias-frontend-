import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "Guarda por error dónde te quedaste si te sales del modal" — el pedido literal del dueño del
 * producto para la Pastilla Renacer.
 *
 * ## Qué se guarda, y por qué eso y no otra cosa
 *
 * No alcanza con el texto a medio escribir. Si la persona vuelve y encuentra **otras preguntas**
 * que las que estaba contestando, el borrador no sirve de nada. Por eso se guardan las tres cosas
 * que definen "dónde estaba":
 *
 *   - `respuestas` — lo escrito hasta ahí, una por pregunta.
 *   - `preguntas` — el texto exacto de las preguntas que le habían tocado (el sorteo del día ya
 *     resuelto, congelado).
 *   - `indiceActual` — en cuál de ellas iba.
 *
 * ## Por qué local y no en el servidor
 *
 * Un borrador es de ESTE teléfono y de ESTOS segundos. No hay endpoint para guardarlo (el backend
 * solo conoce la entrega final, `POST /spirit-audio/submit`), y agregarlo significaría escribir en
 * la base en cada tecla. AsyncStorage y no SecureStore por el mismo motivo que
 * `services/storage/almacenamientoLocal.ts`: es un borrador de formulario, no una credencial.
 *
 * **Límite conocido, es una decisión, no un olvido:** el borrador no viaja entre dispositivos. Si
 * empieza en el teléfono y sigue en la tablet, arranca de cero. Persistirlo en el servidor es una
 * pregunta abierta para el dueño del producto (ver el informe de esta tarea).
 *
 * ## Clave por usuario y por día
 *
 * Por usuario, porque en un mismo teléfono pueden pasar varias cuentas y el borrador de una no
 * debe filtrarse a la sesión de otra (mismo criterio que el borrador de la Ficha Inicial). Por día
 * de audio, porque el borrador de ayer no debe aparecer sobre la Pastilla de hoy.
 */

export interface BorradorEspiritu {
  /** Las preguntas que le tocaron, congeladas: al retomar se muestran EXACTAMENTE estas. */
  preguntas: string[];
  /** Una respuesta por pregunta, en el mismo orden. */
  respuestas: string[];
  /** En qué pregunta se quedó. */
  indiceActual: number;
  guardadoEn: string;
}

const PREFIJO_CLAVE = 'renaser.espiritu.borrador.';

/**
 * La clave del borrador, por usuario y por AUDIO.
 *
 * > **Ampliado el 2026-09-22.** `audio` era un `number` —el día de la Pastilla— y ahora es
 * > `string | number`, porque el mismo modal sirve además a la Audioterapia Semanal, que se
 * > identifica por semana y no por día (`'semana-3'`). Un número sigue dando exactamente la misma
 * > clave que antes, así que los borradores ya guardados se siguen leyendo.
 */
function clave(userId: string, audio: string | number): string {
  return `${PREFIJO_CLAVE}${userId}.${audio}`;
}

/** Ninguna operación de almacenamiento debe poder tumbar la app — degradar a "no hay borrador". */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

export const borradorEspiritu = {
  guardar: (
    userId: string,
    audio: string | number,
    datos: Omit<BorradorEspiritu, 'guardadoEn'>,
  ): Promise<void> =>
    sinRomper(async () => {
      const borrador: BorradorEspiritu = { ...datos, guardadoEn: new Date().toISOString() };
      await AsyncStorage.setItem(clave(userId, audio), JSON.stringify(borrador));
    }, undefined),

  /** `null` si no hay borrador o si el JSON quedó corrupto (degrada, no revienta). */
  leer: (userId: string, audio: string | number): Promise<BorradorEspiritu | null> =>
    sinRomper(async () => {
      const crudo = await AsyncStorage.getItem(clave(userId, audio));
      if (!crudo) return null;
      try {
        const borrador = JSON.parse(crudo) as BorradorEspiritu;
        // Un borrador sin preguntas no se puede reponer: se descarta en vez de reabrir el modal
        // con un formulario incoherente.
        if (!Array.isArray(borrador.preguntas) || borrador.preguntas.length === 0) return null;
        return borrador;
      } catch {
        return null;
      }
    }, null),

  /** Se llama recién cuando el backend confirmó la entrega: el borrador ya no representa nada. */
  borrar: (userId: string, audio: string | number): Promise<void> =>
    sinRomper(() => AsyncStorage.removeItem(clave(userId, audio)), undefined),
};
