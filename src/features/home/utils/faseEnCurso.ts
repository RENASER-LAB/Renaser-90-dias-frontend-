import { FASES_EN_ORDEN, type ClaveDeFase, type FaseDelPrograma } from '../hooks/useResumenHome';

export interface DiasDeLaFase {
  /** El día dentro de la fase, desde 1. */
  dia: number;
  /** Cuántos días tiene la fase. */
  total: number;
}

export interface FaseEnCurso extends FaseDelPrograma {
  clave: ClaveDeFase;
  /** «Día 23 de 27 de esta fase». `null` sin día conocido. */
  diasDeLaFase: DiasDeLaFase | null;
}

/**
 * La fase en la que está alguien, **lo único que Plan y Yo leen para decirla** (2026-10-06, pedido del
 * dueño: «En Yo las fases deben ser iguales que en Plan»). Plan la usa para «Fase actual» y para marcar
 * el tramo en curso de «Arquitectura de tiempo»; Yo, para su tarjeta de fase. Así el número, el nombre,
 * el rango («Días 8–34») y el día dentro de la fase salen de una sola cuenta.
 *
 * - **Cuál es la fase lo dice el backend** (`fase` de `GET /api/v1/home`, `users.api.FasePrograma`); acá
 *   no se decide con el día. Con una clave que la app no conoce, o sin respuesta, devuelve `null`: mejor
 *   no dibujar que inventar.
 * - **Los cortes** son los de `FASES_EN_ORDEN`, la única tabla de fases de la app.
 * - **El día dentro de la fase** se acota a la fase: un ajuste de días no desborda la barra.
 *
 * > Antes Yo hacía esta cuenta aparte (`yo/utils/diasDeLaFase.ts`) y Plan la suya
 * > (`descripcionDeFase` + `arquitecturaDeTiempo`); daban lo mismo, pero eran dos.
 */
export function faseEnCurso(faseDelBackend: string | null | undefined, diaDelPrograma: number | null | undefined): FaseEnCurso | null {
  const fase = FASES_EN_ORDEN.find(f => f.clave === faseDelBackend);
  if (!fase) return null;
  return { ...fase, diasDeLaFase: diasDentroDeLaFase(fase, diaDelPrograma) };
}

function diasDentroDeLaFase(fase: FaseDelPrograma, diaDelPrograma: number | null | undefined): DiasDeLaFase | null {
  if (diaDelPrograma == null || !Number.isFinite(diaDelPrograma)) return null;
  const total = fase.ultimoDia - fase.primerDia + 1;
  const dia = Math.min(total, Math.max(1, diaDelPrograma - fase.primerDia + 1));
  return { dia, total };
}
