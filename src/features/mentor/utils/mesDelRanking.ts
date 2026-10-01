/**
 * Qué mes pide el ranking de grupos: el que corre o el anterior (pedido del dueño, 2026-10-01: ver
 * cómo terminó el mes pasado). `YYYY-MM`, que es lo que acepta `GET /api/v1/ranking/groups`.
 *
 * Se arma con el reloj del teléfono, igual que la evaluación: es «qué mes quiero mirar», una
 * intención de quien mira. Qué días caen dentro de ese mes lo decide el servidor en la zona de la
 * cohorte.
 */
export type MesDelRanking = 'actual' | 'anterior';

export function mesDelRanking(ahora: Date, cual: MesDelRanking): string {
  // Día 1 a propósito: restarle un mes al 31 de marzo daría «31 de febrero» y saltaría a marzo.
  const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (cual === 'anterior' ? 1 : 0), 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}
