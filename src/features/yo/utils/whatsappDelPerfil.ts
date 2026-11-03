import { ALL_WORLD_PHONE_COUNTRIES } from '../../../services/phoneCountriesService';
import { PREGUNTA_WHATSAPP } from '../../onboarding/data/mapaPreguntas';
import { validarWhatsapp, type AvisoDePaso } from '../../onboarding/data/pasosFicha';
import type { RespuestasAgrupadasApi } from '../../onboarding/types/onboarding.types';

/**
 * El WhatsApp de Editar perfil (Yo → Ajustes → Perfil), sin pantalla ni red.
 *
 * **De dónde sale y a dónde va.** El número es UNA sola cosa: la respuesta «WhatsApp principal» de la Ficha Inicial (`respuestas_onboarding`,
 * clave `whatsapp`, guardada como `"+51 987654321"`). Es la que lee la Caja Renaser (`FichaDeEnvio.CLAVE_CELULAR`) y la que ve el acompañamiento
 * de la persona. Perfil la lee y la escribe por los mismos endpoints de la ficha (`GET` y `POST /onboarding/answers`), así no hay un segundo
 * teléfono que se pueda desalinear (la columna `usuarios.telefono` del servidor no está mapeada ni se lee en ningún lado).
 */

/** Sin número guardado, el campo arranca en Perú, como el paso de la ficha. */
export const CODIGO_POR_DEFECTO = '+51 ';

/** El número que la persona puso en su ficha, o `null` si todavía no hay uno (o llega vacío). */
export function whatsappDeLasRespuestas(respuestas: RespuestasAgrupadasApi): string | null {
  for (const seccion of respuestas.sections) {
    for (const respuesta of seccion.answers) {
      if (respuesta.questionKey !== PREGUNTA_WHATSAPP.clave) continue;
      const texto = respuesta.textValue?.trim();
      return texto ? texto : null;
    }
  }
  return null;
}

/** Lo que se le pone al campo al abrir: el número guardado, o el código de Perú vacío. */
export function valorInicialDelCampo(guardado: string | null): string {
  return guardado?.trim() ? guardado.trim() : CODIGO_POR_DEFECTO;
}

/**
 * ¿Hay dígitos después del código de país? Parte el valor igual que `PhoneCountryInput` (el primer país cuyo código es su comienzo) y mira lo
 * que sobra: «+51 » solo tiene el código, «+51 987» ya tiene número. Un valor sin código («987654321», de una ficha vieja) cuenta entero.
 */
export function tieneNumeroLocal(valor: string): boolean {
  const limpio = valor.trim();
  if (!limpio) return false;
  const pais = ALL_WORLD_PHONE_COUNTRIES.find(p => limpio.startsWith(p.code));
  const local = pais ? limpio.slice(pais.code.length) : limpio;
  return /\d/.test(local);
}

export type DecisionDelWhatsapp =
  /** No hay nada que mandar: no cambió, o nunca tuvo uno y lo dejó vacío. */
  | { tipo: 'sin-cambio' }
  | { tipo: 'guardar'; valor: string }
  /** No se guarda nada: el aviso dice por qué (el mismo de la ficha). */
  | { tipo: 'rechazar'; aviso: AvisoDePaso };

/**
 * Qué hacer con el número al tocar «Guardar cambios».
 *
 * - **Vaciarlo no se guarda**: el WhatsApp es obligatorio en la ficha, así que si ya había uno y el campo quedó sin número, se rechaza con el
 *   aviso de siempre («WhatsApp requerido»). Quien nunca tuvo uno (el personal que no pasó por la ficha) y lo deja vacío no tiene qué guardar:
 *   cambiar su nombre o su foto no se le traba por eso.
 * - **Lo que sí se guarda** cumple la regla de la ficha (`validarWhatsapp`) y es distinto de lo que había: no se vuelve a mandar lo mismo.
 */
export function decidirWhatsapp(guardado: string | null, actual: string): DecisionDelWhatsapp {
  const hayGuardado = guardado !== null && tieneNumeroLocal(guardado);
  if (!tieneNumeroLocal(actual)) {
    if (!hayGuardado) return { tipo: 'sin-cambio' };
    return { tipo: 'rechazar', aviso: validarWhatsapp('') as AvisoDePaso };
  }
  const aviso = validarWhatsapp(actual);
  if (aviso) return { tipo: 'rechazar', aviso };
  const nuevo = actual.trim();
  return nuevo === (guardado ?? '').trim() ? { tipo: 'sin-cambio' } : { tipo: 'guardar', valor: nuevo };
}
