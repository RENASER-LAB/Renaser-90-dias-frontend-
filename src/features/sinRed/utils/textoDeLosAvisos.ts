import type { AvisoDeLoNoAplicado } from '../avisosDeLoNoAplicado';

/**
 * Spec 048, fase 3 (P9): los textos de la hoja de lo que no se aplicó y del globo del ícono de conexión. Lógica pura, en tuteo.
 */
export function noSeAplico(avisos: readonly Pick<AvisoDeLoNoAplicado, 'tipo'>[]): number {
  return avisos.filter(a => a.tipo !== 'sin-puntos').length;
}

export function sinPuntos(avisos: readonly Pick<AvisoDeLoNoAplicado, 'tipo'>[]): number {
  return avisos.filter(a => a.tipo === 'sin-puntos').length;
}

/** «1 cosa no se aplicó», «2 cosas no se aplicaron», «1 cosa quedó sin puntos»; `null` si no hay avisos. */
export function textoDeLosAvisosDelGlobo(avisos: readonly Pick<AvisoDeLoNoAplicado, 'tipo'>[]): string | null {
  const no = noSeAplico(avisos);
  const sin = sinPuntos(avisos);
  const partes: string[] = [];
  if (no > 0) partes.push(no === 1 ? '1 cosa no se aplicó' : `${no} cosas no se aplicaron`);
  if (sin > 0) partes.push(sin === 1 ? '1 cosa quedó sin puntos' : `${sin} cosas quedaron sin puntos`);
  return partes.length ? partes.join(' · ') : null;
}

/** El título de la hoja: dice lo más grave que hay. */
export function tituloDeLaHoja(avisos: readonly Pick<AvisoDeLoNoAplicado, 'tipo'>[]): string {
  const no = noSeAplico(avisos);
  if (no === 0) return 'Quedó sin puntos';
  return 'Esto no se aplicó';
}

/** «Lo hiciste hoy a las 21:40» / «Lo hiciste el 9/11 a las 21:40» (hora del teléfono, 24 h). */
export function cuandoLoHiciste(hechoEn: string, ahora: Date = new Date()): string {
  const d = new Date(hechoEn);
  if (Number.isNaN(d.getTime())) return 'Lo hiciste sin conexión';
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dia = d.toDateString() === ahora.toDateString() ? 'hoy' : `el ${d.getDate()}/${d.getMonth() + 1}`;
  return `Lo hiciste ${dia} a las ${hora}`;
}
