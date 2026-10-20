import type { SonidoDeAlarma } from '../../alarmas/sonidoDeAlarma';
import {
  reglaIncumplida,
  type ClaveDeLaCombinacion,
  type CombinacionDeAlarma,
  type ReglaIncumplida,
} from '../../habits/notificaciones/utils/combinacionDeAlarma';

/**
 * La sección «Cómo suena» del editor de Planificar (spec 009): qué muestran los cuatro interruptores, qué pasa al
 * tocar cada uno y qué se guarda. Puro: no toca la pantalla ni el servidor.
 *
 * ## Cómo se arma lo que se ve
 *
 * Cada interruptor muestra lo que tienen en común los días que se están editando (sin días marcados, la combinación
 * general): encendido, apagado o «Varía» si no coinciden. Encima va lo que la persona TOCÓ en esta sesión
 * (`Tocados`), que es lo único que se guarda: igual que la hora y el aviso (008), «solo lo que toqué». Un interruptor
 * que no se tocó conserva, día por día, lo que cada día ya tenía.
 *
 * ## Las reglas, en línea y sin sorpresas
 *
 * - **Sonido y vibración no pueden quedar los dos apagados.** La pantalla deja apagar los dos para no trabar la mano,
 *   pero lo dice en una línea bajo la fila y no deja guardar (el servidor también lo rechaza con 400). Si la persona
 *   quiere silencio, para eso está «Sin aviso».
 * - **La voz necesita el sonido.** Apagar «Sonido» apaga «Voz» y la deshabilita con «La voz necesita el sonido».
 *   Encender «Voz» enciende «Sonido» (la voz es un sonido).
 * - **«Varía» al tocarlo pasa a encendido para todos.**
 */

export type EstadoDeLaFila = boolean | 'varia';
export type EstadosDeLaSeccion = Record<ClaveDeLaCombinacion, EstadoDeLaFila>;
/** Lo que la persona tocó: el valor que quedó en cada interruptor tocado. */
export type Tocados = Partial<Record<ClaveDeLaCombinacion, boolean>>;

export interface FilaDeComoSuena {
  clave: ClaveDeLaCombinacion;
  /** El rótulo, a 17 px. */
  etiqueta: string;
  /** Lo que pasa, en una línea. */
  descripcion: string;
}

/** Las cuatro filas, en este orden (research R7). */
export const FILAS_DE_COMO_SUENA: ReadonlyArray<FilaDeComoSuena> = [
  { clave: 'sonido', etiqueta: 'Sonido', descripcion: 'Suena el tono que elegiste en Yo → Alarmas' },
  { clave: 'vibracion', etiqueta: 'Vibración', descripcion: 'El teléfono vibra' },
  { clave: 'voz', etiqueta: 'Voz que dice el hábito', descripcion: 'Una voz dice el nombre del hábito' },
  { clave: 'repetir', etiqueta: 'Repetir si no la atiendo', descripcion: 'Vuelve a sonar a los 5 y a los 10 minutos' },
];

export const MENSAJE_SONIDO_O_VIBRACION =
  'Deja encendido el sonido o la vibración. Si no quieres alarma, elige «Sin aviso» en Recordatorio.';
export const MENSAJE_VOZ_NECESITA_SONIDO = 'La voz necesita el sonido';
export const MENSAJE_VOZ_DEL_TONO = 'Ya habla porque tu tono en Yo → Alarmas es «Voz»';
export const MENSAJE_TONO_SOLO_VIBRAR = 'Tu tono en Yo → Alarmas es «Solo vibrar»: elige otro para que suene';

const CLAVES: readonly ClaveDeLaCombinacion[] = ['sonido', 'vibracion', 'voz', 'repetir'];

/** Lo que tienen en común las combinaciones: cada interruptor encendido, apagado o «Varía». Sin ninguna, todo apagado. */
export function estadosIniciales(combinaciones: readonly CombinacionDeAlarma[]): EstadosDeLaSeccion {
  const estados = {} as EstadosDeLaSeccion;
  for (const clave of CLAVES) {
    const valores = new Set(combinaciones.map(c => c[clave]));
    estados[clave] = valores.size > 1 ? 'varia' : valores.has(true);
  }
  return estados;
}

/** Lo que se ve: lo común, con lo tocado encima. */
export function estadosMostrados(iniciales: EstadosDeLaSeccion, tocados: Tocados): EstadosDeLaSeccion {
  const estados = { ...iniciales };
  for (const clave of CLAVES) {
    const tocado = tocados[clave];
    if (tocado !== undefined) estados[clave] = tocado;
  }
  return estados;
}

/** «Voz» no se puede tocar sin sonido. */
export function vozDeshabilitada(mostrados: EstadosDeLaSeccion): boolean {
  return mostrados.sonido === false;
}

/**
 * Lo tocado después de un toque en `clave`. «Varía» y apagado pasan a encendido; encendido pasa a apagado.
 * Apagar el sonido apaga la voz; encender la voz enciende el sonido; la voz sin sonido no se toca.
 */
export function alTocarUnaFila(iniciales: EstadosDeLaSeccion, tocados: Tocados, clave: ClaveDeLaCombinacion): Tocados {
  const mostrados = estadosMostrados(iniciales, tocados);
  if (clave === 'voz' && vozDeshabilitada(mostrados)) return tocados;
  const nuevo = mostrados[clave] !== true;
  const siguiente: Tocados = { ...tocados, [clave]: nuevo };
  if (clave === 'sonido' && !nuevo && mostrados.voz !== false) siguiente.voz = false;
  if (clave === 'voz' && nuevo && mostrados.sonido !== true) siguiente.sonido = true;
  return siguiente;
}

/** La combinación de un día tras lo tocado: lo suyo, con los interruptores tocados encima. */
export function combinacionResultante(delDia: CombinacionDeAlarma, tocados: Tocados): CombinacionDeAlarma {
  return { ...delDia, ...tocados };
}

/** ¿Lo tocado cambia algo? Tocar un interruptor y volver a dejarlo como estaba no cuenta. */
export function hayCambios(delosDias: readonly CombinacionDeAlarma[], tocados: Tocados): boolean {
  return delosDias.some(c => CLAVES.some(k => tocados[k] !== undefined && tocados[k] !== c[k]));
}

/**
 * La primera regla que algún día incumpliría con lo tocado, o `null`. Mira el RESULTADO por día, no solo lo que se
 * ve: con «Sonido» en «Varía» y la vibración apagada, el día que no suena quedaría mudo.
 */
export function reglaIncumplidaDeLaSeleccion(
  delosDias: readonly CombinacionDeAlarma[],
  tocados: Tocados,
): ReglaIncumplida | null {
  let primera: ReglaIncumplida | null = null;
  for (const c of delosDias) {
    const regla = reglaIncumplida(combinacionResultante(c, tocados));
    if (regla === 'sinSonidoNiVibracion') return regla;
    primera ??= regla;
  }
  return primera;
}

/** Los mensajes de regla que van EN LÍNEA debajo de la fila que los causa. */
export interface MensajesEnLinea {
  /** Bajo «Vibración»: sonido y vibración apagados. */
  sonidoOVibracion: string | null;
  /** Bajo «Voz»: por qué está deshabilitada o encendida sola. */
  voz: string | null;
  /** Bajo «Sonido»: el tono de Yo → Alarmas no suena. */
  sonido: string | null;
}

export function mensajesEnLinea({
  mostrados,
  regla,
  tonoDeYo,
}: {
  mostrados: EstadosDeLaSeccion;
  regla: ReglaIncumplida | null;
  tonoDeYo: SonidoDeAlarma;
}): MensajesEnLinea {
  return {
    sonidoOVibracion: regla === 'sinSonidoNiVibracion' ? MENSAJE_SONIDO_O_VIBRACION : null,
    voz: vozDeshabilitada(mostrados)
      ? MENSAJE_VOZ_NECESITA_SONIDO
      : tonoDeYo === 'voz' && mostrados.sonido === true
        ? MENSAJE_VOZ_DEL_TONO
        : null,
    sonido: tonoDeYo === 'vibrar' && mostrados.sonido === true && mostrados.voz !== true ? MENSAJE_TONO_SOLO_VIBRAR : null,
  };
}

/** Por qué la sección va atenuada y sin tocar, o `null` si se puede usar. */
export interface MotivoDeAtenuacion {
  titulo: string;
  ayuda: string;
}

export function motivoDeAtenuacion({
  sinAviso,
  todosApagados,
  conDias,
  cuantosDias,
}: {
  /** El recordatorio que se está editando es «Sin aviso». */
  sinAviso: boolean;
  /** Todos los días marcados están apagados («no va»). */
  todosApagados: boolean;
  conDias: boolean;
  cuantosDias: number;
}): MotivoDeAtenuacion | null {
  const varios = cuantosDias > 1;
  if (conDias && todosApagados) {
    return {
      titulo: varios ? 'Esos días el hábito no va' : 'Ese día el hábito no va',
      ayuda: 'Sin hábito no hay alarma que suene.',
    };
  }
  if (sinAviso) {
    return {
      titulo: !conDias ? 'Este hábito no tiene aviso' : varios ? 'Estos días no tienen aviso' : 'Este día no tiene aviso',
      ayuda: 'Elige un aviso en Recordatorio para elegir cómo suena.',
    };
  }
  return null;
}

/** «sin sonido, vibra, se repite»: la combinación dicha para el lector de pantalla (el chip del día). */
export function resumenDeLaCombinacion(c: CombinacionDeAlarma): string {
  const partes = [c.sonido ? (c.voz ? 'con voz' : 'con sonido') : 'sin sonido', c.vibracion ? 'vibra' : 'no vibra'];
  if (c.repetir) partes.push('se repite');
  return partes.join(', ');
}
