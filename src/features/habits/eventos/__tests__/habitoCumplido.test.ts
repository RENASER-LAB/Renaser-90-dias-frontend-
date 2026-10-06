/**
 * Cerrar un hábito en el servidor avisa a la app (semáforo vigente, fénix de SER); si el cierre falla, no avisa. Un
 * oyente roto no rompe el cierre.
 */
import { describe, expect, it, jest } from '@jest/globals';

import { completarRegistro } from '../../api/evidenciaHabitoApi';
import { alCumplirUnHabito } from '../habitoCumplido';

const mockApiFetch = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

const respuesta = { id: 'r1', estado: 'COMPLETADO', puntosOtorgados: 5, respuestaTexto: null, completadoEn: null };

describe('aviso de hábito cumplido', () => {
  it('avisa una vez cuando el servidor confirma el cierre', async () => {
    mockApiFetch.mockResolvedValueOnce(respuesta);
    const oyente = jest.fn();
    const quitar = alCumplirUnHabito(oyente);
    await completarRegistro('r1');
    expect(oyente).toHaveBeenCalledTimes(1);
    quitar();
  });

  it('si el cierre falla, no avisa', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('400'));
    const oyente = jest.fn();
    const quitar = alCumplirUnHabito(oyente);
    await expect(completarRegistro('r1')).rejects.toThrow('400');
    expect(oyente).not.toHaveBeenCalled();
    quitar();
  });

  it('un oyente que revienta no rompe el cierre ni a los demás', async () => {
    mockApiFetch.mockResolvedValueOnce(respuesta);
    const otro = jest.fn();
    const q1 = alCumplirUnHabito(() => { throw new Error('roto'); });
    const q2 = alCumplirUnHabito(otro);
    await expect(completarRegistro('r1')).resolves.toMatchObject({ id: 'r1' });
    expect(otro).toHaveBeenCalledTimes(1);
    q1();
    q2();
  });
});
