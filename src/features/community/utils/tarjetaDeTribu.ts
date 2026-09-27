import type { CelulaDelAprendiz, MiCelulaInfo } from '../types/community.types';

/**
 * Qué muestra la tarjeta «Tu tribu» de Comunidad → Tribu, y de dónde saca a su gente.
 *
 * **El bug (2026-09-26, captura del dueño).** Un mentor que lidera «Grupo Fénix (prueba)» con dos
 * aprendices entraba a Tribu y leía «Todavía no tienes un mentor asignado» y «Todavía no tienes
 * integrantes en tu grupo», justo debajo de la entrada «Grupo Fénix (prueba) · 2 aprendices». La
 * tarjeta se armaba SOLO con `GET /me/cell` y `/me/cell/members`, que responden «¿de qué grupo soy
 * APRENDIZ?» (salen de `participantes_programa`): a un mentor, que no es participante de su grupo,
 * le contestan `{assigned:false}` y `[]`. No faltaba ningún dato en el servidor: `GET /me/cells`
 * ya incluye los grupos que la persona acompaña como mentor (D-142) y
 * `GET /me/cells/{id}/members` deja pasar al mentor de ese grupo.
 *
 * **La regla ahora:**
 * - Quien es aprendiz de un grupo (`/me/cell` asignado) ve ese grupo, como siempre.
 * - Si no, la tarjeta usa sus grupos de `/me/cells` (el que elija, o el primero) y los integrantes
 *   de ESE grupo.
 * - El bloque del mentor («Todavía no tienes un mentor asignado») es cosa de aprendices: a quien
 *   no lo es (mentor, staff) no se le muestra.
 */
export type GrupoDeLaTarjeta =
  /** Todavía no se sabe: `/me/cell` o `/me/cells` siguen cargando. */
  | { fuente: 'cargando' }
  /** Aprendiz con grupo: `/me/cell` y `/me/cell/members`, lo de siempre. */
  | { fuente: 'mi-celula' }
  /** Sin grupo como aprendiz, pero en grupos de `/me/cells` (un mentor, o un alta adicional). */
  | { fuente: 'mis-grupos'; celula: CelulaDelAprendiz }
  | { fuente: 'ninguno' };

export type TarjetaDeTribu = {
  mostrarMentor: boolean;
  grupo: GrupoDeLaTarjeta;
};

/** Sin rol conocido se trata como aprendiz: es el caso de casi todo el padrón y el de antes. */
export function esAprendiz(rol: string | null | undefined): boolean {
  return !rol || rol.toUpperCase() === 'TRAINEE';
}

export function decidirTarjetaDeTribu(params: {
  rol: string | null | undefined;
  miCelula: MiCelulaInfo | null;
  grupos: readonly CelulaDelAprendiz[];
  gruposCargando: boolean;
  /** El grupo que la persona eligió en la tarjeta, si tiene más de uno. */
  grupoElegidoId?: string | null;
}): TarjetaDeTribu {
  const { rol, miCelula, grupos, gruposCargando, grupoElegidoId } = params;
  if (miCelula?.assigned === true) {
    return { mostrarMentor: true, grupo: { fuente: 'mi-celula' } };
  }
  const aprendiz = esAprendiz(rol);
  const elegido = grupos.find(g => g.cellId === grupoElegidoId) ?? grupos[0];
  if (elegido) {
    return { mostrarMentor: aprendiz, grupo: { fuente: 'mis-grupos', celula: elegido } };
  }
  if (miCelula === null || gruposCargando) {
    return { mostrarMentor: aprendiz, grupo: { fuente: 'cargando' } };
  }
  return { mostrarMentor: aprendiz, grupo: { fuente: 'ninguno' } };
}
