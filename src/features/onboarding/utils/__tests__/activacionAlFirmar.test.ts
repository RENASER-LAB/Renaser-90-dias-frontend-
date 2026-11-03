import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Activar el programa al firmar (spec 036, ajuste del 2026-11-02): un solo pedido sin fecha, que el servidor resuelve a «mañana»; un pedido en
 * vuelo se comparte; y contra un servidor anterior a la 036 (que exige la fecha) se activa con la primera que ofrece.
 */

const mockConsultar = jest.fn<() => Promise<unknown>>();
const mockActivar = jest.fn<(input?: { startDate?: string }) => Promise<unknown>>();
const mockAviso = jest.fn();

jest.mock('../../../../services/http/apiClient', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(estado: number, message: string) { super(message); this.status = estado; }
  },
}));
jest.mock('../../api/onboardingApi', () => ({
  consultarActivacionPrograma: () => mockConsultar(),
  activarPrograma: (input?: { startDate?: string }) => mockActivar(input),
}));
jest.mock('../../../programa/events/avisoDiaUnoElegido', () => ({ avisarDiaUnoElegido: () => mockAviso() }));

import { ApiError } from '../../../../services/http/apiClient';
import { activarElProgramaDeManana } from '../activacionAlFirmar';

const respuesta = (startDate: string) => ({
  traineeProfileId: 'u-1', programDay: 0, programActivatedAt: '2026-11-02T20:00:00Z', startDate, expectedGraduationDate: '2027-01-30',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockActivar.mockResolvedValue(respuesta('2026-11-03'));
  mockConsultar.mockResolvedValue({ activated: false, validStartDates: ['2026-11-03', '2026-11-04', '2026-11-05'], startDate: null });
});

describe('activarElProgramaDeManana', () => {
  it('manda un solo pedido, sin fecha, y devuelve la que dijo el servidor', async () => {
    await expect(activarElProgramaDeManana()).resolves.toBe('2026-11-03');
    expect(mockActivar).toHaveBeenCalledTimes(1);
    expect(mockActivar).toHaveBeenCalledWith(undefined);
    expect(mockConsultar).not.toHaveBeenCalled();
    expect(mockAviso).toHaveBeenCalledTimes(1);
  });

  it('dos llamadas mientras el pedido sigue en vuelo comparten el mismo pedido', async () => {
    let responder!: (valor: unknown) => void;
    mockActivar.mockReturnValueOnce(new Promise(resolve => { responder = resolve; }));
    const primera = activarElProgramaDeManana();
    const segunda = activarElProgramaDeManana();
    expect(mockActivar).toHaveBeenCalledTimes(1);
    responder(respuesta('2026-11-03'));
    await expect(Promise.all([primera, segunda])).resolves.toEqual(['2026-11-03', '2026-11-03']);
    expect(mockAviso).toHaveBeenCalledTimes(1);
  });

  it('terminado el pedido, otra llamada manda uno nuevo (es idempotente: el servidor responde 200)', async () => {
    await activarElProgramaDeManana();
    await activarElProgramaDeManana();
    expect(mockActivar).toHaveBeenCalledTimes(2);
  });

  it('un fallo no deja el pedido pegado: la llamada siguiente vuelve a pedir', async () => {
    mockActivar.mockRejectedValueOnce(new Error('sin conexión'));
    await expect(activarElProgramaDeManana()).rejects.toThrow('sin conexión');
    expect(mockAviso).not.toHaveBeenCalled();
    await expect(activarElProgramaDeManana()).resolves.toBe('2026-11-03');
    expect(mockActivar).toHaveBeenCalledTimes(2);
  });

  it('un 5xx o un error de red se propaga tal cual (no se confunde con un servidor anterior)', async () => {
    mockActivar.mockRejectedValueOnce(new ApiError(503, 'caído'));
    await expect(activarElProgramaDeManana()).rejects.toMatchObject({ status: 503 });
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  describe('contra un servidor anterior a la spec 036, que responde 400 si falta la fecha', () => {
    it('lee las fechas que ofrece y activa con la primera (mañana)', async () => {
      mockActivar
        .mockRejectedValueOnce(new ApiError(400, 'startDate es obligatoria'))
        .mockResolvedValueOnce(respuesta('2026-11-03'));
      await expect(activarElProgramaDeManana()).resolves.toBe('2026-11-03');
      expect(mockActivar.mock.calls).toEqual([[undefined], [{ startDate: '2026-11-03' }]]);
    });

    it('si ya estaba activado usa la fecha que tiene, sin volver a activar', async () => {
      mockActivar.mockRejectedValueOnce(new ApiError(400, 'startDate es obligatoria'));
      mockConsultar.mockResolvedValue({ activated: true, validStartDates: [], startDate: '2026-11-03' });
      await expect(activarElProgramaDeManana()).resolves.toBe('2026-11-03');
      expect(mockActivar).toHaveBeenCalledTimes(1);
    });

    it('si no ofrece ninguna fecha, falla en vez de inventar una', async () => {
      mockActivar.mockRejectedValueOnce(new ApiError(400, 'startDate es obligatoria'));
      mockConsultar.mockResolvedValue({ activated: false, validStartDates: [], startDate: null });
      await expect(activarElProgramaDeManana()).rejects.toThrow();
    });
  });
});
