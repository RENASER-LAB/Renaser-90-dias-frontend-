import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { guardarPapelRecordado, leerPapelRecordado } from '../papelRecordado';

/** Spec 018, FR-005: Hoy recuerda el último papel por cuenta, y un almacenamiento roto no lo tumba. */
describe('el papel de Hoy que se recuerda', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('sin nada guardado no hay elección', async () => {
    expect(await leerPapelRecordado('u1')).toBeNull();
  });

  it('guarda y lee lo último que se eligió', async () => {
    await guardarPapelRecordado('u1', 'mentores');
    expect(await leerPapelRecordado('u1')).toBe('mentores');
    await guardarPapelRecordado('u1', 'grupo');
    expect(await leerPapelRecordado('u1')).toBe('grupo');
  });

  it('es por cuenta: en un mismo teléfono la elección de una no es de la otra', async () => {
    await guardarPapelRecordado('u1', 'mentores');
    await guardarPapelRecordado('u2', 'grupo');
    expect(await leerPapelRecordado('u1')).toBe('mentores');
    expect(await leerPapelRecordado('u2')).toBe('grupo');
    expect(await leerPapelRecordado('u3')).toBeNull();
  });

  it('un valor que no es un papel se lee como «sin elección»', async () => {
    await AsyncStorage.setItem('renaser.hoy.papel.u1', 'cualquier-cosa');
    expect(await leerPapelRecordado('u1')).toBeNull();
  });

  it('si el almacenamiento falla, no tumba nada: leer da «sin elección» y guardar no lanza', async () => {
    // `mockRejectedValueOnce` sobre el doble de AsyncStorage: no deja ningún cambio para las pruebas que siguen.
    (AsyncStorage.getItem as unknown as jest.Mock<(clave: string) => Promise<string | null>>).mockRejectedValueOnce(
      new Error('disco lleno'),
    );
    expect(await leerPapelRecordado('u1')).toBeNull();
    (AsyncStorage.setItem as unknown as jest.Mock<(clave: string, valor: string) => Promise<void>>).mockRejectedValueOnce(
      new Error('disco lleno'),
    );
    await expect(guardarPapelRecordado('u1', 'grupo')).resolves.toBeUndefined();
  });
});
