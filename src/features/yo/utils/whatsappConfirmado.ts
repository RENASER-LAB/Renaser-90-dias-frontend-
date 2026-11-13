import { ApiError } from '../../../services/http/apiClient';
import { enmascararWhatsapp, numeroInternacional } from '../../auth/utils/codigoPorWhatsApp';
import { CODIGO_POR_DEFECTO, tieneNumeroLocal } from './whatsappDelPerfil';

/**
 * Spec 051: Yo → «WhatsApp», sin pantalla ni red. El número se guarda solo después de confirmarlo con un código de 6 dígitos que llega por WhatsApp
 * a ese número; ese es el que usa la recuperación de la contraseña.
 */

export const TEXTOS_DEL_WHATSAPP = {
  fila: 'WhatsApp',
  agregar: 'Agregar',
  hojaTitulo: 'Tu WhatsApp',
  ayuda: 'Te enviamos un código por WhatsApp para confirmar que el número es tuyo. Con este número recuperas tu contraseña.',
  enviar: 'Enviar código',
  enviando: 'Enviando…',
  confirmar: 'Confirmar',
  confirmando: 'Confirmando…',
  listo: 'Listo',
  cambiarNumero: 'Cambiar número',
  numeroInvalido: 'Escribe un número de WhatsApp válido, con el código de país.',
  codigoIncompleto: 'Escribe los 6 dígitos del código.',
  sinConexion: 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
  confirmado: (enmascarado: string | null) =>
    enmascarado ? `Tu WhatsApp ${enmascarado} quedó confirmado.` : 'Tu WhatsApp quedó confirmado.',
  enviadoA: (enmascarado: string | null) => (enmascarado ? `Enviamos un código por WhatsApp a ${enmascarado}.` : 'Enviamos un código por WhatsApp.'),
} as const;

/** El detalle de la fila: el número confirmado enmascarado o «Agregar». */
export function detalleDelWhatsapp(confirmado: string | null): string {
  return confirmado ?? TEXTOS_DEL_WHATSAPP.agregar;
}

/** El número listo para el servidor (`+51987654321`), o `null` si aún no tiene forma de número de WhatsApp. */
export function numeroParaElServidor(valor: string): string | null {
  return tieneNumeroLocal(valor) ? numeroInternacional(valor) : null;
}

/** Sin número escrito el campo parte en Perú, como la ficha. */
export const NUMERO_INICIAL = CODIGO_POR_DEFECTO;

/** Lo que se le dice a la persona cuando falla un pedido: el motivo del servidor si lo hay (código incorrecto, número en uso, 429), si no, genérico. */
export function mensajeDelError(e: unknown): string {
  if (e instanceof ApiError && e.message) return e.message;
  return TEXTOS_DEL_WHATSAPP.sinConexion;
}

export { enmascararWhatsapp };
