import { describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>(async () => ({
  habitId: 'h-1', triggerTime: '10:00:00', limitTime: null, deferred: true, deferredEffectiveDate: '2026-09-29',
}));
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { cambiarHorario } from '../habitsApi';

/**
 * V81 (D-217, 2026-09-28): la hoja manda TODOS los avisos elegidos, para que otro teléfono los
 * reconstruya. Contra el código viejo falla: el PATCH solo llevaba `reminderMinutesBefore`.
 */
describe('PATCH /habit-preferences con todos los avisos', () => {
  it('con la lista, la manda junto al más temprano (el APK viejo sigue leyendo ese)', async () => {
    await cambiarHorario('h-1', '10:00:00', null, { activo: true, minutosAntes: 30, lista: [30, 0] });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/habit-preferences/h-1', expect.objectContaining({
      body: { triggerTime: '10:00:00', limitTime: null, reminderEnabled: true, reminderMinutesBefore: 30, reminderMinutesList: [30, 0] },
    }));
  });

  it('sin la lista (Plan, Yo), no la manda: el servidor conserva la que tenía', async () => {
    await cambiarHorario('h-1', '10:00:00', null, { activo: true, minutosAntes: 30 });
    const body = (mockApiFetch.mock.lastCall?.[1] as { body: Record<string, unknown> }).body;
    expect(body).not.toHaveProperty('reminderMinutesList');
  });
});
