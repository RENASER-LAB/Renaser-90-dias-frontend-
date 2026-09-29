/**
 * D-229 del backend: la persona le pide a SER un hábito nuevo y toca Confirmar en la tarjeta. Sin el
 * aviso, Training y Hoy (que cargan al montarse) no lo mostraban hasta recargar a mano. Contra el
 * código anterior falla: `confirmarPropuestaRenasia` no avisaba a nadie.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {}
  return { ApiError, apiFetch: jest.fn() };
});

import { apiFetch } from '../../../../services/http/apiClient';
import { confirmarPropuestaRenasia } from '../renasiaApi';
import { escucharPropuestaConfirmada } from '../../events/avisoPropuestaConfirmada';

const pedir = jest.mocked(apiFetch);

describe('confirmar una propuesta de SER avisa a Training y Hoy', () => {
  beforeEach(() => {
    pedir.mockReset();
  });

  it('CONFIRMADA avisa una vez; FALLIDA no avisa', async () => {
    const oyente = jest.fn();
    const baja = escucharPropuestaConfirmada(oyente);

    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: "Hábito 'Leer' creado en Mente, a las 06:00." });
    await confirmarPropuestaRenasia('3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f');
    expect(oyente).toHaveBeenCalledTimes(1);

    pedir.mockResolvedValueOnce({ estado: 'FALLIDA', mensaje: "Ya tienes un hábito llamado 'Leer'." });
    await confirmarPropuestaRenasia('3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f');
    expect(oyente).toHaveBeenCalledTimes(1);

    baja();
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Listo.' });
    await confirmarPropuestaRenasia('3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f');
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('un oyente roto no tumba la confirmación, que ya se aplicó', async () => {
    const baja = escucharPropuestaConfirmada(() => {
      throw new Error('pantalla desmontada');
    });
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    pedir.mockResolvedValueOnce({ estado: 'CONFIRMADA', mensaje: 'Listo.' });

    await expect(confirmarPropuestaRenasia('3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f')).resolves.toEqual({
      estado: 'CONFIRMADA',
      mensaje: 'Listo.',
    });
    baja();
    aviso.mockRestore();
  });
});
