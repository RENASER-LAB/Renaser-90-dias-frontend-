/** Spec 048 (FR-017): el audio se baja una vez, se escucha desde el teléfono y se borra a los 7 días. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockBajadas: string[] = [];
const mockBorrados: string[] = [];
jest.mock('expo-file-system', () => {
  class Directory {
    uri = 'file:///docs/renaser-audios';
    exists = true;
    create() {}
  }
  class File {
    uri: string;
    exists = false;
    constructor(a: unknown, b?: string) {
      this.uri = typeof a === 'string' ? a : `${(a as Directory).uri}/${b}`;
      if (typeof a === 'string') this.exists = true;
    }
    delete() {
      mockBorrados.push(this.uri);
    }
    static downloadFileAsync = async (url: string, destino: File) => {
      mockBajadas.push(url);
      return destino;
    };
  }
  return { Directory, File, Paths: { document: 'docs' } };
});

import { _reiniciarAudios, cargarAudiosGuardados, claveDelAudio, fuenteDelAudio, prepararAudio } from '../audiosDelDia';

const CLAVE = claveDelAudio('Pastilla Renaser', 12);
const URL = 'https://s3.test/audio-12.mp3?firma=abc';

beforeEach(async () => {
  await AsyncStorage.clear();
  _reiniciarAudios();
  mockBajadas.length = 0;
  mockBorrados.length = 0;
});

describe('audios del día (spec 048)', () => {
  it('con señal se baja una sola vez y después se reproduce desde el teléfono', async () => { // spec 048 FR-017
    expect(fuenteDelAudio(CLAVE, URL)).toBe(URL);
    await prepararAudio(CLAVE, URL);
    await prepararAudio(CLAVE, URL);

    expect(mockBajadas).toEqual([URL]);
    expect(fuenteDelAudio(CLAVE, URL)).toBe('file:///docs/renaser-audios/pastilla-renaser-12.audio');
  });

  it('los bajados hace más de 7 días se borran al abrir la app', async () => { // spec 048 FR-017
    await prepararAudio(CLAVE, URL, Date.parse('2026-11-01T10:00:00Z'));
    _reiniciarAudios();

    await cargarAudiosGuardados(Date.parse('2026-11-09T10:00:00Z'));

    expect(mockBorrados).toEqual(['file:///docs/renaser-audios/pastilla-renaser-12.audio']);
    expect(fuenteDelAudio(CLAVE, URL)).toBe(URL);
  });
});
