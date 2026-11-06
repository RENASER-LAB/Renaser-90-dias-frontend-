/**
 * Spec 046: lo que la app revisa antes de mandar (la forma); el servidor vuelve a revisar todo y además las palabras prohibidas,
 * que no se repita en la formación y los 30 días.
 */
export const MINIMO = 3;
export const MAXIMO = 20;

export type ProblemaDelSobrenombre = 'largo' | 'espacios' | 'caracteres' | null;

/**
 * El sobrenombre tal como se manda: en NFC y sin espacios a los lados (issue #100). Una tilde escrita como carácter combinable
 * («e» + U+0301, que mandan algunos teclados y el copiar y pegar) se ve igual que «é», pero sin NFC no pasaba el patrón de letras.
 */
export function limpiarSobrenombre(texto: string): string {
  return texto.normalize('NFC').trim();
}

export function problemaDeLaForma(texto: string): ProblemaDelSobrenombre {
  const limpio = limpiarSobrenombre(texto);
  if (limpio.length < MINIMO || limpio.length > MAXIMO) return 'largo';
  if (/\s{2,}/.test(limpio)) return 'espacios';
  if (!/^[\p{L}\p{N} .\-]+$/u.test(limpio)) return 'caracteres';
  return null;
}

export const MENSAJE_DEL_PROBLEMA: Record<Exclude<ProblemaDelSobrenombre, null>, string> = {
  largo: 'Usa de 3 a 20 letras.',
  // Issue #100: antes dos espacios seguidos decían «Usa de 3 a 20 letras.», que no explica el problema.
  espacios: 'Usa un solo espacio entre palabras.',
  caracteres: 'Usa solo letras, números, espacios, puntos o guiones.',
};

/**
 * La fila de Hoy (D1, D2): desde el día 7 del programa, mientras no tenga sobrenombre ni haya dicho «Ahora no». Sin lectura del
 * servidor (un backend anterior, sin red) no hay fila: nunca se ofrece sobre una duda.
 */
export function muestraLaFilaEnHoy(diaPrograma: number | null | undefined, mio: { sobrenombre: string | null; invitacionDescartada: boolean } | null): boolean {
  if (!mio || typeof diaPrograma !== 'number') return false;
  return diaPrograma >= 7 && !mio.sobrenombre && !mio.invitacionDescartada;
}

/** «Puedes cambiarlo de nuevo desde el 6 de diciembre.» (la fecha en la zona del teléfono). */
export function textoDeLaEspera(puedeCambiarDesde: string | null, ahora: Date = new Date()): string | null {
  if (!puedeCambiarDesde) return null;
  const fecha = new Date(puedeCambiarDesde);
  if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= ahora.getTime()) return null;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `Puedes cambiarlo de nuevo desde el ${fecha.getDate()} de ${meses[fecha.getMonth()]}.`;
}

export const TEXTOS_DEL_SOBRENOMBRE = {
  filaTitulo: 'Elige cómo te verán en el Muro',
  filaLinea: 'Tu sobrenombre',
  hojaTitulo: 'Tu sobrenombre en el Muro',
  ayuda: 'Así te verán en el Muro. Tu mentor y el equipo siguen viendo tu nombre.',
  ejemplo: 'Ej.: Fénix de Arequipa',
  asiSeVera: 'Así se verá',
  guardar: 'Guardar',
  quitar: 'Volver a mi nombre',
  listo: (s: string) => `Listo: en el Muro te verán como ${s}.`,
  quitado: 'Listo: en el Muro vuelves a verte con tu nombre.',
  filaDeYo: 'Sobrenombre en el Muro',
  sinSobrenombre: 'Con tu nombre',
} as const;
