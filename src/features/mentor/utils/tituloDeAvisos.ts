/**
 * Los avisos son de todos los grupos del mentor, no del elegido en las pastillas: con varios grupos
 * el título lo dice, para que no parezca que cambiar de grupo no hizo nada (e2e 01/10).
 */
export function tituloDeAvisos(cantidad: number, variosGrupos: boolean): string {
  const base = cantidad === 1 ? '1 aviso' : `${cantidad} avisos`;
  return variosGrupos ? `${base} de todos tus grupos` : base;
}
