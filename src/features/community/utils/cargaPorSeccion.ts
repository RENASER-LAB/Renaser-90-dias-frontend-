import type { SeccionComunidad } from '../../../screens/ComunidadScreen';

/**
 * Qué pide Comunidad y cuándo (V-3, retroalimentación del 26/09/2026).
 *
 * > **Antes** la pantalla montaba de una todos sus hooks de datos y salían ~11 pedidos más uno por
 * > curso (`/cursos/{id}/secciones`): cursos, ranking, conversaciones, directorio, célula,
 * > compañeros, grupos, categorías… todos compitiendo con `GET /api/v1/wall`, que es lo único que
 * > se ve al abrir. Cada uno cruza a Miami (130–490 ms), así que el Muro tardaba ~3 s.
 *
 * Ahora al abrir salen solo el Muro, `/home` (el día de programa) y `/me/cells` (la ⓘ de la cabecera,
 * desde el 28/09). Cada recurso se pide la
 * primera vez que hace falta —al abrir su sección, el compositor o la hoja de compartir— y queda
 * pedido: volver a la sección no lo repide, igual que antes.
 */
export type RecursoComunidad =
  | 'celula'
  | 'grupos'
  | 'conversaciones'
  | 'cursos'
  | 'ranking'
  | 'categorias'
  | 'grupoQueAcompano';

export type RecursosPedidos = Readonly<Record<RecursoComunidad, boolean>>;

export const NINGUN_RECURSO: RecursosPedidos = {
  celula: false,
  grupos: false,
  conversaciones: false,
  cursos: false,
  ranking: false,
  categorias: false,
  grupoQueAcompano: false,
};

export type ContextoComunidad = {
  seccion: SeccionComunidad;
  /** El compositor del Muro está abierto: necesita las categorías y la firma (tu grupo). */
  componiendo: boolean;
  /** Se está por compartir una publicación: la hoja lista tus conversaciones y tu grupo. */
  compartiendo: boolean;
};

/** Lo que necesita, AHORA, lo que está en pantalla. */
export function recursosQueNecesita({ seccion, componiendo, compartiendo }: ContextoComunidad): RecursoComunidad[] {
  /* La ⓘ de la cabecera (28/09, corrige E-409) se dibuja solo si tienes grupo, y está en TODAS las
     secciones: `/me/cells` (una llamada liviana) se pide al abrir. */
  const recursos: RecursoComunidad[] = ['grupos'];
  if (seccion === 'classroom') recursos.push('cursos');
  // Tribu: la tarjeta de tu gente (célula), los grupos por nombre, la bandeja y, para un mentor,
  // la entrada al grupo que acompaña.
  if (seccion === 'tribu') recursos.push('celula', 'grupos', 'conversaciones', 'grupoQueAcompano');
  // El ranking cae al nombre de tu grupo cuando el ranking no trae el suyo.
  if (seccion === 'ranking') recursos.push('ranking', 'celula');
  // La firma de la publicación lleva el nombre de tu grupo.
  if (componiendo) recursos.push('categorias', 'celula');
  if (compartiendo) recursos.push('conversaciones', 'celula');
  return recursos;
}

/**
 * Suma lo que se necesita ahora a lo que ya se pidió. Nunca apaga nada: lo pedido queda pedido.
 * Devuelve el MISMO objeto si no hay nada nuevo, para que la pantalla no se re-renderice por nada.
 */
export function acumularRecursos(previos: RecursosPedidos, necesarios: RecursoComunidad[]): RecursosPedidos {
  const nuevos = necesarios.filter(r => !previos[r]);
  if (nuevos.length === 0) return previos;
  const siguiente = { ...previos };
  nuevos.forEach(r => {
    siguiente[r] = true;
  });
  return siguiente;
}
