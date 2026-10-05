/**
 * El icono de cada hábito, a partir de la clave que manda el backend.
 *
 * **Este archivo no importa NADA en tiempo de ejecución**, igual que `semanaDelPlan.ts` y
 * `momentosDelDia.ts`: el único import es de tipo (`IconName`) y desaparece al compilar.
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
 * ## POR QUÉ EL BACKEND MANDA UNA CLAVE Y NO EL DIBUJO
 *
 * Porque el dibujo es una decisión de presentación y cambia con el diseño; la clave es la identidad
 * y no cambia nunca. Con el emoji en la base, cambiar 🥗 por 🍎 habría sido una migración sobre datos
 * de producción. Acá es editar este archivo — y así pasó: el 2026-10-05 los emojis se cambiaron por
 * íconos de línea sin tocar el backend. Es el mismo criterio con el que `clave_sistema` viaja como
 * `DAILY_CLASS` y no como "Clase diaria".
 *
 * Las 17 claves son las que existen de verdad en `renaser.habitos` (consultadas contra la base, no
 * deducidas de los títulos). Si aparece una nueva, cae en el icono de su categoría y no rompe nada.
 *
 * ## ÍCONOS DE LÍNEA EN VEZ DE EMOJIS (rediseño de Training, 2026-10-05)
 *
 * Un emoji cambia de forma entre Android, iOS y la web, no sigue el color del tema y no tiene el
 * grosor de los demás íconos. Cada clave tiene ahora su forma de Lucide en `components/Icon.tsx`
 * (bloque «Training»). Despertar y Dormir comparten la clave `SLEEP` en el catálogo —el emoji 😴
 * servía para los dos opuestos—; acá se separan por su `clave_sistema` (`WAKE_UP` → amanecer), sin
 * tocar el backend.
 */
import type { IconName } from '../../../components/Icon';

/**
 * Las 17 claves reales del catálogo con su ícono de línea. Se ordenan como el día para que se lean
 * juntas las que van juntas, no alfabéticamente.
 */
const ICONO_DE_LINEA_POR_CLAVE: Readonly<Record<string, IconName>> = {
  // Arranque del día
  SLEEP: 'moon',
  WATER: 'glassWater',
  COLD_SHOWER: 'showerHead',
  RITUAL_MORNING: 'sunMedium',
  WORKOUT: 'dumbbell',
  WALKING: 'footprints',
  // Alimentación
  NUTRITION: 'salad',
  FAST_END: 'utensils',
  FAST_START: 'utensilsCrossed',
  // Mente y espíritu
  READING: 'bookOpenText',
  PODCAST: 'headphones',
  JOURNALING: 'notebookPen',
  GRATITUDE: 'handHeart',
  RITUAL_MIDDAY: 'sun',
  RITUAL_NIGHT: 'moonStar',
  // Entorno
  PHONE_OFF: 'smartphoneOff',
  COMMUNITY_POST: 'messageCircle',
};

/**
 * Las claves de SISTEMA que mandan sobre `iconKey`. Hoy una sola: Despertar viene del catálogo con
 * `SLEEP` (la luna de Dormir), y lo que hace es lo contrario.
 */
const ICONO_DE_LINEA_POR_CLAVE_DE_SISTEMA: Readonly<Record<string, IconName>> = {
  WAKE_UP: 'sunrise',
};

/** El de la categoría: el respaldo de un hábito sin icono propio (los personales que no eligieron). */
export const ICONO_DE_LINEA_POR_CATEGORIA: Readonly<Record<string, IconName>> = {
  BODY: 'body',
  MIND: 'brain',
  CONSCIENCE: 'heart',
  SPIRIT: 'spark',
};

const ICONO_DE_LINEA_POR_DEFECTO: IconName = 'target';

/**
 * El ícono de línea que corresponde a un hábito.
 *
 * @param habito `iconKey` (lo que manda el backend; `null` en los personales sin icono elegido),
 *               `systemKey` (la clave funcional; `WAKE_UP` distingue Despertar de Dormir) y
 *               `category` (`BODY`, `MIND`…), para el respaldo.
 * @param porDefecto el de su dimensión, si quien pregunta lo prefiere al de la categoría.
 */
export function iconoDeLineaDeHabito(
  habito: { iconKey?: string | null; systemKey?: string | null; category?: string | null },
  porDefecto?: IconName,
): IconName {
  const deSistema = habito.systemKey ? ICONO_DE_LINEA_POR_CLAVE_DE_SISTEMA[habito.systemKey] : undefined;
  if (deSistema) return deSistema;
  const propio = habito.iconKey ? ICONO_DE_LINEA_POR_CLAVE[habito.iconKey] : undefined;
  if (propio) return propio;
  return porDefecto
    ?? (habito.category ? ICONO_DE_LINEA_POR_CATEGORIA[habito.category] : undefined)
    ?? ICONO_DE_LINEA_POR_DEFECTO;
}

/**
 * Lo que dice cada ícono para el lector de pantalla, en la grilla «Elige un ícono»: un dibujo solo
 * no se anuncia, y la clave (`FAST_START`) no es castellano. Describe el dibujo, no una regla.
 */
const NOMBRE_DEL_ICONO: Readonly<Record<string, string>> = {
  SLEEP: 'Luna',
  WATER: 'Vaso de agua',
  COLD_SHOWER: 'Ducha',
  RITUAL_MORNING: 'Sol de la mañana',
  WORKOUT: 'Pesas',
  WALKING: 'Pasos',
  NUTRITION: 'Ensalada',
  FAST_END: 'Cubiertos',
  FAST_START: 'Cubiertos cruzados',
  READING: 'Libro abierto',
  PODCAST: 'Audífonos',
  JOURNALING: 'Cuaderno',
  GRATITUDE: 'Mano con corazón',
  RITUAL_MIDDAY: 'Sol',
  RITUAL_NIGHT: 'Luna y estrella',
  PHONE_OFF: 'Celular apagado',
  COMMUNITY_POST: 'Mensaje',
};

/**
 * Las claves que se le pueden ofrecer a alguien que crea un hábito propio, con su ícono.
 *
 * Son las MISMAS del catálogo y no una lista aparte: así un hábito propio se ve igual de curado
 * que uno del programa, y el día que se agregue un icono nuevo aparece en los dos lados sin que
 * nadie tenga que acordarse de sincronizar dos listas. Lo que se guarda sigue siendo la CLAVE.
 */
export const ICONOS_ELEGIBLES: readonly { clave: string; icono: IconName; nombre: string }[] = Object.entries(
  ICONO_DE_LINEA_POR_CLAVE,
).map(([clave, icono]) => ({ clave, icono, nombre: NOMBRE_DEL_ICONO[clave] ?? clave }));

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 * TRANSICIÓN: el emoji de siempre, solo para Plan.
 *
 * `PlanScreen` todavía dibuja `PlanHabit.icon` como texto (lo arma `mapearPlanHabit`). Queda hasta
 * que Plan pase a `iconoDeLineaDeHabito`; no sumarle usos. Cuando nadie lo llame, se borra con su
 * mapa.
 * ────────────────────────────────────────────────────────────────────────────────────────────── */
const ICONO_EMOJI_POR_CLAVE: Readonly<Record<string, string>> = {
  SLEEP: '😴',
  WATER: '💧',
  COLD_SHOWER: '🚿',
  RITUAL_MORNING: '🌅',
  WORKOUT: '🏋️',
  WALKING: '🚶',
  NUTRITION: '🥗',
  FAST_END: '🍽️',
  FAST_START: '🌗',
  READING: '📖',
  PODCAST: '🎧',
  JOURNALING: '✍️',
  GRATITUDE: '🙏',
  RITUAL_MIDDAY: '☀️',
  RITUAL_NIGHT: '🌙',
  PHONE_OFF: '📵',
  COMMUNITY_POST: '💬',
};

/**
 * El emoji de un hábito (lo que dibuja Plan hoy). Ver la nota de TRANSICIÓN de arriba.
 *
 * @param iconoClave lo que manda el backend (`iconKey`).
 * @param porDefecto el emoji de la categoría.
 */
export function iconoDeHabito(iconoClave: string | null | undefined, porDefecto: string): string {
  if (!iconoClave) return porDefecto;
  return ICONO_EMOJI_POR_CLAVE[iconoClave] ?? porDefecto;
}
