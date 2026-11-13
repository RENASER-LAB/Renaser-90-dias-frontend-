/**
 * El código por WhatsApp (spec 043), sin pantalla ni red: cuándo se ofrece, qué dice y la forma del número.
 */

/** A los 60 segundos de mandar el código al correo aparece «¿No te llegó? Envíamelo por WhatsApp» (FR-012). */
export const SEGUNDOS_PARA_OFRECER_WHATSAPP = 60;

/**
 * La opción va en la misma línea que «¿No te llegó? Reenviar» (pedido del dueño del 06/11: «mucho texto, más limpio»): se ve «Por WhatsApp» y el
 * lector de pantalla oye la frase entera.
 */
export const TEXTO_DEL_ENLACE = 'Por WhatsApp';
export const ETIQUETA_DEL_ENLACE = 'Envíamelo por WhatsApp';

export type FlujoDelCodigo = 'registro' | 'recuperacion';

/** La forma que exige el servidor (y los recordatorios de la spec 041): «+», código de país y de 8 a 15 dígitos en total. */
const INTERNACIONAL = /^\+[1-9]\d{7,14}$/;

/** `"+51 987654321"` → `"+51987654321"`, o `null` si no tiene forma de número de WhatsApp. */
export function numeroInternacional(texto: string): string | null {
  const compacto = texto.replace(/[\s().-]/g, '');
  return INTERNACIONAL.test(compacto) ? compacto : null;
}

/**
 * `+51 9•• ••• •21`: la misma máscara que el servidor (`NumeroDeWhatsApp.enmascarado`): el código de país de dos dígitos, un dígito y los dos
 * últimos; lo demás en grupos de 2, 3 y lo que sobre. `null` si no tiene forma de número.
 */
export function enmascararWhatsapp(texto: string): string | null {
  const numero = numeroInternacional(texto);
  if (!numero) return null;
  const digitos = numero.slice(1);
  const ocultos = digitos.length - 5;
  const grupos: string[] = [];
  let pendientes = ocultos;
  for (const tamano of [2, 3, Number.MAX_SAFE_INTEGER]) {
    const ahora = Math.min(tamano, pendientes);
    if (ahora === 0) break;
    grupos.push('•'.repeat(ahora));
    pendientes -= ahora;
  }
  return `+${digitos.slice(0, 2)} ${digitos[2]}${grupos.join(' ')}${digitos.slice(-2)}`;
}

/**
 * La línea bajo el enlace, antes de tocarlo: en el alta, a qué número va; en la recuperación, nada: la app no sabe (ni debe saber) si la cuenta
 * tiene un WhatsApp guardado, y decir «al WhatsApp de tu cuenta» daría a entender que lo tiene (FR-009).
 */
export function lineaAntesDeEnviar(flujo: FlujoDelCodigo, enmascarado: string | null): string | null {
  if (flujo === 'recuperacion') return null;
  return enmascarado ? `Va a ${enmascarado}` : null;
}

/** Lo que se dice al terminar (FR-015). En la recuperación es la misma frase siempre: tenga o no WhatsApp la cuenta. */
export function textoDeEnviado(flujo: FlujoDelCodigo, enmascarado: string | null): string {
  if (flujo === 'recuperacion') return 'Si tu cuenta tiene un WhatsApp confirmado en Yo o guardado en tu ficha, te lo enviamos ahí';
  return enmascarado ? `Te lo enviamos por WhatsApp a ${enmascarado}` : 'Te lo enviamos por WhatsApp';
}

/** ¿Ya se puede ofrecer? Desde que se mandó el código al correo pasaron 60 segundos o más. */
export function seOfreceElWhatsapp(segundosDesdeElEnvio: number): boolean {
  return segundosDesdeElEnvio >= SEGUNDOS_PARA_OFRECER_WHATSAPP;
}

/** Sin número, el campo de «Solicitar acceso» arranca en Perú, como el paso de la ficha. */
export const WHATSAPP_INICIAL = '+51 ';

/**
 * El WhatsApp de «Solicitar acceso» (FR-003): la regla de la ficha (`validarWhatsapp`, «WhatsApp requerido») y además la forma internacional que exige
 * el servidor para poder mandarle el código. Devuelve el texto del aviso o `null` si está bien.
 */
export function avisoDelWhatsappDelRegistro(valor: string, reglaDeLaFicha: (v: string) => { mensaje: string } | null): string | null {
  const deLaFicha = reglaDeLaFicha(valor);
  if (deLaFicha) return deLaFicha.mensaje;
  return numeroInternacional(valor) ? null : 'Revisa tu número de WhatsApp: escribe el número completo, sin el código de país.';
}
