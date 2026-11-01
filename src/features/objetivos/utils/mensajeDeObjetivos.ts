import { mensajeDeError } from '../../../services/http/apiClient';

/** Lo que se dice cuando el servidor no deja operar objetivos porque la persona todavía no tiene su programa andando. */
export const MENSAJE_DE_OBJETIVOS_SIN_PROGRAMA = 'Tu plan se arma con tu programa. Cuando elijas tu Día 1 podrás escribir aquí tus objetivos.';

/**
 * ¿El servidor rechazó el pedido porque la persona no tiene un programa andando? Son los dos rechazos de `/rocks/*` a quien no puede operar
 * rocas todavía (backend `AccesoARocas`): 404 «Participante no encontrado: <id>» (sin fila de programa) y 403 «Solo un aprendiz opera sus propias
 * rocas» (el personal con la fila, antes de elegir su Día 1). El segundo no es un permiso que falte: se resuelve eligiendo el Día 1.
 */
export function esFaltaDeProgramaAndando(error: unknown): boolean {
  // Se mira la forma del error (estado y mensaje) y no `instanceof ApiError`: así no depende de cómo se importe la clase.
  if (typeof error !== 'object' || error === null) return false;
  const { status, message } = error as { status?: unknown; message?: unknown };
  const texto = typeof message === 'string' ? message.trim() : '';
  return (status === 404 && /^Participante no encontrado/i.test(texto)) || (status === 403 && /^Solo un aprendiz opera sus propias rocas/i.test(texto));
}

/**
 * Como {@link mensajeDeError}, pero la falta de programa se dice con palabras de la persona y no con el texto del servidor (con el id adentro o
 * hablando de «aprendices»): E2E de las formaciones, 01/11/2026, issues #81 y #83.
 */
export function mensajeDeObjetivos(error: unknown, porDefecto: string): string {
  return esFaltaDeProgramaAndando(error) ? MENSAJE_DE_OBJETIVOS_SIN_PROGRAMA : mensajeDeError(error, porDefecto);
}
