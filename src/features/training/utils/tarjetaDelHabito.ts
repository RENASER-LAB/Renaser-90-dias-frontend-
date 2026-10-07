import type { IconName } from '../../../components/Icon';

/**
 * Lo que dice la tarjeta de un hábito en Training (rediseño de Training, 2026-10-05).
 *
 * Sin React ni red: lo prueba `__tests__/tarjetaDelHabito.test.ts` y lo dibuja `TrainingScreen`.
 */

/** Lo mínimo de un hábito de Training que hace falta acá (un `HabitItem`). */
export interface HabitoDeLaTarjeta {
  done: boolean;
  hasEvidence: boolean;
  systemKey?: string | null;
  respuestaTexto?: string | null;
  completadoEn?: string | null;
  puntosOtorgados?: number | null;
}

export interface AccionDeLaTarjeta {
  icono: IconName;
  /** Una palabra, en tipo oración: va debajo del ícono en un botón de 72 px. */
  etiqueta: string;
}

/**
 * El botón de la derecha de la tarjeta: el ícono dice LO QUE PASA al tocarlo, no siempre una cámara.
 *
 * Antes era una cámara con «SUBIR» en todos, y en la Pastilla se escucha un audio, en la Clase
 * diaria se va a la lección y en el post diario se publica en el Muro. Sale de las mismas ramas de
 * `openEvidenceModal` (por `clave_sistema`, nunca por título).
 *
 * **Despertar y Dormir se quedan con «Subir» y la cámara** (decisión del dueño, 2026-10-05): ese
 * botón registra la hora al instante y así se queda —«los usuarios pueden trabajar de noche»—.
 */
export function accionDeLaTarjeta(h: HabitoDeLaTarjeta): AccionDeLaTarjeta {
  if (h.done || h.hasEvidence) return { icono: 'eye', etiqueta: 'Ver' };
  switch (h.systemKey) {
    case 'PASTILLA_RENACER':
    case 'AUDIO_THERAPY_WEEKLY':
      return { icono: 'headphones', etiqueta: 'Escuchar' };
    case 'DAILY_CLASS':
      return { icono: 'bookOpen', etiqueta: 'Clase' };
    case 'COMMUNITY_POST':
      return { icono: 'newspaper', etiqueta: 'Publicar' };
    default:
      return { icono: 'camera', etiqueta: 'Subir' };
  }
}

/**
 * Los hábitos cuyo cumplido NO se muestra en la tarjeta, porque ya tienen dónde releerse en solo
 * lectura: la Pastilla abre su audio con la respuesta, la Clase diaria su resumen. La Audioterapia
 * no: su ventana siempre abre el formulario (no sabe que ya se entregó), así que va en la tarjeta.
 */
const SE_RELEEN_EN_SU_VENTANA: ReadonlySet<string> = new Set(['PASTILLA_RENACER', 'DAILY_CLASS']);

/**
 * `true` = tocar este hábito ya cumplido despliega su estado en la misma tarjeta (decisión del dueño
 * del 2026-10-05), en vez del diálogo «Ya está cumplido» de antes —o, en la Audioterapia y el post
 * diario, de volver a abrir el formulario o el Muro—.
 */
export function muestraElCumplidoEnLaTarjeta(h: HabitoDeLaTarjeta): boolean {
  return h.done && !(h.systemKey && SE_RELEEN_EN_SU_VENTANA.has(h.systemKey));
}

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

/** `HH:mm` en la hora del teléfono, o `null` si el instante no se puede leer. */
export function horaLocal(instanteIso: string | null | undefined): string | null {
  if (!instanteIso) return null;
  const fecha = new Date(instanteIso);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
}

/**
 * Lo que se lee al desplegar un hábito cumplido: «Cumplido a las 06:12 · +8 pts» y lo que escribió.
 *
 * La hora y los puntos son los del SERVIDOR (`completadoEn`, `puntosOtorgados` del registro). Si
 * no vienen, no se inventan: «Cumplido» a secas. Los puntos, solo si pagó algo.
 */
export function detalleDelCumplido(h: HabitoDeLaTarjeta): { linea: string; escrito: string | null } {
  const hora = horaLocal(h.completadoEn);
  const puntos = typeof h.puntosOtorgados === 'number' && h.puntosOtorgados > 0 ? ` · +${h.puntosOtorgados} pts` : '';
  const escrito = h.respuestaTexto?.trim() || null;
  return { linea: `Cumplido${hora ? ` a las ${hora}` : ''}${puntos}`, escrito };
}

/**
 * El aviso al entregar una evidencia (decisión del dueño, 2026-10-05): «Evidencia entregada» y los
 * puntos SOLO si la respuesta del backend los trae. Nada de «+10» calculado acá.
 */
export function avisoDeEvidenciaEntregada(puntosOtorgados: number | null | undefined): string {
  return typeof puntosOtorgados === 'number' && puntosOtorgados > 0
    ? `Evidencia entregada · +${puntosOtorgados} pts`
    : 'Evidencia entregada';
}

/**
 * Las secciones del detalle de una dimensión. «Guías y audios» se esconde mientras no tenga
 * contenido (decisión del dueño, 2026-10-05): hoy no hay de dónde sacarlo en ninguna de las cinco,
 * así que solo queda la lista de hábitos y no se dibuja el selector. Vuelve sola cuando haya guías.
 */
export type SeccionDeLaDimension = 'habitos' | 'guias';
export function seccionesDeLaDimension(cantidadDeGuias: number): SeccionDeLaDimension[] {
  return cantidadDeGuias > 0 ? ['habitos', 'guias'] : ['habitos'];
}

/** Lo que mira {@link avisoDeHoraPasada}: el estado crudo y los puntos/plazo que manda el servidor. */
export interface HabitoConPlazo {
  done: boolean;
  estado?: string;
  pointsAtStake?: number | null;
  maxPoints?: number | null;
  deadline?: string | null;
}

/**
 * La línea de un hábito pendiente al que ya se le pasó la hora (regla del dueño, 2026-10-06: «un hábito se
 * puede registrar durante su día aunque se le haya pasado la hora: vencer la hora solo afecta los puntos»).
 *
 * - Pasado su `deadline` (el `plazoEvidencia` del servidor): «Todavía puedes registrarlo hoy, sin puntos».
 * - Antes, si el servidor ya paga menos que el máximo (los 10 minutos de gracia): «…, con menos puntos».
 * - Si no, nada: a tiempo o en la extensión, que paga completo.
 *
 * Los puntos no se calculan acá (la escala es del servidor); el reloj sí, porque `pointsAtStake` se leyó al
 * cargar la pantalla y el plazo puede pasar con la pantalla abierta. Sin `deadline` el hábito no vence en el día.
 */
export function avisoDeHoraPasada(h: HabitoConPlazo, ahoraMs: number): string | null {
  if (h.done || (h.estado !== 'PENDIENTE' && h.estado !== 'EN_CURSO') || !h.deadline) return null;
  const plazo = Date.parse(h.deadline);
  if (Number.isFinite(plazo) && plazo <= ahoraMs) return 'Todavía puedes registrarlo hoy, sin puntos';
  if (h.pointsAtStake === 0) return 'Todavía puedes registrarlo hoy, sin puntos';
  if (typeof h.pointsAtStake === 'number' && typeof h.maxPoints === 'number' && h.pointsAtStake < h.maxPoints) {
    return 'Todavía puedes registrarlo hoy, con menos puntos';
  }
  return null;
}
