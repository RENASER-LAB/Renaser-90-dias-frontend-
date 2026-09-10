import { ApiError } from '../../../services/http/apiClient';

/**
 * El texto que se le muestra a una persona cuando algo falla.
 *
 * <blockquote><b>Por qué existe.</b> El idiom habitual —`e instanceof Error ? e.message : 'algo
 * amable'`— no funciona: {@link ApiError} extiende `Error`, así que la rama amable NUNCA se
 * ejecuta y en pantalla termina apareciendo el mensaje crudo de la excepción. Con la red caída se
 * leía literalmente el error de `fetch`, que no le dice nada a nadie y menos al público de esta
 * app.</blockquote>
 *
 * La regla: el mensaje explica QUÉ pasó y QUÉ hacer, y no expone detalles del transporte
 * (AGENTS.md §5).
 */
export function mensajeDeFallo(error: unknown, alFallar: string): string {
  if (error instanceof ApiError) {
    if (error.esDeRed) return 'Sin conexión con el servidor. Revisá tu red y volvé a intentar.';
    if (error.esNoAutenticado) return 'Tu sesión venció. Volvé a entrar.';
    if (error.esProhibido) return 'Tu cuenta no tiene permiso para esto.';
    return alFallar;
  }
  // Un error que no es de la API sí puede traer algo útil (validación local, por ejemplo).
  return error instanceof Error && error.message ? error.message : alFallar;
}
