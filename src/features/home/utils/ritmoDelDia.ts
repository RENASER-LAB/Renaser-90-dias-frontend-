/**
 * A qué ritmo va el día del aprendiz.
 *
 * Decisión pura: recibe lo que ya se hizo hoy y devuelve a qué velocidad debe moverse la partícula
 * del hero de Hoy y qué mensaje acompaña. No sabe de animaciones ni de pantallas.
 *
 * ## Por qué hábitos y roca, y NO coherencia ni racha
 *
 * Era la pregunta importante y se verificó antes de escribir esto. `GET /api/v1/home` devuelve
 * cuatro señales candidatas, y sólo dos se mueven:
 *
 * | Señal | ¿Sirve? |
 * |---|---|
 * | `habitosHoy.completados / total` | **Sí.** Cambia cada día, con lo que la persona hace |
 * | Roca prioritaria completada | **Sí.** Ídem |
 * | `coherencia` | **No.** `RegistrarCoherenciaDiariaUseCase` no tiene un solo llamador en el backend: `historial_coherencia` está vacía. Además el móvil hace `?? 100`, así que le diría "vas perfecto" a alguien que no hizo nada |
 * | `rachaActual` | **No.** No avanza, por el mismo hueco |
 *
 * Atar la animación a coherencia o racha daría una partícula preciosa que **miente**: idéntica
 * para quien cumplió todo y para quien abandonó. Una animación que no distingue no informa, y
 * felicitar a alguien que no hizo nada es exactamente lo contrario del método (*"no se maquilla"*).
 *
 * El día que el backend calcule coherencia de verdad, se cambia el cálculo de `progreso` acá y
 * nada más: la animación no conoce de dónde sale el número.
 */

export type Ritmo = 'detenido' | 'lento' | 'rapido';

export interface EstadoDelDia {
  /** Hábitos marcados hoy. */
  habitosCompletados: number;
  /** Hábitos que tocaban hoy. `0` si todavía no hay plan del día. */
  habitosTotal: number;
  /** `null` si la persona no definió su roca prioritaria. */
  rocaCompletada: boolean | null;
}

export interface RitmoDelDia {
  ritmo: Ritmo;
  /** 0 a 1. Sirve para la barra y para la velocidad. */
  progreso: number;
  /**
   * El texto que acompaña a la partícula.
   *
   * **Copy provisional, a confirmar con el dueño del producto.** No sale de ningún documento del
   * método, así que está acá —en un solo lugar y en una sola función— para que cambiarlo sea una
   * línea. Lo único que respeta por diseño es el principio de la guía de confrontación: el estado
   * "no arrancaste" **no culpa ni castiga**, sólo nombra el hecho.
   */
  mensaje: string;
}

/** Sin nada que hacer todavía: ni plan del día ni roca. No es "va mal", es "no empezó". */
const SIN_DATOS: RitmoDelDia = { ritmo: 'detenido', progreso: 0, mensaje: 'Tu día todavía no tiene plan.' };

export function ritmoDelDia(estado: EstadoDelDia): RitmoDelDia {
  const hayRoca = estado.rocaCompletada !== null;
  const totales = Math.max(0, estado.habitosTotal) + (hayRoca ? 1 : 0);

  if (totales === 0) return SIN_DATOS;

  const hechas =
    Math.min(Math.max(0, estado.habitosCompletados), Math.max(0, estado.habitosTotal)) +
    (estado.rocaCompletada === true ? 1 : 0);
  const progreso = Math.min(1, hechas / totales);

  if (progreso >= 1) {
    return { ritmo: 'rapido', progreso: 1, mensaje: 'Día completo. Seguí así.' };
  }
  if (progreso > 0) {
    return { ritmo: 'lento', progreso, mensaje: 'Vas en movimiento. Seguí así.' };
  }
  return { ritmo: 'detenido', progreso: 0, mensaje: 'Todavía no arrancaste el día.' };
}
