/**
 * Tipos del módulo "Espíritu" del backend (`EspirituController`, rutas `/api/v1/spirit-audio/*`).
 *
 * Wire en **camelCase** — Spring Boot 4 / Jackson 3 serializa así (mismo criterio y misma
 * advertencia que `features/habits/types/habits.types.ts`: no "corregir" esto a snake_case
 * leyendo un DTO viejo).
 *
 * ## El número de día NO es el día de programa
 *
 * `SpiritDayApi.day` es el **día de audio** (1..90), no el día del programa. La equivalencia la
 * fija el backend en un solo lugar (`EspirituService.AUDIO_UNLOCK_START_DAY = 7`):
 *
 *     díaDeAudio = díaDePrograma − 7      →  día de programa 8 = audio 1
 *
 * Por eso "la Pastilla Renacer sale el día 8": es el primer día de programa en el que existe un
 * audio que escuchar. El móvil **nunca** hace esa cuenta ni manda un día de programa: pide el
 * estado y usa el `currentDay` que le responde el servidor.
 */

/** Los cuatro estados del contrato (`SpiritDayView.state` del backend viejo, preservados literal). */
export type EstadoDiaEspiritu = 'locked' | 'current' | 'submitted' | 'missed';

export interface SpiritDayApi {
  /** Día de AUDIO (1..90). Ver el encabezado de este archivo: no es el día de programa. */
  day: number;
  title: string | null;
  state: EstadoDiaEspiritu;
  unlockedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  /** Lo que la persona ya entregó, si entregó. Es la respuesta a "qué interpretaste del audio". */
  summaryText: string | null;
  /**
   * URL **ya firmada** y lista para reproducir. El backend solo la resuelve para el día
   * `current` — es el único que se puede escuchar y entregar.
   *
   * Puede venir `null` aunque el día esté en curso: significa que el archivo de ese día todavía
   * no está publicado en el bucket (`audios_espiritu.ruta_storage` en NULL). En ese caso hay que
   * mostrar el día y el formulario **sin reproductor**, nunca romper.
   *
   * La firma vence en 1 hora: no guardarla en disco ni cachearla entre sesiones, se pide de nuevo.
   */
  audioUrl: string | null;
  /** Tipo de contenido del archivo (`audio/mpeg` en todo el catálogo actual). */
  audioMimeType: string | null;
  /** Peso del archivo en bytes, para poder avisar antes de bajar con datos móviles. */
  audioSizeBytes: number | null;
}

export interface SpiritStatusApi {
  days: SpiritDayApi[];
  /** El día de audio en curso, o `null` si la persona todavía no llegó al día 8 del programa. */
  currentDay: number | null;
}

export interface SubmitSpiritSummaryApi {
  /** `false` si entregó pasado el mediodía: se guarda igual, pero el día no cuenta como cumplido. */
  onTime: boolean;
}
