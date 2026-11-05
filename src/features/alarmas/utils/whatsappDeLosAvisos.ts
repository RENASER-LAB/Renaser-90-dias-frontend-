/**
 * El WhatsApp en Yo → Notificaciones → «Recordatorios de eventos por WhatsApp» (spec 041, FR-041): a qué número se le escribe, sin mostrarlo entero.
 *
 * El número es UNO solo, la respuesta «WhatsApp principal» de la Ficha Inicial (`"+51 987654321"`); aquí solo se lee para decir a cuál se escribe
 * (nunca se copia a otro lado). Esta cuenta es la misma que hace el servidor al enviar (`NumeroDeWhatsApp`): sin espacios, empieza con `+` y tiene
 * de 8 a 15 dígitos; lo que no tiene esa forma no es un número y el servidor no le escribe.
 */

const INTERNACIONAL = /^\+[1-9]\d{7,14}$/;
const MASCARA = '•';

/** `+51987654321`, o `null` si lo guardado no tiene forma de número internacional. */
export function numeroInternacional(guardado: string | null | undefined): string | null {
  if (!guardado) return null;
  const compacto = guardado.replace(/[\s().-]/g, '');
  return INTERNACIONAL.test(compacto) ? compacto : null;
}

/**
 * `+51 9•• ••• •21`: el código de país, un dígito y los dos últimos; el resto va oculto, en grupos de 2, 3 y lo que sobre. Es lo mismo que escribe el
 * servidor en su registro. `null` si no hay un número válido.
 */
export function numeroEnmascarado(guardado: string | null | undefined): string | null {
  const numero = numeroInternacional(guardado);
  if (!numero) return null;
  const digitos = numero.slice(1);
  const cabeza = `${digitos.slice(0, 2)} ${digitos[2]}`;
  const cola = digitos.slice(-2);
  let pendientes = digitos.length - 5;
  const grupos: string[] = [];
  for (const tamano of [2, 3, Number.MAX_SAFE_INTEGER]) {
    const ahora = Math.min(tamano, pendientes);
    if (ahora === 0) break;
    grupos.push(MASCARA.repeat(ahora));
    pendientes -= ahora;
  }
  return `+${cabeza}${grupos.join(' ')}${cola}`;
}

export type LecturaDelWhatsappDeLosAvisos = 'cargando' | 'listo' | 'error';

/**
 * La línea de abajo de la fila. Con número: a cuál se le escribe. Sin número: dónde ponerlo («Editar perfil» es la pantalla que escribe la misma
 * respuesta de la ficha). Mientras se lee, o si no se pudo leer, no se dice nada: no se adivina ni se afirma lo que no se sabe.
 */
export function lineaDelWhatsapp(lectura: LecturaDelWhatsappDeLosAvisos, guardado: string | null): string | null {
  if (lectura !== 'listo') return null;
  const enmascarado = numeroEnmascarado(guardado);
  return enmascarado ? `Te escribimos al ${enmascarado}.` : 'Agrega tu WhatsApp en Editar perfil.';
}
