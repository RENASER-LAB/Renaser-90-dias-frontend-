import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPermiso = jest.fn<() => Promise<{ granted: boolean }>>();
const mockGaleria = jest.fn<(opciones: unknown) => Promise<unknown>>();
const mockReducir = jest.fn<(uri: string, medidas: unknown) => void>();
const mockGuardar = jest.fn<(opciones: unknown) => Promise<{ uri: string }>>();
const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockPermiso(),
  launchImageLibraryAsync: (opciones: unknown) => mockGaleria(opciones),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (uri: string) => ({
      resize: (medidas: unknown) => {
        mockReducir(uri, medidas);
        return { renderAsync: async () => ({ saveAsync: (opciones: unknown) => mockGuardar(opciones) }) };
      },
    }),
  },
}));
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));

import { LADO_DEL_AVATAR, elegirFotoCuadrada, elegirFotoDePerfil } from '../elegirFotoDePerfil';

/**
 * El selector cuadrado lo comparten la foto de perfil (512 px, como siempre) y la portada de la
 * tarjeta de bienvenida de Administración (1200 px; backend D-210). Generalizarlo no puede cambiar
 * la foto de perfil. `elegirFotoCuadrada` no existía: falla contra el código anterior.
 */

beforeEach(() => {
  mockPermiso.mockReset().mockResolvedValue({ granted: true });
  mockGaleria.mockReset().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///original.jpg' }] });
  mockReducir.mockReset();
  mockGuardar.mockReset().mockResolvedValue({ uri: 'file:///reducida.jpg' });
  mockAlerta.mockReset();
});

describe('elegirFotoDePerfil (no cambia)', () => {
  it('recorte cuadrado nativo, reducida a 512 y en JPEG', async () => {
    await expect(elegirFotoDePerfil()).resolves.toEqual({ uri: 'file:///reducida.jpg', mimeType: 'image/jpeg' });
    expect(LADO_DEL_AVATAR).toBe(512);
    expect(mockGaleria).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] }),
    );
    expect(mockReducir).toHaveBeenCalledWith('file:///original.jpg', { width: 512, height: 512 });
    expect(mockGuardar).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
  });

  it('sin permiso: el mismo aviso de siempre, y null', async () => {
    mockPermiso.mockResolvedValue({ granted: false });

    await expect(elegirFotoDePerfil()).resolves.toBeNull();
    expect(mockAlerta).toHaveBeenCalledWith(
      'Permiso de galería requerido',
      'Renaser necesita acceder a tus fotos para que puedas elegir tu foto de perfil.',
    );
    expect(mockGaleria).not.toHaveBeenCalled();
  });
});

describe('elegirFotoCuadrada (la portada de la tarjeta de bienvenida)', () => {
  const PORTADA = {
    lado: 1200,
    motivoDelPermiso: 'Renaser necesita acceder a tus fotos para que puedas elegir la portada de la tarjeta de bienvenida.',
  };

  it('el mismo recorte cuadrado, reducida al lado pedido: 1200, el lienzo de la tarjeta', async () => {
    await expect(elegirFotoCuadrada(PORTADA)).resolves.toEqual({ uri: 'file:///reducida.jpg', mimeType: 'image/jpeg' });
    expect(mockGaleria).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }));
    expect(mockReducir).toHaveBeenCalledWith('file:///original.jpg', { width: 1200, height: 1200 });
  });

  it('sin permiso: el aviso habla de la portada, no de la foto de perfil', async () => {
    mockPermiso.mockResolvedValue({ granted: false });

    await expect(elegirFotoCuadrada(PORTADA)).resolves.toBeNull();
    expect(mockAlerta).toHaveBeenCalledWith('Permiso de galería requerido', PORTADA.motivoDelPermiso);
  });

  it('si canceló la galería devuelve null sin reducir nada', async () => {
    mockGaleria.mockResolvedValue({ canceled: true, assets: null });

    await expect(elegirFotoCuadrada(PORTADA)).resolves.toBeNull();
    expect(mockReducir).not.toHaveBeenCalled();
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('si la imagen no se puede procesar avisa y devuelve null, sin lanzar', async () => {
    mockGuardar.mockRejectedValue(new Error('formato no soportado'));

    await expect(elegirFotoCuadrada(PORTADA)).resolves.toBeNull();
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo procesar la foto', 'Prueba con otra imagen.');
  });
});
