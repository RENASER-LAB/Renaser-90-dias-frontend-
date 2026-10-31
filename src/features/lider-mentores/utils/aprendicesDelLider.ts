import type { AprendizDeLaLista } from '../types/aprendicesDelLider.types';

/**
 * Los textos de «Todos los aprendices» (2026-10-31), puros para probarse sin montar la pantalla.
 */

/** El grupo en palabras: su nombre, «Grupo sin nombre» si tiene grupo y el servidor no dijo cómo se llama, o «Sin grupo». */
export function grupoEnPalabras(fila: Pick<AprendizDeLaLista, 'grupoId' | 'grupoNombre'>): string {
  if (fila.grupoNombre) return fila.grupoNombre;
  return fila.grupoId ? 'Grupo sin nombre' : 'Sin grupo';
}

/** La línea de la fila: «Grupo Fénix · Día 12», «Sin grupo · Día 3» o, sin día, solo el grupo. */
export function lineaDelAprendiz(fila: AprendizDeLaLista): string {
  const grupo = grupoEnPalabras(fila);
  return fila.diaPrograma !== null ? `${grupo} · Día ${fila.diaPrograma}` : grupo;
}

/** Lo que oye quien no ve: quién es, su línea y qué abre. */
export function dichoDelAprendiz(fila: AprendizDeLaLista): string {
  return `${fila.nombre}. ${lineaDelAprendiz(fila)}. Ver su ficha.`;
}

/** La foto como URL completa para `AvatarPersona`; una ruta del servidor (que pide la sesión) o nada = `null`. */
export function urlDeLaFoto(fotoPath: string | null): string | null {
  return fotoPath && /^https?:\/\//i.test(fotoPath) ? fotoPath : null;
}

/** Una ruta del servidor que se pide con la sesión, como las fotos del chat. */
export function esRutaConSesion(fotoPath: string | null): fotoPath is string {
  return !!fotoPath && fotoPath.startsWith('/');
}

/** Lo que dice la lista cuando no hay filas y no está cargando ni falló. */
export function textoSinFilas(buscado: string): string {
  const texto = buscado.trim();
  return texto ? `Sin resultados para «${texto}».` : 'Todavía no hay aprendices.';
}
