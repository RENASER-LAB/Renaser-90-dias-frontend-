import type { DiaDelSemaforo, SemanaCerrada } from '../../types/semaforo.types';

/**
 * Lo que recibe CUALQUIER gráfico de los días de la ventana vigente. Es el contrato entre las
 * pantallas y el gráfico: mientras un reemplazo acepte estas props, ni la tarjeta de Hoy ni el
 * detalle se enteran del cambio.
 */
export interface PropsGraficoDeDias {
  /** Los 7 días, del más viejo al más nuevo, ya normalizados (`api/semaforoSchemas.ts`). */
  dias: readonly DiaDelSemaforo[];
  /** `chico`: la tarjeta de Hoy, sin rótulos. `grande`: el detalle, con % y día bajo cada barra. */
  tamano?: 'chico' | 'grande';
  /**
   * Cómo empieza lo que oye quien no ve el gráfico. Por defecto `Tus últimos N días` (el semáforo
   * propio); la vista del mentor y la de administración dicen de quién son (`Sus últimos 7 días`).
   */
  titulo?: string;
}

/** Lo que recibe cualquier gráfico de las semanas cerradas. */
export interface PropsGraficoDeSemanas {
  /** Semanas cerradas, de la más vieja a la más nueva. Vacío = el gráfico no dibuja nada. */
  semanas: readonly SemanaCerrada[];
}
