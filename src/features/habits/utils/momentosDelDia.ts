/**
 * Mañana, tarde y noche: dónde empieza cada bloque, y en cuál cae una hora.
 *
 * **Este archivo no importa NADA, igual que `semanaDelPlan.ts`, y conviene que siga así.** Lo usan
 * la hoja de Planificar de Training y, más adelante, cualquier otra pantalla que agrupe por
 * bloque; si acá se importara algo de una pantalla quedaría un ciclo.
 *
 * ## POR QUÉ EXISTE (2026-09-07)
 *
 * Hasta hoy el bloque salía de `aMomento` (`api/habitsMappers.ts`) con dos cortes CLAVADOS en el
 * código: `hora < 12` es mañana, `hora < 18` es tarde, el resto noche. Eso tiene dos defectos que
 * el dueño reportó como uno solo ("capaz ponen dormir en la mañana o viceversa"):
 *
 *  1. **La madrugada cae en "mañana".** Un hábito de dormir a las 00:30 daba `hora = 0 < 12`, o
 *     sea mañana. Dormir aparecía en el bloque de levantarse. No era un dato mal cargado: era la
 *     regla, que no tiene noción de que la noche cruza la medianoche.
 *  2. **Los cortes no son de nadie.** Quien se levanta 04:00, o trabaja de noche, veía su día
 *     partido en los bloques de otra persona, sin forma de moverlos.
 *
 * Acá los tres bloques se definen por sus tres COMIENZOS, no por seis extremos sueltos. Es la
 * diferencia que hace que el modelo no pueda romperse: tres puntos en un círculo de 24 h no
 * dejan huecos ni superposiciones por construcción, así que no hay ningún estado en el que una
 * hora caiga en dos bloques o en ninguno. Con seis extremos editables sí lo habría, y habría que
 * validarlo a mano en cada pantalla que los tocara.
 *
 * **Ningún bloque cruza la medianoche.** El día va de 00:00 a 24:00 y los cuatro bloques lo
 * parten en ese orden: madrugada, mañana, tarde, noche. La madrugada empieza siempre a las 00:00
 * —no es configurable, es el cambio de día— y los otros tres comienzos los mueve la persona. Por
 * eso 00:30 es MADRUGADA: ni mañana (el bug viejo) ni la noche de ayer (que sería mentir sobre
 * qué día es).
 */

/**
 * Los tres de `DayMoment` (`PlanScreen`) más MADRUGADA. Se repiten acá para no importar.
 *
 * **Por qué apareció el cuarto (2026-09-07).** Con tres bloques, la noche tenía que envolver la
 * medianoche para no dejar huecos: iba de 18:00 al comienzo de la mañana del día siguiente. El
 * dueño lo rechazó con razón — *"eso ya estaríamos al día siguiente"*: una hora de la madrugada del
 * martes no es "la noche del lunes", y mostrar `18:00 – 03:00` sugiere lo contrario. Pero cerrar la
 * noche a medianoche sin más dejaba 00:00–03:00 sin bloque, que es el mismo agujero por el que
 * `aMomento` mandaba dormir a la mañana.
 *
 * MADRUGADA cierra las dos cosas: la noche termina a las 00:00 exactas, la madrugada arranca ahí,
 * y ningún bloque cruza el cambio de día. Además es como se dice: la 01:00 es la madrugada, no la
 * noche ni la mañana.
 */
export type MomentoDelDia = 'madrugada' | 'mañana' | 'tarde' | 'noche';

/** En orden del día, que es el orden en que se pintan. */
export const MOMENTOS: MomentoDelDia[] = ['madrugada', 'mañana', 'tarde', 'noche'];

export const ETIQUETA_MOMENTO: Record<MomentoDelDia, string> = {
  madrugada: '🌘 MADRUGADA',
  mañana: '🌅 MAÑANA',
  tarde: '☀️ TARDE',
  noche: '🌙 NOCHE',
};

/**
 * Minutos desde medianoche en que ARRANCA cada bloque. La madrugada no figura porque su comienzo
 * es 00:00 por definición; estos tres cortes son los únicos que se pueden mover.
 */
export interface RangosDelDia {
  inicioManana: number;
  inicioTarde: number;
  inicioNoche: number;
}

const MINUTOS_POR_DIA = 24 * 60;

/**
 * Los cortes de fábrica. `inicioTarde` (12:00) e `inicioNoche` (18:00) son EXACTAMENTE los de
 * `aMomento`, para que quien no toque nada vea lo mismo que veía. `inicioManana` es el único valor
 * nuevo: antes ese corte no existía porque la madrugada se hundía en "mañana".
 *
 * **03:00 y no 05:00** (pedido del dueño 2026-09-07): hay aprendices reales que se levantan a esa
 * hora, y con la mañana empezando 05:00 su despertar caía fuera de MAÑANA. El corte de fábrica
 * tiene que dejar adentro al que madruga más, porque quien no madruga puede correrlo.
 *
 * Con esto los cuatro bloques de fábrica son: madrugada 00:00–03:00, mañana 03:00–12:00,
 * tarde 12:00–18:00 y noche 18:00–00:00.
 */
export const RANGOS_POR_DEFECTO: RangosDelDia = {
  inicioManana: 3 * 60,
  inicioTarde: 12 * 60,
  inicioNoche: 18 * 60,
};

/** Bloque mínimo, para que ajustando los cortes no se pueda dejar un bloque de cero minutos. */
export const MINIMO_POR_BLOQUE = 60;

/** `HH:mm` (o `HH:mm:ss`) → minutos desde medianoche. Devuelve `null` si no se puede leer. */
export function aMinutos(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return ((h * 60 + m) % MINUTOS_POR_DIA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
}

/** Minutos desde medianoche → `HH:mm`. */
export function aHoraTexto(minutos: number): string {
  const normalizado = ((minutos % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * En qué bloque cae una hora. Cuatro tramos consecutivos sobre `[0, 1440)`, sin vueltas: la
 * comparación es una escalera de menores y por eso no hay forma de que una hora quede afuera.
 */
export function momentoDeMinutos(minutos: number, rangos: RangosDelDia): MomentoDelDia {
  if (minutos < rangos.inicioManana) return 'madrugada';
  if (minutos < rangos.inicioTarde) return 'mañana';
  if (minutos < rangos.inicioNoche) return 'tarde';
  return 'noche';
}

/** Igual que `momentoDeMinutos` pero desde `HH:mm`/`HH:mm:ss`. Sin hora se asume mañana. */
export function momentoDeHora(hhmm: string | null | undefined, rangos: RangosDelDia): MomentoDelDia {
  const minutos = aMinutos(hhmm);
  return minutos === null ? 'mañana' : momentoDeMinutos(minutos, rangos);
}

/** Dónde arranca y dónde termina un bloque, en minutos desde la medianoche de ESE día. */
export function limitesDelMomento(
  momento: MomentoDelDia,
  rangos: RangosDelDia,
): { desde: number; hasta: number } {
  if (momento === 'madrugada') return { desde: 0, hasta: rangos.inicioManana };
  if (momento === 'mañana') return { desde: rangos.inicioManana, hasta: rangos.inicioTarde };
  if (momento === 'tarde') return { desde: rangos.inicioTarde, hasta: rangos.inicioNoche };
  // `MINUTOS_POR_DIA` y no 0: la noche termina AL FINAL del día, y `aHoraTexto` lo pinta 00:00.
  return { desde: rangos.inicioNoche, hasta: MINUTOS_POR_DIA };
}

/** `03:00 – 12:00`, para pintar el rango de un bloque. La noche cierra en `00:00`. */
export function rangoTexto(momento: MomentoDelDia, rangos: RangosDelDia): string {
  const { desde, hasta } = limitesDelMomento(momento, rangos);
  return `${aHoraTexto(desde)} – ${aHoraTexto(hasta)}`;
}

/**
 * Mueve el comienzo de UN bloque, devolviendo rangos nuevos. Si el movimiento dejaría un bloque
 * por debajo de `MINIMO_POR_BLOQUE` —el propio o el de al lado— devuelve los rangos SIN TOCAR:
 * es preferible que el botón no haga nada visible a guardar una configuración imposible que
 * después haya que validar en cada pantalla que la lea.
 */
export function moverInicio(
  rangos: RangosDelDia,
  momento: MomentoDelDia,
  deltaMinutos: number,
): RangosDelDia {
  // La madrugada empieza a las 00:00 y punto: eso no es una preferencia, es el cambio de día.
  if (momento === 'madrugada') return rangos;
  const propuesta: RangosDelDia = { ...rangos };
  if (momento === 'mañana') propuesta.inicioManana += deltaMinutos;
  else if (momento === 'tarde') propuesta.inicioTarde += deltaMinutos;
  else propuesta.inicioNoche += deltaMinutos;
  return rangosValidos(propuesta) ? propuesta : rangos;
}

/**
 * Los tres cortes en orden, dentro del día, y los CUATRO bloques por encima del mínimo. La
 * madrugada entra en la cuenta: su largo es `inicioManana`, así que la mañana no puede empezar
 * antes de las 01:00 ni la noche cerrar tan tarde que se coma el último tramo.
 */
export function rangosValidos(rangos: RangosDelDia): boolean {
  const { inicioManana, inicioTarde, inicioNoche } = rangos;
  if (![inicioManana, inicioTarde, inicioNoche].every(v => Number.isInteger(v) && v > 0 && v < MINUTOS_POR_DIA)) {
    return false;
  }
  if (inicioManana < MINIMO_POR_BLOQUE) return false;                       // madrugada
  if (inicioTarde - inicioManana < MINIMO_POR_BLOQUE) return false;         // mañana
  if (inicioNoche - inicioTarde < MINIMO_POR_BLOQUE) return false;          // tarde
  if (MINUTOS_POR_DIA - inicioNoche < MINIMO_POR_BLOQUE) return false;      // noche
  return true;
}

/**
 * Hábitos cuyo bloque NO es cuestión de gusto: despertarse es de mañana y dormir es de noche, por
 * definición de lo que la persona está haciendo. Se emparejan por `clave_sistema` y NUNCA por
 * título, que el aprendiz puede renombrar — mismo criterio que el resto de la app.
 *
 * No bloquea: avisa. Alguien que trabaja de noche puede querer dormir a las 09:00 y está en su
 * derecho; lo que no puede pasar es que lo haga sin darse cuenta.
 */
export const MOMENTO_ESPERADO: Readonly<Record<string, readonly MomentoDelDia[]>> = {
  // Levantarse puede ser de madrugada: es justamente el caso que el corte de las 03:00 contempla.
  WAKE_UP: ['madrugada', 'mañana'],
  // Y acostarse a las 00:30 es tarde, no incoherente. Lo que sí llama la atención es dormir de día.
  SLEEP: ['noche', 'madrugada'],
};
