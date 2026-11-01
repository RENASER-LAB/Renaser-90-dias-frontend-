import { FORMACION_POR_DEFECTO, type FormacionDeLaSesion } from '../types/formaciones.types';

/**
 * Qué muestra la app de la formación de la sesión (spec 022, FR-013 y FR-014). Todo son decisiones puras: el servidor ya
 * filtra lo que cada persona ve; esto solo decide cuándo hace falta nombrar la formación o pedir que se elija una.
 */

export const MENSAJE_SIN_FORMACION = 'Administración todavía no te asignó una formación.';

export const PREGUNTA_DE_FORMACION = '¿En qué formación vas a trabajar hoy?';

/** El código de la formación en la que se trabaja ahora, o `null` si no se sabe o si la persona ve todas. */
export function codigoActivo(formacion: FormacionDeLaSesion | null | undefined): string | null {
  return formacion?.activa?.codigo ?? null;
}

/**
 * El nombre fijo y discreto de Hoy: solo cuando la persona tiene más de una formación o es de una distinta de la Escuela.
 * Quien ve todas (Administración) y quien es de la Escuela con una sola no lo ven: para ellos nada cambia.
 */
export function nombreQueSeMuestra(formacion: FormacionDeLaSesion | null | undefined): string | null {
  if (!formacion || formacion.veTodas || !formacion.activa) return null;
  if (formacion.disponibles.length > 1 || formacion.activa.codigo !== FORMACION_POR_DEFECTO) return formacion.activa.nombre;
  return null;
}

/** El personal con varias formaciones y ninguna elegida todavía en este teléfono: se le pregunta una vez al entrar. */
export function hayQueElegirAlEntrar(formacion: FormacionDeLaSesion | null | undefined, yaEligioAqui: boolean): boolean {
  return Boolean(formacion?.puedeElegir) && !formacion?.sinFormacion && !yaEligioAqui;
}

/** Una persona del personal a quien Administración todavía no le asignó ninguna: solo ve el aviso. */
export function noTieneFormacion(formacion: FormacionDeLaSesion | null | undefined): boolean {
  return Boolean(formacion?.sinFormacion) && !formacion?.veTodas;
}

/**
 * La llave con la que se arman las vistas de la app (las cinco pestañas). Cambia con la cuenta y con la formación activa: al
 * cambiar de formación, o cuando un traslado se nota al volver al frente, todo se vuelve a armar de cero y no queda a la vista
 * nada de la anterior ni por un instante (spec 022, historia 5, escenario 4). Sin formación conocida es la misma de siempre.
 */
export function llaveDeLasVistas(cuenta: string | null | undefined, formacion: FormacionDeLaSesion | null | undefined): string {
  const base = cuenta ?? 'sin-cuenta';
  const activa = codigoActivo(formacion);
  return activa ? `${base}|${activa}` : base;
}
