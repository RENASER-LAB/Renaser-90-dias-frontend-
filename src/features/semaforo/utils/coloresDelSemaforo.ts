import type { Palette } from '../../../theme/tokens';
import type { ColorSemaforo } from '../types/semaforo.types';

/**
 * Los colores del semáforo, sacados de la paleta del tema y no escritos a mano: cambian con claro
 * y oscuro, y los literales sueltos son justo lo que se había dejado de usar (`theme/tokens.ts`,
 * el verde claro no pasaba AA sobre crema).
 *
 * La paleta no tiene amarillo. El amarillo del semáforo es el dorado, como ya hace el Pareto de
 * `objetivos/components/TarjetaAccionesDelDia.tsx` (`colorDePareto`). Se separan dos usos:
 *
 * - `relleno` — barras y puntos. Para el amarillo, `gold`: los tokens lo reservan justamente para
 *   superficies y barras.
 * - `tinta` — TEXTO. Para el amarillo, `goldInk`, que es el dorado que pasa contraste de lectura;
 *   `gold` sobre crema no llega.
 *
 * El color nunca va solo: siempre acompaña a la palabra (RL-30). Estos valores pueden cambiar sin
 * tocar ningún componente.
 */
export interface ColoresDeUnEstado {
  /** Texto y cifras. */
  tinta: string;
  /** Barras y puntos. */
  relleno: string;
  /** Fondo suave de una cápsula. */
  lavado: string;
}

export function coloresDelSemaforo(color: ColorSemaforo, c: Palette): ColoresDeUnEstado {
  switch (color) {
    case 'VERDE':
      return { tinta: c.success, relleno: c.success, lavado: c.successWash };
    case 'AMARILLO':
      return { tinta: c.goldInk, relleno: c.gold, lavado: c.goldWash };
    case 'ROJO':
      return { tinta: c.danger, relleno: c.danger, lavado: c.dangerWash };
    default:
      /* Sin datos es neutro, nunca verde: es la regla que no se negocia (D-128, D-131). */
      return { tinta: c.textSoft, relleno: c.chevron, lavado: c.divider };
  }
}
