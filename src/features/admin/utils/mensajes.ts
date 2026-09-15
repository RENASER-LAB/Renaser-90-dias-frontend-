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

/**
 * Qué se le dice al administrador justo después de aprobar una cuenta.
 *
 * Aprobar crea el usuario y, aparte, intenta meterlo en el grupo de bienvenida vigente. Saber si
 * entró no es parte de la respuesta de aprobar: se deduce comparando cuántas personas había sin
 * grupo **antes** y **después**. Por eso hay TRES desenlaces y no dos.
 *
 * <blockquote><b>Corregido 2026-09-15.</b> Esto vivía dentro de la pantalla como
 * `const entroSolo = sinGrupo !== null && despues.total <= sinGrupo`, un booleano para tres
 * estados: cuando la consulta previa fallaba (`sinGrupo === null`) `entroSolo` quedaba en
 * `false` y el aviso afirmaba «quedó SIN grupo» sin tener con qué compararlo — mandando a crear
 * una bienvenida que quizá ya existía y que quizá ya lo había recibido.</blockquote>
 *
 * `null` en cualquiera de los dos conteos significa «no se pudo averiguar», y entonces el
 * mensaje no afirma nada sobre el grupo: dice qué sí pasó (la cuenta existe) y dónde mirar.
 */
export function mensajeDeAltaAprobada(
  nombre: string | null | undefined,
  sinGrupoAntes: number | null,
  sinGrupoDespues: number | null,
): string {
  const quien = nombre ?? 'La persona';

  if (sinGrupoAntes === null || sinGrupoDespues === null) {
    return `${quien} ya tiene su cuenta. No pudimos comprobar si entró a un grupo de bienvenida: `
      + 'miralo en Grupos antes de dar por hecho que quedó ubicada.';
  }

  /* La cola de "sin grupo" no crece ⇒ el alta entró en una bienvenida. No se compara con
     igualdad estricta porque entre las dos consultas puede haberse ubicado a alguien más a
     mano, y eso no debe leerse como que esta persona quedó afuera. */
  if (sinGrupoDespues <= sinGrupoAntes) {
    return `${quien} ya tiene su cuenta y entró al grupo de bienvenida.`;
  }

  return `${quien} ya tiene su cuenta, pero quedó SIN grupo: no hay una bienvenida abierta hoy. `
    + 'Creá una o ubicala a mano.';
}
