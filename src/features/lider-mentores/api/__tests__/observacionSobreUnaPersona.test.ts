import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: Record<string, unknown> }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: { method?: string; body?: Record<string, unknown> }) => mockApiFetch(ruta, opciones),
}));

import { registrarObservacion } from '../liderMentoresApi';
import { observacionSchema } from '../liderMentoresSchemas';

/**
 * La observación al mentor sobre una persona (spec 005, FR-014, R-7): el mismo buzón de siempre con dos campos
 * opcionales, `personId` y `weekStart`. Sin ellos el cuerpo del POST es el de antes, campo por campo.
 */

const RESPUESTA = { id: 'o1', mentorId: 'm1', type: 'ALERTA', text: 'Hola', sentByChat: false, createdAt: '2026-10-19T12:00:00Z' };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(RESPUESTA);
});

describe('registrar una observación', () => {
  const base = { tipo: 'ALERTA' as const, texto: 'Hola', claveOperacion: 'obs-1', mensajeId: null };

  it('sin persona: el cuerpo es exactamente el de antes (no viajan `personId` ni `weekStart`)', async () => {
    await registrarObservacion('m1', base);
    const [ruta, opciones] = mockApiFetch.mock.calls[0];
    expect(ruta).toBe('/api/v1/leadership/mentors/m1/observations');
    expect(opciones?.method).toBe('POST');
    expect(opciones?.body).toEqual({ type: 'ALERTA', text: 'Hola', sentByChat: false, messageId: null, operationKey: 'obs-1' });
  });

  it('sobre una persona: suma `personId` y `weekStart` (el sábado que abre la semana)', async () => {
    await registrarObservacion('m1', { ...base, mensajeId: 'msg-1', sobre: { personaId: 'u1', semanaDesde: '2026-10-17' } });
    expect(mockApiFetch.mock.calls[0][1]?.body).toEqual({
      type: 'ALERTA',
      text: 'Hola',
      sentByChat: true,
      messageId: 'msg-1',
      operationKey: 'obs-1',
      personId: 'u1',
      weekStart: '2026-10-17',
    });
  });
});

describe('leer una observación', () => {
  it('las de antes no traen persona y se leen igual', () => {
    const o = observacionSchema.parse(RESPUESTA);
    expect(o.personName ?? null).toBeNull();
  });

  it('las nuevas traen la persona y la semana', () => {
    const o = observacionSchema.parse({ ...RESPUESTA, personId: 'u1', personName: 'Ana Pérez', weekStart: '2026-10-17' });
    expect(o).toMatchObject({ personId: 'u1', personName: 'Ana Pérez', weekStart: '2026-10-17' });
  });
});
