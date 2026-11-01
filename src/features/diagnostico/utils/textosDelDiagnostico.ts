/**
 * Los textos del diagnóstico que no vienen del servidor (spec 026). Tuteo de Perú, tipo oración. Un solo lugar para que las
 * pantallas y las pruebas digan lo mismo.
 */

export const TITULO_DEL_CIERRE = 'Tus objetivos ya están preparados';
export const TEXTO_SIN_OBJETIVOS = 'Los escribirás en Plan.';
export const QUE_SIGUE_EN_EL_INGRESO =
  'Ahora sigue aceptar los Términos y elegir tu Día 1. Después, en Plan, revisas tus objetivos y los confirmas.';
export const QUE_SIGUE_DENTRO_DE_LA_APP = 'En Plan puedes revisar tus objetivos y confirmarlos. Cuando los confirmes, quedan fijos.';

export const FALLO_AL_GUARDAR = 'No se pudo guardar. Revisa tu conexión.';
export const FALLO_AL_TERMINAR = 'No se pudo terminar. Revisa tu conexión.';
export const FALTA_ALGO_SIN_UBICAR = 'Todavía falta responder algo. Vuelve atrás y revísalo.';

export const SIN_DIAGNOSTICO_DISPONIBLE = 'Todavía no tienes un diagnóstico disponible.';
export const NO_SE_PUDO_CARGAR_EL_DIAGNOSTICO = 'No pudimos cargar tu diagnóstico. Revisa tu conexión.';

export const TARJETA_PENDIENTE_TITULO = 'Completa tu diagnóstico';
export const TARJETA_PENDIENTE_LINEA = 'De él nacen tus objetivos de 90 días.';

export const TODAVIA_NO_LO_COMPLETA = 'Todavía no lo ha completado.';
export const TODAVIA_NO_LO_HAS_COMPLETADO = 'Todavía no has completado tu diagnóstico.';
export const NO_SE_PUDO_CARGAR_LA_LECTURA = 'No se pudo cargar el diagnóstico.';
export const NO_SE_PUDO_CARGAR_LA_LECTURA_SIN_RED = 'No se pudo cargar el diagnóstico. Revisa tu conexión.';
export const PREGUNTA_RETIRADA = 'Pregunta retirada';
export const SIN_RESPUESTA = 'Sin respuesta';
export const TITULO_DE_LA_SECCION_DE_LECTURA = 'Diagnóstico inicial';

/** «Puedes elegir hasta 2» / «Elige como máximo 2» (cuando se intentó pasar). */
export function avisoDeMaximo(maximo: number, intentoDeMas: boolean): string {
  return intentoDeMas ? `Elige como máximo ${maximo}.` : `Puedes elegir hasta ${maximo}.`;
}

export function textoDelContador(largo: number, maximo: number): string {
  return `${largo} / ${maximo}`;
}
