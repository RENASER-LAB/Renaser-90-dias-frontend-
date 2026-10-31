import type { EjeObjetivo, RocaDiariaApi, RocaMaestraApi, RocaSemanalApi } from '../types/objetivos.types';
import { primeraClausula } from './cifraDelObjetivo';

/**
 * La «Meta» de una acción del día: el objetivo al que pertenece (2026-10-31, tarjeta de acciones de Hoy).
 *
 *  1. **El objetivo de la semana** de esa acción: el que la enlaza (`rocaSemanalId`) y, si la acción no lo trae, el de su eje
 *     (la roca semanal cuya maestra es de ese eje).
 *  2. **Si no hay semana**, la primera cláusula del objetivo de 90 días de su eje (`primeraClausula`, la misma que Plan).
 *  3. Si tampoco hay objetivo, `null`: la línea «Meta: …» no se dibuja.
 *
 * Lógica pura; los datos los lee `useMetaDeLaAccion`.
 */
export function metaDeLaAccion(
  accion: Pick<RocaDiariaApi, 'eje' | 'rocaSemanalId'>,
  semanales: readonly Pick<RocaSemanalApi, 'id' | 'rocaMaestraId' | 'titulo'>[],
  maestras: readonly Pick<RocaMaestraApi, 'id' | 'eje' | 'objetivo'>[],
): string | null {
  const delEje = (eje: EjeObjetivo) => maestras.find(m => m.eje === eje) ?? null;

  const enlazada = accion.rocaSemanalId ? semanales.find(s => s.id === accion.rocaSemanalId) : undefined;
  const maestraDelEje = delEje(accion.eje);
  const semanal = enlazada ?? (maestraDelEje ? semanales.find(s => s.rocaMaestraId === maestraDelEje.id) : undefined);

  const deLaSemana = limpio(semanal?.titulo);
  if (deLaSemana) return deLaSemana;

  const objetivo = limpio(maestraDelEje?.objetivo);
  return objetivo ? primeraClausula(objetivo) : null;
}

function limpio(texto: string | null | undefined): string | null {
  const t = texto?.replace(/\s+/g, ' ').trim();
  return t ? t : null;
}
