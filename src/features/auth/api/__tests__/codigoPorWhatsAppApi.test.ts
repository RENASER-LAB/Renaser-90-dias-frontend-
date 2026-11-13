import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: Record<string, unknown>) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: Record<string, unknown>) => mockApiFetch(ruta, opciones),
}));

import {
  codigoPorWhatsAppDisponible,
  comprobarNumeroDelRegistro,
  pedirCodigoDeRecuperacionPorWhatsApp,
  pedirCodigoDelRegistroPorWhatsApp,
} from '../codigoPorWhatsAppApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('la API del código por WhatsApp (spec 043)', () => {
  // spec 043 FR-013
  it('disponible solo con 200 y available: true; un 404 (apagado o backend anterior) o un error es false, sin lanzar', async () => {
    mockApiFetch.mockResolvedValueOnce({ available: true });
    await expect(codigoPorWhatsAppDisponible()).resolves.toBe(true);
    mockApiFetch.mockResolvedValueOnce({ available: false });
    await expect(codigoPorWhatsAppDisponible()).resolves.toBe(false);
    mockApiFetch.mockRejectedValueOnce(Object.assign(new Error('no'), { status: 404 }));
    await expect(codigoPorWhatsAppDisponible()).resolves.toBe(false);
    mockApiFetch.mockResolvedValueOnce('basura');
    await expect(codigoPorWhatsAppDisponible()).resolves.toBe(false);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/auth/whatsapp-code');
    expect(mockApiFetch.mock.calls[0][1]).toMatchObject({ conSesion: false });
  });

  // spec 043 FR-005
  it('el alta manda el correo y el WhatsApp escrito y devuelve el número enmascarado', async () => {
    mockApiFetch.mockResolvedValueOnce({ sentTo: '+51 9•• ••• •21' });
    await expect(pedirCodigoDelRegistroPorWhatsApp(' ana@renaser.test ', '+51 987654321')).resolves.toBe('+51 9•• ••• •21');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/auth/whatsapp-code/registration', {
      method: 'POST',
      body: { email: 'ana@renaser.test', whatsapp: '+51 987654321' },
      conSesion: false,
    });
  });

  // spec 043 FR-008
  it('la recuperación manda solo el correo: no hay forma de poner otro número', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await pedirCodigoDeRecuperacionPorWhatsApp('ana@renaser.test');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/auth/whatsapp-code/password', {
      method: 'POST',
      body: { email: 'ana@renaser.test' },
      conSesion: false,
    });
  });

  // spec 051 FR-014, FR-019
  it('comprobar el número manda solo el WhatsApp escrito, sin sesión; el motivo del servidor (409) sube tal cual', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await expect(comprobarNumeroDelRegistro(' +51 987654321 ')).resolves.toBeUndefined();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/auth/whatsapp-code/number', {
      method: 'POST',
      body: { whatsapp: '+51 987654321' },
      conSesion: false,
    });
    const enUso = Object.assign(new Error('Ese número de WhatsApp ya está en uso en otra cuenta.'), { status: 409 });
    mockApiFetch.mockRejectedValueOnce(enUso);
    await expect(comprobarNumeroDelRegistro('+51 987654321')).rejects.toBe(enUso);
  });

  // spec 051 FR-014
  it('contra un servidor anterior o con el interruptor apagado (404) no bloquea el paso', async () => {
    mockApiFetch.mockRejectedValueOnce(Object.assign(new Error('no'), { status: 404 }));
    await expect(comprobarNumeroDelRegistro('+51 987654321')).resolves.toBeUndefined();
  });
});
