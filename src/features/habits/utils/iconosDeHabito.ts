/**
 * El icono de cada hábito, a partir de la clave que manda el backend.
 *
 * **Este archivo no importa NADA**, igual que `semanaDelPlan.ts` y `momentosDelDia.ts`.
 *
 * ## POR QUÉ EXISTE (2026-09-07)
 *
 * El icono se derivaba de la CATEGORÍA (`habitsMappers.CATEGORIA`: 💪 Cuerpo, 🧘 Mente, ✨ Espíritu,
 * ❤️ Emociones). Como todos los hábitos de una dimensión comparten categoría, la lista los pintaba
 * a **todos con el mismo símbolo**: los seis de CUERPO idénticos. El icono no distinguía nada, que
 * es lo único que un icono tiene que hacer.
 *
 * La base tenía el dato bueno desde el baseline —`renaser.habitos.icono_clave`, curado hábito por
 * hábito— y **ninguna API lo exponía**. Se agregó `iconKey` a `GET /api/v1/habits` (campo aditivo,
 * seguro: los esquemas zod de este módulo usan `.passthrough()`).
 *
 * ## POR QUÉ EL BACKEND MANDA UNA CLAVE Y NO EL EMOJI
 *
 * Porque el emoji es una decisión de presentación y cambia con el diseño; la clave es la identidad
 * y no cambia nunca. Con el emoji en la base, cambiar 🥗 por 🍎 sería una migración sobre datos de
 * producción. Acá es editar este archivo. Es el mismo criterio con el que `clave_sistema` viaja
 * como `DAILY_CLASS` y no como "Clase diaria".
 *
 * Las 17 claves son las que existen de verdad en `renaser.habitos` (consultadas contra la base, no
 * deducidas de los títulos). Si aparece una nueva, cae en el icono de su categoría y no rompe nada.
 */

/**
 * Las 17 claves reales del catálogo. Se ordenan como el día para que se lean juntas las que van
 * juntas, no alfabéticamente.
 */
const ICONO_POR_CLAVE: Readonly<Record<string, string>> = {
  // Arranque del día
  SLEEP: '😴',
  WATER: '💧',
  COLD_SHOWER: '🚿',
  RITUAL_MORNING: '🌅',
  WORKOUT: '🏋️',
  WALKING: '🚶',
  // Alimentación
  NUTRITION: '🥗',
  FAST_END: '🍽️',
  FAST_START: '🌗',
  // Mente y espíritu
  READING: '📖',
  PODCAST: '🎧',
  JOURNALING: '✍️',
  GRATITUDE: '🙏',
  RITUAL_MIDDAY: '☀️',
  RITUAL_NIGHT: '🌙',
  // Entorno
  PHONE_OFF: '📵',
  COMMUNITY_POST: '💬',
};

/**
 * El icono que corresponde mostrar.
 *
 * @param iconoClave lo que manda el backend (`iconKey`). `null` en los hábitos PERSONAL, que no
 *                   traen icono propio, y ausente contra un backend anterior a este campo.
 * @param porDefecto el icono de la categoría, que es lo que se usaba antes. Sigue siendo el
 *                   respaldo: peor que un icono repetido es una fila sin icono.
 */
export function iconoDeHabito(iconoClave: string | null | undefined, porDefecto: string): string {
  if (!iconoClave) return porDefecto;
  return ICONO_POR_CLAVE[iconoClave] ?? porDefecto;
}

/**
 * Las claves que se le pueden ofrecer a alguien que crea un hábito propio, con su emoji.
 *
 * Son las MISMAS del catálogo y no una lista aparte: así un hábito propio se ve igual de curado
 * que uno del programa, y el día que se agregue un icono nuevo aparece en los dos lados sin que
 * nadie tenga que acordarse de sincronizar dos listas.
 */
export const ICONOS_ELEGIBLES: readonly { clave: string; emoji: string }[] = Object.entries(
  ICONO_POR_CLAVE,
).map(([clave, emoji]) => ({ clave, emoji }));
