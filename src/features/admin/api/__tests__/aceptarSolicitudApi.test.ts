import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

import { aprobarSolicitud, leerOpcionesDeAceptacion, listarSolicitudes } from '../adminApi';
import { solicitudSchema } from '../adminSchemas';

describe('aceptar con formación (spec 025)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(undefined);
  });

  it('manda el rol, las formaciones, la duración elegida y el diagnóstico', async () => {
    await aprobarSolicitud('s-1', 'TRAINEE', null, { formaciones: ['DIPLOMADO'], duracionDias: 365, conDiagnostico: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', {
      method: 'POST',
      body: { role: 'TRAINEE', formations: ['DIPLOMADO'], durationDays: 365, withDiagnosis: true },
    });
  });

  it('sin duración elegida no manda durationDays; Administración manda las formaciones vacías', async () => {
    await aprobarSolicitud('s-1', 'ADMIN', null, { formaciones: [], duracionDias: null, conDiagnostico: false });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', {
      method: 'POST',
      body: { role: 'ADMIN', formations: [], withDiagnosis: false },
    });
  });

  it('con un rol personalizado manda también su id', async () => {
    await aprobarSolicitud('s-1', 'MENTOR', 'rp-1', { formaciones: ['ESCUELA'], duracionDias: null, conDiagnostico: false });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', {
      method: 'POST',
      body: { role: 'MENTOR', rolPersonalizadoId: 'rp-1', formations: ['ESCUELA'], withDiagnosis: false },
    });
  });

  it('contra un servidor sin las opciones (sin elección) el pedido es el de siempre: solo el rol', async () => {
    await aprobarSolicitud('s-1', 'MENTOR', null, null);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', { method: 'POST', body: { role: 'MENTOR' } });
  });
});

describe('el listado de solicitudes', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ content: [], total: 0, page: 0, size: 20 });
  });

  it('el filtro de formación viaja al servidor; sin filtro, no', async () => {
    await listarSolicitudes('APPROVED', 0, 'DIPLOMADO');
    expect(String(mockApiFetch.mock.calls[0][0])).toContain('formation=DIPLOMADO');
    mockApiFetch.mockClear();
    await listarSolicitudes('PENDING', 0);
    expect(String(mockApiFetch.mock.calls[0][0])).not.toContain('formation');
  });

  it('lee lo elegido al aceptar y tolera que no venga', () => {
    const base = { id: 's-1', fullName: 'Ana', email: 'a@x.com', status: 'APPROVED' };
    const con = solicitudSchema.parse({
      ...base,
      reviewedByName: 'Luis',
      acceptance: { formations: ['DIPLOMADO'], durationDays: 365, role: 'TRAINEE', withDiagnosis: true, campoNuevo: 1 },
    });
    expect(con.acceptance?.formations).toEqual(['DIPLOMADO']);
    expect(con.reviewedByName).toBe('Luis');
    expect(solicitudSchema.parse(base).acceptance).toBeUndefined();
    expect(solicitudSchema.parse({ ...base, acceptance: 'raro' }).acceptance).toBeNull();
  });
});

describe('las opciones de la hoja «Aceptar»', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('las lee tal como las manda el servidor', async () => {
    mockApiFetch.mockResolvedValue({
      formations: [{ code: 'DIPLOMADO', name: 'Diplomado Renaser', durationsDays: [90, 365], durationLabels: ['3 meses', '1 año'], defaultDurationDays: 90 }],
      diagnosisAvailable: true,
    });
    const opciones = await leerOpcionesDeAceptacion();
    expect(opciones?.formations[0].durationLabels).toEqual(['3 meses', '1 año']);
    expect(opciones?.diagnosisAvailable).toBe(true);
  });

  it('un servidor anterior (404), una respuesta rara o sin formaciones es «no lo ofrece»: null', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('404'));
    expect(await leerOpcionesDeAceptacion()).toBeNull();
    mockApiFetch.mockResolvedValueOnce({ otra: 'cosa' });
    expect(await leerOpcionesDeAceptacion()).toBeNull();
    mockApiFetch.mockResolvedValueOnce({ formations: [], diagnosisAvailable: true });
    expect(await leerOpcionesDeAceptacion()).toBeNull();
  });
});
