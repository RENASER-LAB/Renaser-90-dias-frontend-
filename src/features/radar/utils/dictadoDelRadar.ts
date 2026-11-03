import { unirDictado } from '../../renasia/utils/dictado';
import { MAXIMO_CARACTERES, type CampoRadar } from '../config/configRadar';

/**
 * Reglas puras del dictado del Código Renaser (spec 030), sin micrófono ni React, para probarlas sin teléfono.
 *
 * El texto dictado ES el mismo dato que el escrito: se suma al campo, se revisa y se registra con el botón de siempre. Lo
 * único que se lleva aparte es QUÉ respuestas llevan algo dictado, porque eso es lo que se declara al registrar
 * (`dictado`, decisión 030-2): quien acompaña lee texto que pudo traer errores de transcripción.
 */

/** Las respuestas del formulario, por campo. */
export type RespuestasDelRadar = Readonly<Record<CampoRadar, string>>;

/** Qué respuestas llevan algo dictado (sin repetir, en el orden en que se dictaron). */
export type MarcasDeDictado = readonly CampoRadar[];

/**
 * Lo dictado se SUMA al final de lo escrito y nunca lo reemplaza. Se corta en los mismos 2 000 caracteres que el servidor,
 * igual que cuando se escribe.
 */
export function sumarDictado(textoActual: string, dictado: string): string {
  return unirDictado(textoActual, dictado).slice(0, MAXIMO_CARACTERES);
}

/** Lo que se ve en el campo mientras la persona habla: lo escrito más lo que el reconocedor va entendiendo. */
export function textoMientrasDicta(textoActual: string, parcial: string): string {
  return parcial ? sumarDictado(textoActual, parcial) : textoActual;
}

/** El campo pasa a llevar algo dictado. */
export function marcarDictado(marcas: MarcasDeDictado, campo: CampoRadar): MarcasDeDictado {
  return marcas.includes(campo) ? marcas : [...marcas, campo];
}

/**
 * Un campo que la persona dejó vacío ya no lleva nada dictado: lo que se declara es lo que de verdad quedó en el texto.
 * Corregir una palabra no desmarca (el resto sigue siendo lo que se dijo).
 */
export function soltarCamposVacios(marcas: MarcasDeDictado, respuestas: RespuestasDelRadar): MarcasDeDictado {
  const quedan = marcas.filter(campo => respuestas[campo].trim().length > 0);
  return quedan.length === marcas.length ? marcas : quedan;
}

/** ¿Algún texto que se va a registrar se dictó? Es el `dictado` del registro. */
export function huboDictado(marcas: MarcasDeDictado, respuestas: RespuestasDelRadar): boolean {
  return marcas.some(campo => respuestas[campo].trim().length > 0);
}

/** Lo que vuelve del borrador: solo campos que existen, sin repetir. Un borrador viejo sin marcas es «ninguna». */
export function marcasDelBorrador(guardadas: unknown, campos: readonly CampoRadar[]): MarcasDeDictado {
  if (!Array.isArray(guardadas)) return [];
  return campos.filter(campo => guardadas.includes(campo));
}
