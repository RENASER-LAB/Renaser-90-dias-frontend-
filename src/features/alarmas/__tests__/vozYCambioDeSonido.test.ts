/**
 * La «Voz» como sonido de las alarmas (decisión del dueño del 2026-09-26) y el paso de las alarmas ya
 * programadas al sonido nuevo.
 *
 * Contra el código viejo falla: no existía el sonido `'voz'`, ni los archivos, ni el canal de
 * objetivos, y cambiar el sonido en Yo → Alarmas no tocaba los recordatorios de los demás hábitos.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import appJson from '../../../../app.json';
import { planDeCambioDeSonido } from '../cambioDeSonido';
import { leerPreferencias } from '../preferenciasDeAlarmas';
import { planDeRearmado, type AlarmaProgramada } from '../rearmarAlarmas';
import { ARCHIVO_VOZ, archivoDelCanal, canalDeAlarma, esSonido, SONIDOS } from '../sonidoDeAlarma';

const RAIZ = path.resolve(__dirname, '../../../..');
const AHORA = new Date(2026, 8, 26, 10, 0, 0, 0).getTime();
const MIN = 60 * 1000;

describe('la voz: un archivo por tipo, cada uno con su frase', () => {
  it('«Voz» es una opción de Yo → Alarmas y se guarda', () => {
    expect(SONIDOS.map(s => s.clave)).toContain('voz');
    expect(esSonido('voz')).toBe(true);
    expect(leerPreferencias('{"eventosActivas":true,"sonido":"voz"}').sonido).toBe('voz');
  });

  it('cada tipo sale por su propio canal «-voz» con su archivo (en Android el sonido es del canal)', () => {
    expect(canalDeAlarma('habitos', 'voz')).toMatchObject({
      id: 'recordatorios-habitos-voz',
      sonidoDelCanal: 'voz_habito.wav',
      sonidoDelAviso: 'voz_habito.wav',
    });
    expect(canalDeAlarma('eventos', 'voz')).toMatchObject({ id: 'recordatorios-eventos-voz', sonidoDelCanal: 'voz_evento.wav' });
    expect(canalDeAlarma('objetivos', 'voz')).toMatchObject({ id: 'recordatorios-objetivos-voz', sonidoDelCanal: 'voz_objetivos.wav' });
  });

  it('el canal de hábitos con el sonido del teléfono sigue siendo el de siempre', () => {
    expect(canalDeAlarma('habitos', 'sistema').id).toBe('recordatorios-habitos');
    expect(canalDeAlarma('objetivos', 'sistema').id).toBe('recordatorios-objetivos');
  });

  it('los tres archivos existen, van en el plugin de app.json y tienen nombre válido para res/raw', () => {
    const plugin = (appJson.expo.plugins as unknown[]).find(
      p => Array.isArray(p) && p[0] === 'expo-notifications',
    ) as [string, { sounds: string[] }];
    for (const archivo of Object.values(ARCHIVO_VOZ)) {
      expect(archivo).toMatch(/^[a-z][a-z0-9_]*\.wav$/);
      expect(plugin[1].sounds).toContain(`./assets/sonidos/${archivo}`);
      expect(fs.existsSync(path.join(RAIZ, 'assets/sonidos', archivo))).toBe(true);
    }
  });

  it('son WAV mono de 16 bits a 44,1 kHz y duran menos de 5 s', () => {
    for (const archivo of Object.values(ARCHIVO_VOZ)) {
      const wav = fs.readFileSync(path.join(RAIZ, 'assets/sonidos', archivo));
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
      // Se busca el bloque `fmt ` y el `data` sin suponer su posición (ffmpeg puede meter `LIST`).
      let i = 12;
      let formato: { canales: number; tasa: number; bits: number; bytesPorSegundo: number } | null = null;
      let bytesDeAudio = 0;
      while (i + 8 <= wav.length) {
        const id = wav.toString('ascii', i, i + 4);
        const largo = wav.readUInt32LE(i + 4);
        if (id === 'fmt ') {
          formato = {
            canales: wav.readUInt16LE(i + 10),
            tasa: wav.readUInt32LE(i + 12),
            bytesPorSegundo: wav.readUInt32LE(i + 16),
            bits: wav.readUInt16LE(i + 22),
          };
        }
        if (id === 'data') bytesDeAudio = largo;
        i += 8 + largo + (largo % 2);
      }
      expect(formato).toMatchObject({ canales: 1, tasa: 44100, bits: 16 });
      const segundos = bytesDeAudio / formato!.bytesPorSegundo;
      expect(segundos).toBeGreaterThan(1);
      expect(segundos).toBeLessThan(5);
    }
  });

  it('el rearmado nombra el archivo del canal: una alarma con voz no vuelve con la campana', () => {
    expect(archivoDelCanal('recordatorios-eventos-voz')).toBe('voz_evento.wav');
    expect(archivoDelCanal('recordatorios-habitos-campana')).toBe('campana_renaser.wav');
    expect(archivoDelCanal('recordatorios-habitos')).toBeNull();
    const [pedido] = planDeRearmado(
      [{ identifier: 'a', content: { title: 'x', sound: 'custom' }, trigger: { type: 'date', value: AHORA + 60 * MIN, channelId: 'recordatorios-objetivos-voz' } }],
      AHORA,
    );
    expect(pedido.content.sound).toBe('voz_objetivos.wav');
  });
});

describe('pasar las alarmas ya programadas al sonido nuevo', () => {
  const diaria = (id: string, hora: number, canal = 'recordatorios-habitos'): AlarmaProgramada => ({
    identifier: id,
    content: { title: 'Leer', body: 'Te toca a las 09:30.', sound: 'default' },
    trigger: { type: 'daily', hour: hora, minute: 30, channelId: canal },
  });

  it('cambia canal y sonido, conserva id, texto y hora, y no toca alarmas ajenas', () => {
    const plan = planDeCambioDeSonido(
      [diaria('mia', 21), diaria('ajena', 21)],
      new Set(['mia']),
      canalDeAlarma('habitos', 'voz'),
      AHORA,
    );
    expect(plan).toEqual([
      {
        identifier: 'mia',
        content: { title: 'Leer', body: 'Te toca a las 09:30.', sound: 'voz_habito.wav' },
        trigger: { type: 'daily', hour: 21, minute: 30, channelId: 'recordatorios-habitos-voz' },
      },
    ]);
  });

  it('también pasa una diaria que acaba de sonar (si no, quedaría con el sonido viejo todos los días)', () => {
    // 09:30 con el reloj a las 10:00: el rearmado la respeta; el cambio de sonido no puede.
    expect(planDeRearmado([diaria('mia', 9)], AHORA)).toEqual([]);
    expect(planDeCambioDeSonido([diaria('mia', 9)], new Set(['mia']), canalDeAlarma('habitos', 'voz'), AHORA)).toHaveLength(1);
  });

  it('es idempotente: lo que ya está en el canal nuevo no se vuelve a programar', () => {
    const plan = planDeCambioDeSonido(
      [diaria('mia', 21, 'recordatorios-habitos-voz')],
      new Set(['mia']),
      canalDeAlarma('habitos', 'voz'),
      AHORA,
    );
    expect(plan).toEqual([]);
  });

  it('volver a «El del teléfono» manda el sonido del sistema y el canal de siempre', () => {
    const [pedido] = planDeCambioDeSonido(
      [diaria('mia', 21, 'recordatorios-habitos-voz')],
      new Set(['mia']),
      canalDeAlarma('habitos', 'sistema'),
      AHORA,
    );
    expect(pedido.content.sound).toBe(true);
    expect((pedido.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos');
  });
});
