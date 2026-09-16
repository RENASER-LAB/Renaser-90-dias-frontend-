/**
 * Filtrar la lista de candidatos del selector de un grupo, por lo que se escribe.
 *
 * ## Por qué en el cliente y no contra el servidor
 *
 * `GET /admin/cells/aprendices-disponibles` devuelve la lista COMPLETA de una sola vez (no
 * pagina), así que cuando el selector se abre ya están todos en memoria. Pedirle al servidor que
 * busque sería una llamada de red por cada tecla para recorrer un arreglo que ya está acá. Es la
 * diferencia con el buscador de Personas, que sí va al servidor porque esa lista viene paginada
 * de a 20 y el que buscás puede no haber llegado todavía.
 *
 * El día que esa lista pase a paginar, esta función deja de alcanzar y hay que mover la búsqueda
 * al backend — está anotado acá para que se note en ese momento y no después.
 */
import type { AprendizCandidatoApi } from '../api/adminSchemas';

/**
 * Texto comparable: sin mayúsculas, sin tildes y sin espacios al borde.
 *
 * Las tildes importan de verdad acá. Los nombres del padrón son en castellano —"José", "Martín",
 * "Muñoz"— y nadie los escribe acentuados al buscar. Sin normalizar, escribir "jose" no encuentra
 * a "José" y la pantalla dice "no hay nadie" teniéndolo en la lista: el mismo error de convertir
 * un fallo en un vacío que veníamos corrigiendo.
 *
 * `NFD` separa la letra de su tilde y el rango de bloques diacríticos la borra, así que la "ñ"
 * queda como "n" — a propósito: quien busca "munoz" quiere encontrar a "Muñoz".
 */
function comparable(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Los candidatos cuyo nombre contiene lo escrito. Con el campo vacío devuelve la lista entera.
 *
 * Se busca solo por nombre porque es lo único que el endpoint manda para mostrar: no hay correo
 * en `AprendizCandidatoApi`. Buscar por un dato que no se ve sería prometer algo que la pantalla
 * no puede cumplir.
 */
export function filtrarCandidatos<T extends Pick<AprendizCandidatoApi, 'fullName'>>(
  candidatos: readonly T[],
  texto: string,
): T[] {
  const buscado = comparable(texto);
  if (!buscado) return [...candidatos];
  return candidatos.filter(c => comparable(c.fullName ?? '').includes(buscado));
}
