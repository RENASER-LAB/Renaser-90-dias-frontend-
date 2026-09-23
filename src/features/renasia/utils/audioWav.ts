const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64 a mano, sin `btoa` ni `Buffer`: `btoa` pide un string binario (armarlo con 150 KB de audio
 * es lento en Hermes) y `Buffer` no existe en React Native.
 */
export function bytesABase64(bytes: Uint8Array): string {
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    salida += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63];
    salida += i + 1 < bytes.length ? ALFABETO[(n >> 6) & 63] : '=';
    salida += i + 2 < bytes.length ? ALFABETO[n & 63] : '=';
  }
  return salida;
}

/** `RIFF....WAVE`: lo único que se exige antes de mandarlo al reproductor. */
export function esWav(bytes: Uint8Array): boolean {
  const texto = (desde: number) => String.fromCharCode(...bytes.subarray(desde, desde + 4));
  return bytes.length > 44 && texto(0) === 'RIFF' && texto(8) === 'WAVE';
}

/**
 * Cuánto dura un WAV PCM, leído de su cabecera (bytes por segundo en el offset 28). Sirve para no
 * quedarse esperando para siempre un "terminó" que el reproductor nunca manda.
 */
export function segundosDeWav(bytes: Uint8Array): number {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bytesPorSegundo = vista.getUint32(28, true);
  return bytesPorSegundo > 0 ? (bytes.length - 44) / bytesPorSegundo : 0;
}
