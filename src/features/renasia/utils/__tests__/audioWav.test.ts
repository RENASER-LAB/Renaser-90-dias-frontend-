import { describe, expect, it } from '@jest/globals';

import { bytesABase64, esWav, segundosDeWav } from '../audioWav';

function wav(segundos: number, bytesPorSegundo = 44100): Uint8Array {
  const bytes = new Uint8Array(44 + Math.round(segundos * bytesPorSegundo));
  const escribir = (desde: number, texto: string) =>
    [...texto].forEach((letra, i) => (bytes[desde + i] = letra.charCodeAt(0)));
  escribir(0, 'RIFF');
  escribir(8, 'WAVE');
  new DataView(bytes.buffer).setUint32(28, bytesPorSegundo, true);
  return bytes;
}

describe('bytesABase64', () => {
  it.each(['', 'a', 'ab', 'abc', 'Hola, ¿cómo vas?'])('coincide con Buffer para %p', texto => {
    const bytes = new TextEncoder().encode(texto);
    expect(bytesABase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});

describe('esWav', () => {
  it('reconoce la cabecera RIFF/WAVE', () => {
    expect(esWav(wav(0.5))).toBe(true);
  });

  it('rechaza una página HTML de error', () => {
    expect(esWav(new TextEncoder().encode('<html>'.repeat(20)))).toBe(false);
  });
});

describe('segundosDeWav', () => {
  it('calcula la duración con los bytes por segundo de la cabecera', () => {
    expect(segundosDeWav(wav(2))).toBeCloseTo(2);
  });
});
