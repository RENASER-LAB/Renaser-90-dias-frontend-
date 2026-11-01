import type { TerminosDeMiFormacionApi } from '../api/terminosSchemas';

/**
 * Qué se le pide a la persona con los términos de su formación (spec 027), como lo manda el servidor: `FIRST_TIME` es el paso de siempre del primer
 * ingreso (lo lleva el onboarding); `NEW_VERSION` y `FIRST_IN_FORMATION` bloquean la app hasta aceptar.
 */
export function debeAceptarAntesDeEntrar(terminos: TerminosDeMiFormacionApi | null): boolean {
  return terminos !== null && terminos.blocks && terminos.version != null;
}

/** El titular de la pantalla de aceptación según por qué aparece. */
export function titularDeLaAceptacion(terminos: TerminosDeMiFormacionApi): string {
  return terminos.pending === 'FIRST_IN_FORMATION' ? `Términos de ${terminos.formation.name}` : 'Actualizamos nuestros términos';
}

/** La línea que explica por qué se pide, en tuteo. */
export function explicacionDeLaAceptacion(terminos: TerminosDeMiFormacionApi): string {
  if (terminos.pending === 'FIRST_IN_FORMATION') {
    return `Entras a ${terminos.formation.name}. Lee sus términos y sella tu aceptación para seguir.`;
  }
  return 'Cambiamos los términos y necesitamos que los aceptes de nuevo para seguir usando Renaser.';
}
