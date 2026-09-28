import * as fs from 'fs';

/**
 * Lo mínimo de un MP3 para probar los sonidos sin decodificarlos: recorre los cuadros MPEG y lee su
 * cabecera (versión, capa, tasa de bits, frecuencia, canales). No es una prueba: lo usan las pruebas.
 *
 * Solo entiende MPEG-1 Layer III, que es lo que escribe `ffmpeg -codec:a libmp3lame` a 44,1 kHz
 * (`scripts/sonidos/terminar_audio.py`); cualquier otra cosa la rechaza, y eso también se prueba.
 */
export interface InfoMp3 {
  kbps: number;
  tasa: number;
  canales: 1 | 2;
  cuadros: number;
  /** Cuadros × 1152 muestras. Incluye el cuadro de información de LAME y el relleno del códec (~50 ms). */
  segundos: number;
}

const KBPS_MPEG1_CAPA3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const TASAS_MPEG1 = [44100, 48000, 32000, 0];

/** Lo que ocupa la etiqueta ID3v2 del principio (ffmpeg la escribe), o 0 si no hay. */
function largoId3(b: Buffer): number {
  if (b.toString('latin1', 0, 3) !== 'ID3') return 0;
  return 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f));
}

export function leerMp3(ruta: string): InfoMp3 {
  const b = fs.readFileSync(ruta);
  let i = largoId3(b);
  let primero: Omit<InfoMp3, 'cuadros' | 'segundos'> | null = null;
  let cuadros = 0;
  while (i + 4 <= b.length && b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) {
    const version = (b[i + 1] >> 3) & 3; // 3 = MPEG-1
    const capa = (b[i + 1] >> 1) & 3; // 1 = Layer III
    const kbps = KBPS_MPEG1_CAPA3[b[i + 2] >> 4];
    const tasa = TASAS_MPEG1[(b[i + 2] >> 2) & 3];
    if (version !== 3 || capa !== 1 || !kbps || !tasa) {
      throw new Error(`${ruta}: el cuadro en el byte ${i} no es MPEG-1 Layer III`);
    }
    primero ??= { kbps, tasa, canales: b[i + 3] >> 6 === 3 ? 1 : 2 };
    cuadros++;
    i += Math.floor((144000 * kbps) / tasa) + ((b[i + 2] >> 1) & 1);
  }
  if (!primero) throw new Error(`${ruta}: no tiene cuadros MP3`);
  return { ...primero, cuadros, segundos: (cuadros * 1152) / primero.tasa };
}
