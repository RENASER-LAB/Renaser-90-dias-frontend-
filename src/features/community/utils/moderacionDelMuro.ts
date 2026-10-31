import * as wallApi from '../api/wallApi';
import type { PostItem } from '../../../screens/ComunidadScreen';

/**
 * Moderar el Muro (pedido del dueño, 2026-10-31: «una función para Administrador y Alquimista para eliminar
 * publicaciones, que solo les salga a estos roles»; eligió «Ocultar y eliminar»). Todo lo que decide, sin React:
 * quién ve el «…», cómo se clasifica un fallo, los textos y el orden de los pedidos.
 *
 * **Esto decide qué se MUESTRA, nunca qué se puede hacer:** el servidor vuelve a autorizar cada llamada
 * (`MODERATE_WALL`, solo ADMIN y ALCHEMIST); un rol falseado en el teléfono ve un «…» que termina en 403.
 */

export const SIN_PERMISO_PARA_MODERAR = 'No tienes permiso para moderar el Muro.';
export const TITULO_DE_ELIMINAR = '¿Eliminar esta publicación para siempre?';
export const MENSAJE_DE_ELIMINAR = 'También se borran sus comentarios, reacciones y fotos. No se puede deshacer.';
export const BOTON_ELIMINAR = 'Eliminar para siempre';

export const AVISO_OCULTA = 'Publicación oculta';
export const AVISO_ELIMINADA = 'Publicación eliminada';
export const AVISO_DEVUELTA = 'Publicación devuelta al Muro';

const MODERAN: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST']);

/**
 * ¿Se le ofrece a esta cuenta el «…» de moderación? Solo ADMIN y ALCHEMIST, y solo si además el servidor lo dice
 * (`canAdminister` de `GET /mentor/context`, la misma condición que muestra Administración y que `MODERATE_WALL`):
 * los dos tienen que coincidir. Ni el líder, ni el mentor, ni el aprendiz —ni el AUTOR de la publicación— lo ven:
 * quien la escribió ya puede ocultar la suya por otro camino y esta herramienta es de quien modera.
 */
export function puedeModerarElMuro(params: { rol: string | null | undefined; administrar: boolean }): boolean {
  return params.administrar === true && rolModeraElMuro(params.rol);
}

/** ¿El rol es de los que moderan (ADMIN o ALCHEMIST)? Primera mitad de {@link puedeModerarElMuro}, sin preguntarle al servidor. */
export function rolModeraElMuro(rol: string | null | undefined): boolean {
  return !!rol && MODERAN.has(rol.trim().toUpperCase());
}

/** Qué le pasó a un pedido de moderación: lo único que las pantallas necesitan distinguir. */
export type FalloDeModeracion = 'sin_permiso' | 'no_existe' | 'otro';

/** 403 → sin permiso; 404 → la publicación ya no está (o ya no está donde se la buscaba); lo demás, "otro". */
export function clasificarFallo(error: unknown): FalloDeModeracion {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 403) return 'sin_permiso';
  if (status === 404) return 'no_existe';
  return 'otro';
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «30 de octubre, 21:04» —el día y la hora de la publicación en la hora del teléfono—. Se arma con la fecha LOCAL: una
 * publicación de las 9 de la noche en Lima ya es del día siguiente en UTC, y mostrar el día del texto ISO la fecharía
 * un día después. Una fecha ilegible no dice nada (cadena vacía).
 */
export function fechaDeLaPublicacion(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}, ${hora}`;
}

/** Por qué no se pudo leer la cola de ocultas: sin permiso (403), sin conexión (status 0) o cualquier otro. */
export type FalloDeLecturaDeOcultas = 'sin_permiso' | 'sin_red' | 'error';

export function clasificarLecturaDeOcultas(error: unknown): FalloDeLecturaDeOcultas {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 403) return 'sin_permiso';
  if (status === 0) return 'sin_red';
  return 'error';
}

/**
 * Cómo terminó una moderación.
 * - `hecho`: el servidor la aplicó.
 * - `ya_no_esta`: un 404 —la publicación ya no existe o ya no está donde se la buscaba—: se saca de la lista sin
 *   error y sin anunciar nada.
 * - `sin_permiso` / `fallo`: no se pudo. `quedoOculta` dice que, en una eliminación desde el Muro, el primer paso
 *   (ocultar) sí se hizo: la publicación ya no está a la vista aunque no se haya borrado.
 */
export type ResultadoDeModeracion =
  | { tipo: 'hecho' }
  | { tipo: 'ya_no_esta' }
  | { tipo: 'sin_permiso'; quedoOculta: boolean }
  | { tipo: 'fallo'; error: unknown; quedoOculta: boolean };

function resultadoDeUnFallo(error: unknown, quedoOculta: boolean): ResultadoDeModeracion {
  const fallo = clasificarFallo(error);
  if (fallo === 'no_existe') return { tipo: 'ya_no_esta' };
  if (fallo === 'sin_permiso') return { tipo: 'sin_permiso', quedoOculta };
  return { tipo: 'fallo', error, quedoOculta };
}

/** «Ocultar publicación» (`DELETE /wall/{id}`). */
export async function ocultarEnElMuro(postId: string): Promise<ResultadoDeModeracion> {
  try {
    await wallApi.ocultarPublicacion(postId);
    return { tipo: 'hecho' };
  } catch (error) {
    return resultadoDeUnFallo(error, false);
  }
}

/**
 * «Eliminar para siempre» desde una publicación VISIBLE del Muro. El servidor solo borra de verdad lo que ya está
 * oculto (sobre una visible, `DELETE /wall/{id}/permanent` responde 404), así que son dos pedidos en orden: ocultar y
 * borrar. Un 404 al ocultar no corta —puede que otra cuenta ya la haya ocultado—: se intenta borrar igual, y si
 * tampoco está, `ya_no_esta`. Si el primer paso se hizo y el segundo falla, `quedoOculta` es `true`: la publicación
 * ya salió del Muro y se puede terminar de borrar desde Administración → Publicaciones ocultas.
 */
export async function eliminarDesdeElMuro(postId: string): Promise<ResultadoDeModeracion> {
  try {
    await wallApi.ocultarPublicacion(postId);
  } catch (error) {
    if (clasificarFallo(error) !== 'no_existe') return resultadoDeUnFallo(error, false);
  }
  return eliminarDeLaCola(postId, true);
}

/** «Eliminar para siempre» desde la cola de ocultas (`DELETE /wall/{id}/permanent`). */
export async function eliminarDeLaCola(postId: string, quedoOculta = true): Promise<ResultadoDeModeracion> {
  try {
    await wallApi.eliminarPublicacionParaSiempre(postId);
    return { tipo: 'hecho' };
  } catch (error) {
    return resultadoDeUnFallo(error, quedoOculta);
  }
}

/** «Devolver al Muro» (`POST /wall/{id}/restore`). */
export async function devolverAlMuro(postId: string): Promise<ResultadoDeModeracion> {
  try {
    await wallApi.restaurarPublicacion(postId);
    return { tipo: 'hecho' };
  } catch (error) {
    return resultadoDeUnFallo(error, true);
  }
}

/**
 * La primera página del Muro, releída en silencio, sobre lo que ya estaba (después de moderar).
 *
 * `recargar` reemplaza todo y deja la lista en su primera página: quien había bajado tres páginas y oculta una
 * publicación volvería arriba. Esto solo pone al día lo que la primera página dice —sus publicaciones nuevas,
 * conteos y fotos firmadas—, conserva los comentarios que ya se habían abierto, deja las que se están publicando
 * (`pendiente`) arriba y mantiene lo que ya había más abajo, en su orden.
 *
 * `hayMasAbajo` dice si quedó algo de lo que ya estaba cargado fuera de la primera página: si es así el cursor de
 * "traer más" sigue siendo el de antes (apunta después de ese último elemento); si no, la lista ES la primera
 * página y el cursor correcto es el que acaba de traer. Lo que otra cuenta haya ocultado mientras tanto y ya no
 * esté en la primera página no se puede distinguir de lo que está más abajo: se limpia en la siguiente recarga
 * completa (al volver de mantenimiento o al reabrir la app).
 */
export function fusionarPrimeraPagina(
  previas: readonly PostItem[],
  primeraPagina: readonly PostItem[],
): { posts: PostItem[]; hayMasAbajo: boolean } {
  const previasPorId = new Map(previas.map(p => [p.id, p]));
  const enLaPrimera = new Set(primeraPagina.map(p => p.id));
  const pendientes = previas.filter(p => p.pendiente);
  const actualizadas = primeraPagina.map(p => {
    const previa = previasPorId.get(p.id);
    return previa && previa.comments.length > 0 ? { ...p, comments: previa.comments } : p;
  });
  const masAbajo = previas.filter(p => !p.pendiente && !enLaPrimera.has(p.id));
  return { posts: [...pendientes, ...actualizadas, ...masAbajo], hayMasAbajo: masAbajo.length > 0 };
}
