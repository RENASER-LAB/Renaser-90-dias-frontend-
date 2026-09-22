import type { SpiritDayApi } from './spirit.types';

/**
 * Un audio que se escucha y se responde: lo único que el modal necesita saber, venga de donde
 * venga.
 *
 * ── Por qué existe ──
 *
 * `PastillaRenacerModal` recibía un `SpiritDayApi` y leía de él el título, la URL, si ya se
 * entregó y el día. Eso lo ataba a la Pastilla diaria y a su máquina de estados
 * (`unlockedAt`, `deadlineAt`, `state`). La **Audioterapia Semanal** necesita exactamente el mismo
 * flujo —escuchar y contestar dos preguntas, que es lo que pidió D-97— pero no tiene ninguno de
 * esos campos: se identifica por SEMANA y su estado vive en el registro del hábito.
 *
 * Armar un `SpiritDayApi` falso para poder reusar el modal habría sido mentirle al tipo: campos
 * inventados que alguien después lee creyendo que significan algo. Este modelo tiene solo lo que
 * la pantalla pinta, y cada origen lo construye con su propio adaptador.
 */
export interface AudioGuiado {
  /** El rótulo chico de arriba: `PASTILLA RENASER`, `AUDIOTERAPIA SEMANAL`. */
  rotulo: string;
  /** Debajo del título: `Audio 2`, `Semana 3`. */
  subtitulo: string;
  titulo: string | null;
  /** URL ya firmada y lista para reproducir. `null` mientras no haya audio disponible. */
  audioUrl: string | null;
  yaEntregado: boolean;
  /** Lo que ya contestó, cuando `yaEntregado`. */
  resumenEntregado: string | null;
  /**
   * Con qué clave se guarda el borrador local. Distinta por origen para que el borrador de la
   * Pastilla del día 2 y el de la Audioterapia de la semana 2 no se pisen entre sí.
   */
  claveBorrador: string | number;
}

/** La Pastilla del día. El comportamiento es el mismo que antes, campo por campo. */
export function audioDeLaPastilla(dia: SpiritDayApi): AudioGuiado {
  return {
    rotulo: 'PASTILLA RENASER',
    subtitulo: `Audio ${dia.day}`,
    titulo: dia.title,
    audioUrl: dia.audioUrl,
    yaEntregado: dia.state === 'submitted',
    resumenEntregado: dia.summaryText,
    claveBorrador: dia.day,
  };
}

/**
 * La Audioterapia de la semana.
 *
 * `yaEntregado` NO sale de acá: la Audioterapia se cierra por el camino genérico de evidencia del
 * hábito, así que quién sabe si ya se entregó es el registro del día, y lo pasa quien llama.
 */
export function audioDeLaAudioterapia(
  semana: number,
  titulo: string,
  url: string,
  yaEntregado: boolean
): AudioGuiado {
  return {
    rotulo: 'AUDIOTERAPIA SEMANAL',
    subtitulo: `Semana ${semana}`,
    titulo,
    audioUrl: url,
    yaEntregado,
    resumenEntregado: null,
    claveBorrador: `semana-${semana}`,
  };
}
