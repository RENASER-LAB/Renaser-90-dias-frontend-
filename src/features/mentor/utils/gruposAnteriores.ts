import type { GrupoAnterior } from '../types/mentor.types';

/**
 * Cómo se lee un grupo anterior en «Mis grupos» (spec 057 FR-020): período, cómo cerró y la cantidad. Todo sale de lo que mandó el
 * servidor; lo que falta se calla en vez de inventarse (nunca un puesto ni un 0 % de relleno).
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-03-02` → `mar 2026`; lo que no entiende, `null`. */
function mesYAnio(fecha: string | null): string | null {
  const m = fecha?.match(/^(\d{4})-(\d{2})/);
  const nombre = m ? MESES[Number(m[2]) - 1] : undefined;
  return m && nombre ? `${nombre} ${m[1]}` : null;
}

/** «mar 2026 – jun 2026»; sin fin, «desde mar 2026»; sin inicio, «hasta jun 2026»; sin nada, `null`. */
export function periodoDelGrupoAnterior(g: Pick<GrupoAnterior, 'desde' | 'hasta'>): string | null {
  const desde = mesYAnio(g.desde);
  const hasta = mesYAnio(g.hasta);
  if (desde && hasta) return desde === hasta ? desde : `${desde} – ${hasta}`;
  if (desde) return `desde ${desde}`;
  if (hasta) return `hasta ${hasta}`;
  return null;
}

/** «Cerró en el puesto 2 de 7 · 84 %»; sin puesto ni porcentaje, `null`. */
export function comoCerroElGrupo(g: Pick<GrupoAnterior, 'puestoFinal' | 'porcentajeFinal'>): string | null {
  const partes = [
    g.puestoFinal ? `Cerró en el puesto ${g.puestoFinal.posicion} de ${g.puestoFinal.total}` : null,
    g.porcentajeFinal === null ? null : `${Math.round(g.porcentajeFinal)} %`,
  ].filter((p): p is string => p !== null);
  return partes.length > 0 ? partes.join(' · ') : null;
}

/** La palabra del color final: el color solo no basta, siempre lo acompaña una palabra. Sin datos no se nombra. */
export function palabraDelColor(color: GrupoAnterior['colorFinal']): string | null {
  switch (color) {
    case 'VERDE':
      return 'verde';
    case 'AMARILLO':
      return 'ámbar';
    case 'ROJO':
      return 'rojo';
    default:
      return null;
  }
}
