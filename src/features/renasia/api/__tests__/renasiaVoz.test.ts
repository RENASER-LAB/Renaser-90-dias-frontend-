import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://api' } }));
jest.mock('../../../../services/http/apiClient', () => ({ getTokenSesion: () => 'token' }));

import { rutaDelAudio } from '../renasiaVoz';

describe('rutaDelAudio', () => {
  it('acepta la ruta del audio que devuelve el backend', () => {
    expect(rutaDelAudio({ audio: '/api/v1/renasia/voz/3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f' })).toBe(
      '/api/v1/renasia/voz/3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f'
    );
  });

  it.each([
    ['otro host', { audio: 'https://otro.com/robar' }],
    ['otra ruta', { audio: '/api/v1/usuarios/yo' }],
    ['salirse de la ruta', { audio: '/api/v1/renasia/voz/../../usuarios' }],
    ['sin audio', {}],
    ['nulo', null],
  ])('rechaza %s: el reproductor le mandaría el token de sesión', (_caso, cuerpo) => {
    expect(rutaDelAudio(cuerpo)).toBeNull();
  });
});
