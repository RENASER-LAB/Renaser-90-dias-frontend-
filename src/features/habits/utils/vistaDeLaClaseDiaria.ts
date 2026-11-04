import type { TrackDelDiaApi } from '../types/habits.types';

/**
 * La tarjeta «Clase diaria» de Hoy (2026-11-03, pedido del dueño): una tarjeta del tamaño de «Próximo evento» que solo redirige a la clase
 * de hoy. Esta función decide, con los registros de hoy que Hoy YA lee (`GET /habit-tracks/today`, sin pedidos nuevos), si se dibuja y qué dice.
 *
 * **Cómo se reconoce la Clase diaria.** El registro del día no trae la `clave_sistema` (`DAILY_CLASS`): esa vive en el catálogo
 * (`GET /habits`), que Hoy no lee, y pedirlo solo para esto sería un pedido nuevo. Se reconoce por el `habitoId` de su plantilla de
 * catálogo, **nunca por el título** (mismo criterio que «Última comida del día»): lo sembró la migración V4 con ese id, así que es el
 * mismo en todos los entornos. En uno donde no coincida la tarjeta simplemente no se dibuja, que es lo seguro.
 *
 * **Qué dice.**
 *  - Pendiente o en curso (aunque se le haya pasado la hora: se registra durante todo su día, D-259): «Pendiente».
 *  - Cumplida: «Hecha · +8 pts» (los puntos que pagó el servidor; sin puntos, «Hecha»). Se dibuja igual en vez de esconderse: la tarjeta no
 *    salta de lugar al cumplirla, y tocarla lleva a Training, donde la clase cumplida se abre en solo lectura.
 *  - Día cerrado sin cumplir (`EXPIRADO`) o fallida: no se dibuja (no hay clase que ir a hacer; Training la muestra con candado).
 *  - Sin registro hoy (no le toca, o todavía no se lee): no se dibuja nada.
 *
 * **Título.** El nombre de la lección de hoy no viene en el registro; saberlo exigiría leer `GET /classroom/clase-diaria`, un pedido más
 * por cada vez que Hoy toma el foco. Mientras no se pida, el título es el genérico.
 */
export const ID_DE_LA_PLANTILLA_CLASE_DIARIA = 'feeea74a-d811-47a2-a175-34f2527c1d32';

export const TITULO_DE_LA_CLASE_DE_HOY = 'Tu clase de hoy';

export type VistaDeLaClaseDiaria = {
  /** El `habitoId` de la plantilla: con él Training abre la clase, igual que con el aviso del teléfono (`abrirHabitoId`). */
  habitoId: string;
  titulo: string;
  /** «Pendiente» o «Hecha · +8 pts». */
  linea: string;
  hecha: boolean;
};

/** Estados de `EstadoRegistro` en que la clase de hoy ya no se puede hacer. */
const SIN_CLASE_QUE_HACER = new Set(['FALLIDO', 'EXPIRADO']);

export function vistaDeLaClaseDiaria(tracks: readonly TrackDelDiaApi[]): VistaDeLaClaseDiaria | null {
  const track = tracks.find(t => t.habitoId === ID_DE_LA_PLANTILLA_CLASE_DIARIA);
  if (!track) return null;
  if (track.estado === 'COMPLETADO') {
    const puntos = Math.round(track.puntosOtorgados);
    return {
      habitoId: track.habitoId,
      titulo: TITULO_DE_LA_CLASE_DE_HOY,
      linea: puntos > 0 ? `Hecha · +${puntos} pts` : 'Hecha',
      hecha: true,
    };
  }
  if (SIN_CLASE_QUE_HACER.has(track.estado)) return null;
  return { habitoId: track.habitoId, titulo: TITULO_DE_LA_CLASE_DE_HOY, linea: 'Pendiente', hecha: false };
}
