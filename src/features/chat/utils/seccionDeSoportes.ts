import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { esAdministracionDeGrupos } from './infoDelChat';

/**
 * La sección «Soporte» de Tribu para quien atiende (D-249). Con 300 aprendices, Admin y Alquimista
 * veían una fila de soporte por aprendiz mezclada con los grupos. Ahora esos chats van en una sección
 * plegable al final de Tribu, de a una página (scroll infinito) y con búsqueda en el servidor. Lógica
 * pura, sin React, para probarla.
 */

/** Cuántos pide cada página. */
export const TAMANO_DE_PAGINA = 25;
/** Espera tras la última tecla antes de buscar. */
export const ESPERA_DE_BUSQUEDA_MS = 300;
/** A cuántos px del final se pide la página siguiente: antes de llegar, para que no se note. */
export const MARGEN_PARA_PEDIR_MAS = 600;

/** Solo ADMIN y ALCHEMIST, que están en todos los soportes. El aprendiz sigue viendo el suyo como antes. */
export function veLaSeccionDeSoportes(rol: string | null | undefined): boolean {
  return esAdministracionDeGrupos(rol);
}

/** Qué entra en «Formación Renaser»: para quien ve la sección, los soportes ya no (van en su sección). */
export function tiposDeFormacion(rol: string | null | undefined): ChatConversation['type'][] {
  return veLaSeccionDeSoportes(rol) ? ['global', 'celula'] : ['global', 'celula', 'soporte'];
}

/** Suma una página a lo que ya había, sin repetir (un soporte que subió entre página y página). */
export function agregarPagina(previas: ChatConversation[], nuevas: ChatConversation[]): ChatConversation[] {
  const vistos = new Set(previas.map(c => c.id));
  return [...previas, ...nuevas.filter(c => !vistos.has(c.id) && vistos.add(c.id))];
}

type Desplazamiento = {
  contentOffset: { y: number };
  contentSize: { height: number };
  layoutMeasurement: { height: number };
};

/** Si lo que se ve está a menos de `margen` px del final de la lista. */
export function cercaDelFinal(evento: Desplazamiento, margen = MARGEN_PARA_PEDIR_MAS): boolean {
  const { contentOffset, contentSize, layoutMeasurement } = evento;
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - margen;
}

/**
 * La fila que se pinta: la de la lista completa (`GET /conversations`) si la tiene, que se relee al volver
 * de un chat y cuando llega un mensaje; si no, la de la página. Así el último mensaje y los no leídos de lo
 * ya cargado se ponen al día sin volver a la primera página (que haría saltar la lista).
 */
export function filaAlDia(fila: ChatConversation, lista: Map<string, ChatConversation>): ChatConversation {
  return lista.get(fila.id) ?? fila;
}

/**
 * En cuántos soportes hay mensajes sin leer, para el contador de la cabecera. Si la lista completa trae
 * los soportes (hoy sí), se cuenta ahí, que está al día; si no, lo que dijo la primera página.
 */
export function soportesConNoLeidos(lista: ChatConversation[], delServidor: number | null): number {
  const soportes = lista.filter(c => c.type === 'soporte');
  if (soportes.length === 0) return delServidor ?? 0;
  return soportes.filter(c => c.unreadCount > 0).length;
}

/** «Soporte · 312» (sin el número mientras no se sabe). */
export function rotuloDeLaSeccion(total: number | null): string {
  return total === null ? 'Soporte' : `Soporte · ${total}`;
}
