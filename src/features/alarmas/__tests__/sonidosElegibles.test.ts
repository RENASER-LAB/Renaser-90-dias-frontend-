/**
 * Los sonidos que eligió el dueño el 2026-09-27: cuatro «para alertar» y cuatro «para relajar», que
 * la persona elige en Yo → Alarmas, y los archivos que van dentro del APK.
 *
 * Contra el código anterior falla: solo existían «El del teléfono», «Campana Renaser», «Voz» y «Solo
 * vibrar»; ni los grupos, ni los canales `-alertar-*`/`-relajar-*`, ni los MP3.
 *
 * La parte de archivos es la guardia de lo que no se ve hasta tener el teléfono en la mano: que cada
 * archivo que el código puede nombrar esté en `assets/sonidos/` Y en `sounds` de `app.json` (si falta
 * en el APK, Android crea el canal con el sonido del sistema y ese canal queda así para siempre), que
 * el nombre sirva para `res/raw`, y que no se cuele peso de más.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import appJson from '../../../../app.json';
import { leerPreferencias } from '../preferenciasDeAlarmas';
import { planDeRearmado } from '../rearmarAlarmas';
import {
  ARCHIVOS_DE_SONIDO,
  archivoDelCanal,
  canalDeAlarma,
  esSonido,
  GRUPOS_DE_SONIDOS,
  SONIDO_POR_DEFECTO,
  SONIDOS,
  type SonidoDeAlarma,
  type TipoDeAlarma,
} from '../sonidoDeAlarma';
import { CANAL_DE_MENSAJES } from '../../chat/avisos/canalDeMensajes';
import { leerMp3 } from './leerMp3';

const RAIZ = path.resolve(__dirname, '../../../..');
const CARPETA = path.join(RAIZ, 'assets/sonidos');
const TIPOS: TipoDeAlarma[] = ['habitos', 'eventos', 'objetivos'];
const AHORA = new Date(2026, 8, 27, 10, 0, 0, 0).getTime();

const ALERTAR = ['alertar-amanecer', 'alertar-marimba', 'alertar-campana', 'alertar-kalimba'];
const RELAJAR = ['relajar-cuenco', 'relajar-campanitas', 'relajar-lluvia', 'relajar-ruido-marron'];

function sonidosDeAppJson(): string[] {
  const plugin = (appJson.expo.plugins as unknown[]).find(
    p => Array.isArray(p) && p[0] === 'expo-notifications',
  ) as [string, { sounds: string[] }];
  return plugin[1].sounds;
}

describe('los ocho sonidos, en dos grupos', () => {
  it('«Para alertar» y «Para relajar» tienen los cuatro de cada uno, en el orden del dueño', () => {
    expect(SONIDOS.filter(s => s.grupo === 'alertar').map(s => s.clave)).toEqual(ALERTAR);
    expect(SONIDOS.filter(s => s.grupo === 'relajar').map(s => s.clave)).toEqual(RELAJAR);
    expect(GRUPOS_DE_SONIDOS.map(g => g.titulo)).toEqual([null, 'Para alertar', 'Para relajar']);
  });

  it('los de siempre siguen primero, y el sonido por defecto no cambia', () => {
    expect(SONIDOS.filter(s => s.grupo === 'basicos').map(s => s.clave)).toEqual(['sistema', 'campana', 'voz', 'vibrar']);
    expect(SONIDO_POR_DEFECTO).toBe('sistema');
    expect(canalDeAlarma('habitos', SONIDO_POR_DEFECTO)).toMatchObject({ id: 'recordatorios-habitos', sonidoDelAviso: true });
  });

  it('se guardan y se leen; una elección vieja sigue valiendo y una desconocida vuelve al del teléfono', () => {
    for (const clave of [...ALERTAR, ...RELAJAR, 'sistema', 'campana', 'voz', 'vibrar']) {
      expect(esSonido(clave)).toBe(true);
      expect(leerPreferencias(JSON.stringify({ eventosActivas: true, sonido: clave })).sonido).toBe(clave);
    }
    expect(leerPreferencias('{"eventosActivas":true,"sonido":"relajar-olas"}').sonido).toBe('sistema');
  });

  it('cada sonido tiene su canal por tipo, con su archivo (en Android el sonido es del canal)', () => {
    expect(canalDeAlarma('habitos', 'alertar-amanecer')).toEqual({
      id: 'recordatorios-habitos-alertar-amanecer',
      nombre: 'Recordatorios de hábitos (amanecer)',
      sonidoDelCanal: 'alertar_amanecer.mp3',
      sonidoDelAviso: 'alertar_amanecer.mp3',
    });
    expect(canalDeAlarma('eventos', 'relajar-lluvia')).toMatchObject({ id: 'recordatorios-eventos-relajar-lluvia', sonidoDelCanal: 'relajar_lluvia.mp3' });
    expect(canalDeAlarma('objetivos', 'relajar-ruido-marron')).toMatchObject({
      id: 'recordatorios-objetivos-relajar-ruido-marron',
      nombre: 'Acciones de tus objetivos (ruido marrón)',
      sonidoDelCanal: 'relajar_ruido_marron.mp3',
    });
  });

  it('los canales de antes no cambian de id ni de archivo (quien ya eligió algo sigue igual)', () => {
    expect(canalDeAlarma('eventos', 'sistema').id).toBe('recordatorios-eventos');
    expect(canalDeAlarma('habitos', 'campana')).toMatchObject({ id: 'recordatorios-habitos-campana', sonidoDelCanal: 'campana_renaser.wav' });
    expect(canalDeAlarma('objetivos', 'vibrar')).toMatchObject({ id: 'recordatorios-objetivos-vibrar', sonidoDelCanal: null });
    expect(canalDeAlarma('eventos', 'voz')).toMatchObject({ id: 'recordatorios-eventos-voz', sonidoDelCanal: 'voz_evento.mp3' });
  });

  it('ningún id de canal lleva dos archivos distintos (un canal no cambia su sonido una vez creado)', () => {
    const archivoPorId = new Map<string, unknown>();
    for (const tipo of TIPOS) {
      for (const { clave } of SONIDOS) {
        const canal = canalDeAlarma(tipo, clave as SonidoDeAlarma);
        if (archivoPorId.has(canal.id)) expect(archivoPorId.get(canal.id)).toBe(canal.sonidoDelCanal);
        archivoPorId.set(canal.id, canal.sonidoDelCanal);
      }
    }
    expect(archivoPorId.size).toBe(TIPOS.length * SONIDOS.length);
  });

  it('el rearmado nombra el archivo de cada canal nuevo: una alarma con lluvia no vuelve con la campana', () => {
    for (const tipo of TIPOS) {
      for (const clave of [...ALERTAR, ...RELAJAR]) {
        const canal = canalDeAlarma(tipo, clave as SonidoDeAlarma);
        expect(archivoDelCanal(canal.id)).toBe(canal.sonidoDelCanal);
        const [pedido] = planDeRearmado(
          [{ identifier: 'a', content: { title: 'x', sound: 'custom' }, trigger: { type: 'date', value: AHORA + 3600_000, channelId: canal.id } }],
          AHORA,
        );
        expect(pedido.content.sound).toBe(canal.sonidoDelCanal);
      }
    }
  });
});

describe('los archivos que van en el APK', () => {
  const enAppJson = sonidosDeAppJson();
  const enCarpeta = fs.readdirSync(CARPETA).sort();
  /* Los de las alarmas y, desde D-221 (2026-09-29), el del canal de mensajes del chat. */
  const NOMBRADOS = [...ARCHIVOS_DE_SONIDO, CANAL_DE_MENSAJES.sonido];

  it('cada archivo que el código puede nombrar está en assets/sonidos y en `sounds` de app.json', () => {
    for (const archivo of NOMBRADOS) {
      expect(enAppJson).toContain(`./assets/sonidos/${archivo}`);
      expect(fs.existsSync(path.join(CARPETA, archivo))).toBe(true);
    }
  });

  it('y nada más: ni un archivo sin usar en el APK, ni uno en app.json que el código no nombre', () => {
    expect(enAppJson.map(s => path.basename(s)).sort()).toEqual([...NOMBRADOS].sort());
    expect(enCarpeta).toEqual([...NOMBRADOS].sort());
  });

  it('nombres válidos para Android res/raw y sin dos con el mismo nombre base', () => {
    const bases = enCarpeta.map(a => a.replace(/\.[a-z0-9]+$/, ''));
    for (const archivo of enCarpeta) expect(archivo).toMatch(/^[a-z][a-z0-9_]*\.(mp3|wav)$/);
    expect(new Set(bases).size).toBe(bases.length);
  });

  it('los sonidos nuevos son MP3 mono de 44,1 kHz: voces a 64 kb/s, alarmas a 128 kb/s', () => {
    for (const archivo of enCarpeta.filter(a => a.endsWith('.mp3'))) {
      const mp3 = leerMp3(path.join(CARPETA, archivo));
      expect({ archivo, tasa: mp3.tasa, canales: mp3.canales }).toEqual({ archivo, tasa: 44100, canales: 1 });
      expect({ archivo, kbps: mp3.kbps }).toEqual({ archivo, kbps: archivo.startsWith('voz_') ? 64 : 128 });
    }
  });

  it('duraciones: las alarmas de 5 a 12 s (iOS no acepta más de 30), la voz de un hábito es rápida', () => {
    for (const archivo of enCarpeta.filter(a => /^(alertar|relajar)_/.test(a))) {
      const { segundos } = leerMp3(path.join(CARPETA, archivo));
      expect(segundos).toBeGreaterThan(5);
      expect(segundos).toBeLessThan(12.5);
    }
    // «Que sea rápido como está»: campanita + nombre en menos de 3 s.
    for (const archivo of enCarpeta.filter(a => a.startsWith('voz_habito_'))) {
      const { segundos } = leerMp3(path.join(CARPETA, archivo));
      expect({ archivo, rapida: segundos > 1.2 && segundos < 3 }).toEqual({ archivo, rapida: true });
    }
    expect(leerMp3(path.join(CARPETA, 'voz_objetivos.mp3')).segundos).toBeLessThan(4);
  });

  it('el peso que suman los sonidos al APK no pasa de 2 MB (hoy ~1,6 MB; subirlo tiene que ser a propósito)', () => {
    const bytes = enCarpeta.reduce((suma, a) => suma + fs.statSync(path.join(CARPETA, a)).size, 0);
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it('D-221: el aviso de mensaje es un WAV mono 16 bit de 44,1 kHz y corto (menos de 1 s)', () => {
    const wav = fs.readFileSync(path.join(CARPETA, CANAL_DE_MENSAJES.sonido));
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(1); // canales
    expect(wav.readUInt32LE(24)).toBe(44100);
    expect(wav.readUInt16LE(34)).toBe(16);
    const bytesPorSegundo = wav.readUInt32LE(28);
    expect(wav.length / bytesPorSegundo).toBeLessThan(1);
  });

  it('el lector de MP3 rechaza lo que no es un MP3', () => {
    expect(() => leerMp3(path.join(CARPETA, 'campana_renaser.wav'))).toThrow(/no tiene cuadros MP3/);
  });
});
