/**
 * Mi Radar por día de la semana (spec 012, cuarta ronda): lo que pasa al marcar días en Yo → Mi Radar y cambiarles las
 * horas. Todo puro: la pantalla solo guarda el borrador y dibuja lo que esto dice.
 *
 * Es la misma forma que «Planificar» de los hábitos y que los recordatorios de las acciones (specs 008 y 010):
 *
 * - **Sin días marcados** se edita lo de todos los días (eso no pasa por acá).
 * - **Con días marcados** lo que se toca queda en un `BorradorDeLosDias` y se guarda con «Guardar horas · sáb, dom».
 *   **Se guarda solo lo tocado**: si no se tocó nada de un tipo, cada día conserva lo que tenía.
 * - Si los días marcados no coinciden entre sí, no se marca ninguna hora y se lee «Estos días tienen horas distintas»;
 *   lo que se elija se pone a todos los marcados.
 * - Un día que queda con las mismas horas que todos los días **vuelve a seguirlas** (no se guarda como propio).
 *
 * Qué horas tiene un día lo dice `horasDelDia` (`miRadar.ts`), una sola vez.
 */
import type { DiaDeMiRadarApi, MiRadarApi } from '../types/radar.types';
import { type DiaIso, diaSinRadar, diasConHorasPropias, horasDelDia, textoDeLasHoras } from './miRadar';

/**
 * Lo que se tocó para los días marcados. Cada campo `undefined` es «no se tocó».
 * - `sin`: `true` = «Sin Radar estos días»; `false` = ya no (vuelven a seguir a todos los días, salvo que se hayan elegido horas).
 * - `horas`: las horas propias que se eligieron para todos los marcados.
 */
export interface BorradorDeLosDias {
  sin?: boolean;
  horas?: number[];
}

/** Lo que se ve al editar los días marcados. */
export interface VistaDeLosDias {
  /** «Sin Radar estos días»: `true`/`false` si los marcados coinciden, `'varia'` si no. */
  sin: boolean | 'varia';
  /** Las horas que se ven marcadas: las que tienen en común los marcados (o las elegidas). Vacía si son distintas. */
  horas: number[];
  /** Los marcados tienen horas distintas entre sí: no se marca ninguna y se dice «Estos días tienen horas distintas». */
  distintas: boolean;
}

export const MENSAJE_SIN_HORAS_EN_DIAS = 'Elige al menos una hora o marca «Sin Radar» para esos días';

const encendida = (base: MiRadarApi): MiRadarApi => ({ ...base, encendido: true });
const mismas = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((h, i) => h === b[i]);

/**
 * Lo que se ve para los días marcados, a partir de lo que tienen hoy (`base`: las horas de todos los días y los días
 * propios, con `encendido` aunque aún no se haya guardado) y de lo ya tocado. **Lo que se ve es lo que quedaría al
 * guardar** (se calcula sobre el resultado de `aplicarAlosDias`): apagar «Sin Radar» muestra las horas que seguirían.
 */
export function vistaDeLosDias(base: MiRadarApi, marcados: readonly number[], borrador: BorradorDeLosDias): VistaDeLosDias {
  // Todas las horas desmarcadas y sin «Sin Radar»: todavía no hay nada que guardar, y se ve tal cual (ninguna).
  if (borrador.sin !== true && borrador.horas !== undefined && borrador.horas.length === 0) {
    return { sin: false, horas: [], distintas: false };
  }
  const resultado: MiRadarApi = { ...encendida(base), dias: aplicarAlosDias(base, marcados, borrador) };
  const listas = marcados.map(dia => horasDelDia(resultado, dia));
  const sinRadar = marcados.map(dia => diaSinRadar(resultado, dia));
  const sin: boolean | 'varia' = sinRadar.length > 0 && sinRadar.every(Boolean) ? true : sinRadar.some(Boolean) ? 'varia' : false;
  const distintas = sin !== true && (sin === 'varia' || !listas.every(l => mismas(l, listas[0])));
  return { sin, horas: sin === true || distintas ? [] : (listas[0] ?? []), distintas };
}

/** Lo tocado no se puede guardar: quedarían días sin horas y sin haber dicho «Sin Radar». */
export function errorDeLosDias(borrador: BorradorDeLosDias): string | null {
  if (borrador.sin !== true && borrador.horas !== undefined && borrador.horas.length === 0) return MENSAJE_SIN_HORAS_EN_DIAS;
  return null;
}

/**
 * Los días con horas propias que quedan al aplicar el borrador a los marcados, ordenados por día. **Solo cuenta lo
 * tocado** y un día que queda igual que todos los días no figura (vuelve a seguirlos).
 *
 * - `sin: true` → los marcados quedan sin Radar.
 * - `horas` → los marcados quedan con esas horas (también los que iban sin Radar o con otras). Una lista vacía no es
 *   «Sin Radar» (eso es `sin: true`): es que todavía no se eligió ninguna, y no cambia nada.
 * - `sin: false` sin `horas` → los marcados que iban sin Radar vuelven a seguir a todos; los demás no cambian.
 * - Nada tocado → nada cambia.
 */
export function aplicarAlosDias(
  base: MiRadarApi,
  marcados: readonly number[],
  borrador: BorradorDeLosDias,
): DiaDeMiRadarApi[] {
  const b = encendida(base);
  const generales = horasDelDia({ ...b, dias: [] }, 1);
  const propios = new Map<number, number[]>(diasConHorasPropias(b).map(d => [d.dia, d.horas]));

  for (const dia of marcados) {
    if (borrador.sin === true) {
      propios.set(dia, []);
    } else if (borrador.horas !== undefined && borrador.horas.length > 0) {
      const elegidas = [...borrador.horas].sort((x, y) => x - y);
      if (mismas(elegidas, generales)) propios.delete(dia);
      else propios.set(dia, elegidas);
    } else if (borrador.sin === false && diaSinRadar(b, dia)) {
      propios.delete(dia);
    }
  }
  return [...propios.entries()].sort(([x], [y]) => x - y).map(([dia, horas]) => ({ dia, horas }));
}

const huellaDeLosDias = (dias: readonly DiaDeMiRadarApi[]) => dias.map(d => `${d.dia}=${d.horas.join('.')}`).join(';');

/** ¿Lo tocado cambia algo de lo que hay? Es lo que decide si aparece «Guardar horas · …». */
export function hayCambiosEnLosDias(base: MiRadarApi, marcados: readonly number[], borrador: BorradorDeLosDias): boolean {
  const actuales = diasConHorasPropias(encendida(base)).map(d => ({ dia: d.dia, horas: d.horas }));
  return huellaDeLosDias(aplicarAlosDias(base, marcados, borrador)) !== huellaDeLosDias(actuales);
}

/** «Dejar sáb como los demás días»: los días propios sin los marcados. */
export function dejarComoLosDemas(base: MiRadarApi, marcados: readonly number[]): DiaDeMiRadarApi[] {
  return diasConHorasPropias(encendida(base))
    .filter(d => !marcados.includes(d.dia))
    .map(d => ({ dia: d.dia, horas: d.horas }));
}

/** ¿Alguno de los días marcados tiene horas propias (o va sin Radar)? Solo entonces se ofrece «Dejar … como los demás días». */
export function algunDiaTienePropias(base: MiRadarApi, marcados: readonly number[]): boolean {
  const propias = diasConHorasPropias(encendida(base));
  return marcados.some(dia => propias.some(d => d.dia === dia));
}

/**
 * Lo que el chip de un día dice de las horas de ese día, o `null` si sigue las de todos. `sinAviso` (la campana tachada)
 * es «Sin Radar ese día»; la campana sola, «horas propias». `largo` es lo que oye quien usa lector de pantalla: el chip
 * no escribe las horas.
 */
export function resumenDelDiaEnLaFila(base: MiRadarApi, dia: DiaIso): { largo: string; sinAviso: boolean } | null {
  const propio = diasConHorasPropias(encendida(base)).find(d => d.dia === dia);
  if (!propio) return null;
  return propio.horas.length === 0
    ? { largo: 'Sin Radar', sinAviso: true }
    : { largo: `Horas propias: ${textoDeLasHoras(propio.horas)}`, sinAviso: false };
}

/** El botón de guardar de los días marcados: `Guardar horas · sáb, dom`, o `Guardar y encender · sáb, dom` si aún está apagado. */
export function textoDelBotonDeLosDias({
  guardando,
  frase,
  enciende,
}: {
  guardando: boolean;
  frase: string;
  enciende: boolean;
}): string {
  if (guardando) return 'Guardando…';
  return `${enciende ? 'Guardar y encender' : 'Guardar horas'} · ${frase}`;
}
