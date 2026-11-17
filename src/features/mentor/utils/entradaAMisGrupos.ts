/**
 * Por dónde entra el mentor a sus grupos (spec 055 FR-001 y FR-002): con uno solo, directo a «Mi grupo»; con dos o más, por
 * «Mis grupos». Lo preguntan las dos entradas (la fila de Yo y la de Comunidad → Tribu) y el atrás de «Mi grupo», para que
 * nunca lleven a la lista cuando la lista tiene una sola fila.
 */
export function hayVariosGrupos(cantidadDeGrupos: number): boolean {
  return cantidadDeGrupos > 1;
}

export type EntradaAMisGrupos = 'misGrupos' | 'miGrupo';

export function entradaAMisGrupos(cantidadDeGrupos: number): EntradaAMisGrupos {
  return hayVariosGrupos(cantidadDeGrupos) ? 'misGrupos' : 'miGrupo';
}

/** «N aprendices» (o «1 aprendiz»), el texto de la derecha en «Mis grupos» y en el título de «Mi grupo». */
export function cantidadDeAprendices(n: number): string {
  return `${n} ${n === 1 ? 'aprendiz' : 'aprendices'}`;
}
