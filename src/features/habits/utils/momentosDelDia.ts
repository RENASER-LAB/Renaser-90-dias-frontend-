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
 * La noche es el bloque que envuelve la medianoche: va desde `inicioNoche` hasta `inicioMañana`
 * del día siguiente. Por eso 00:30 con la mañana empezando 05:00 es NOCHE, que es la corrección
 * que se pidió.
 */

/** Los mismos tres valores que `DayMoment` en `PlanScreen`. Se repiten acá para no importar. */
export type MomentoDelDia = 'mañana' | 'tarde' | 'noche';

export const MOMENTOS: MomentoDelDia[] = ['mañana', 'tarde', 'noche'];

export const ETIQUETA_MOMENTO: Record<MomentoDelDia, string> = {
  mañana: '🌅 MAÑANA',
  tarde: '☀️ TARDE',
  noche: '🌙 NOCHE',
};

/** Minutos desde medianoche en que ARRANCA cada bloque. `inicioNoche` termina en `inicioMañana`. */
export interface RangosDelDia {
  inicioManana: number;
  inicioTarde: number;
  inicioNoche: number;
}

const MINUTOS_POR_DIA = 24 * 60;

/**
 * Los cortes de fábrica. `inicioTarde` (12:00) e `inicioNoche` (18:00) son EXACTAMENTE los de
 * `aMomento`, para que quien no toque nada vea lo mismo que veía. `inicioManana` en 05:00 es el
 * único valor nuevo: antes ese corte no existía porque la madrugada se hundía en "mañana".
 */
export const RANGOS_POR_DEFECTO: RangosDelDia = {
  inicioManana: 5 * 60,
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
 * En qué bloque cae una hora. La noche es el complemento de los otros dos, así que cubre tanto
 * `>= inicioNoche` como la madrugada `< inicioManana` — sin ese "o" la medianoche quedaba huérfana
 * y terminaba contada como mañana, que es el bug que este archivo vino a cerrar.
 */
export function momentoDeMinutos(minutos: number, rangos: RangosDelDia): MomentoDelDia {
  if (minutos >= rangos.inicioManana && minutos < rangos.inicioTarde) return 'mañana';
  if (minutos >= rangos.inicioTarde && minutos < rangos.inicioNoche) return 'tarde';
  return 'noche';
}

/** Igual que `momentoDeMinutos` pero desde `HH:mm`/`HH:mm:ss`. Sin hora se asume mañana. */
export function momentoDeHora(hhmm: string | null | undefined, rangos: RangosDelDia): MomentoDelDia {
  const minutos = aMinutos(hhmm);
  return minutos === null ? 'mañana' : momentoDeMinutos(minutos, rangos);
}

/** Dónde arranca y dónde termina un bloque, en minutos. En la noche `hasta` es del día siguiente. */
export function limitesDelMomento(
  momento: MomentoDelDia,
  rangos: RangosDelDia,
): { desde: number; hasta: number } {
  if (momento === 'mañana') return { desde: rangos.inicioManana, hasta: rangos.inicioTarde };
  if (momento === 'tarde') return { desde: rangos.inicioTarde, hasta: rangos.inicioNoche };
  return { desde: rangos.inicioNoche, hasta: rangos.inicioManana + MINUTOS_POR_DIA };
}

/** `05:00 – 12:00`, para pintar el rango de un bloque. */
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
  const propuesta: RangosDelDia = { ...rangos };
  if (momento === 'mañana') propuesta.inicioManana += deltaMinutos;
  else if (momento === 'tarde') propuesta.inicioTarde += deltaMinutos;
  else propuesta.inicioNoche += deltaMinutos;
  return rangosValidos(propuesta) ? propuesta : rangos;
}

/**
 * Los tres cortes tienen que estar en orden y dentro del día, y ningún bloque puede quedar por
 * debajo del mínimo — incluida la noche, que se mide dando la vuelta a la medianoche.
 */
export function rangosValidos(rangos: RangosDelDia): boolean {
  const { inicioManana, inicioTarde, inicioNoche } = rangos;
  if (![inicioManana, inicioTarde, inicioNoche].every(v => Number.isInteger(v) && v >= 0 && v < MINUTOS_POR_DIA)) {
    return false;
  }
  if (inicioTarde - inicioManana < MINIMO_POR_BLOQUE) return false;
  if (inicioNoche - inicioTarde < MINIMO_POR_BLOQUE) return false;
  // La noche cruza la medianoche: su largo es lo que falta del día más lo que va hasta la mañana.
  if (MINUTOS_POR_DIA - inicioNoche + inicioManana < MINIMO_POR_BLOQUE) return false;
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
export const MOMENTO_ESPERADO: Readonly<Record<string, MomentoDelDia>> = {
  WAKE_UP: 'mañana',
  SLEEP: 'noche',
};
