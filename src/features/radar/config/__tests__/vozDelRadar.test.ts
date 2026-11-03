import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import appJson from '../../../../../app.json';
import { leerMp3 } from '../../../alarmas/__tests__/leerMp3';
import { PREGUNTAS_RADAR } from '../configRadar';
import { ARCHIVOS_DE_VOZ_DEL_RADAR, loQueDiceLaVoz, VOZ_DE_LA_PREGUNTA } from '../vozDelRadar';

/**
 * Las voces con que el Código Renaser lee sus preguntas (spec 030, FR-010): la voz Dora de las alarmas, grabada, una por pregunta.
 * Lo que dicen vive en `vocesDelRadar.json` (la app y el script que genera los MP3 leen el MISMO archivo) y una pregunta
 * que cambia obliga a volver a grabar su voz: esta prueba falla si no.
 */

const CARPETA = path.resolve(__dirname, '../../../../../assets/sonidos');

describe('lo que dice cada voz', () => {
  it.each(PREGUNTAS_RADAR)('«$titulo» se lee entera: el enunciado y su ayuda, tal cual están en el formulario', pregunta => {
    expect(loQueDiceLaVoz(pregunta.campo)).toBe(`${pregunta.titulo} ${pregunta.ayuda}`);
  });

  it('hay una voz por pregunta y un archivo propio por voz', () => {
    expect(Object.keys(VOZ_DE_LA_PREGUNTA).sort()).toEqual(PREGUNTAS_RADAR.map(p => p.campo).sort());
    expect(new Set(ARCHIVOS_DE_VOZ_DEL_RADAR).size).toBe(PREGUNTAS_RADAR.length);
  });
});

describe('los archivos de las voces', () => {
  it('existen en assets/sonidos y van también en `sounds` de app.json (lo pidió el dueño)', () => {
    const plugin = (appJson.expo.plugins as unknown[]).find(p => Array.isArray(p) && p[0] === 'expo-notifications') as [
      string,
      { sounds: string[] },
    ];
    for (const archivo of ARCHIVOS_DE_VOZ_DEL_RADAR) {
      expect(fs.existsSync(path.join(CARPETA, archivo))).toBe(true);
      expect(plugin[1].sounds).toContain(`./assets/sonidos/${archivo}`);
    }
  });

  it('son MP3 mono de 44,1 kHz a 64 kb/s, como las otras voces, y se oyen en menos de 5 segundos', () => {
    for (const archivo of ARCHIVOS_DE_VOZ_DEL_RADAR) {
      const mp3 = leerMp3(path.join(CARPETA, archivo));
      expect({ archivo, tasa: mp3.tasa, canales: mp3.canales, kbps: mp3.kbps }).toEqual({
        archivo,
        tasa: 44100,
        canales: 1,
        kbps: 64,
      });
      expect(mp3.segundos).toBeGreaterThan(2);
      expect(mp3.segundos).toBeLessThan(5);
    }
  });

  it('los nombres sirven para `res/raw` de Android', () => {
    for (const archivo of ARCHIVOS_DE_VOZ_DEL_RADAR) expect(archivo).toMatch(/^[a-z][a-z0-9_]*\.mp3$/);
  });
});
