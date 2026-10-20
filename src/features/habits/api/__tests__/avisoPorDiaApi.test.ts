import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { fijarAvisoDelDia, obtenerHorarioSemanal, obtenerPreferencias } from '../habitsApi';

/**
 * Spec 008 (D-282): el aviso de cada día de la semana. El contrato es aditivo: todo lo nuevo es opcional, y un
 * backend anterior (que no manda nada de esto) tiene que seguir leyéndose sin error.
 */
describe('fijarAvisoDelDia', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(undefined);
  });

  it('PUT .../weekdays/{wd}/reminder con el aviso y la lista', async () => {
    await fijarAvisoDelDia('h-1', 'SATURDAY', true, [30, 0]);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/habit-preferences/h-1/weekdays/SATURDAY/reminder', {
      method: 'PUT',
      body: { reminderEnabled: true, reminderMinutesList: [30, 0] },
    });
  });

  it('«sin aviso» manda la lista vacía, aunque se le pase una', async () => {
    await fijarAvisoDelDia('h-1', 'SUNDAY', false, [30]);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/habit-preferences/h-1/weekdays/SUNDAY/reminder', {
      method: 'PUT',
      body: { reminderEnabled: false, reminderMinutesList: [] },
    });
  });
});

describe('leer el aviso de cada día', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('el horario semanal trae el aviso resuelto del día y si es propio', async () => {
    mockApiFetch.mockResolvedValue({
      weekdays: [{
        weekday: 'SATURDAY', triggerTime: '09:00:00', limitTime: null, custom: true, active: true,
        reminderEnabled: true, reminderMinutesList: [30], customReminder: true,
      }],
    });
    const [sabado] = await obtenerHorarioSemanal('h-1');
    expect(sabado).toMatchObject({ reminderEnabled: true, reminderMinutesList: [30], customReminder: true });
  });

  it('un backend anterior no manda los campos nuevos y se lee igual', async () => {
    mockApiFetch.mockResolvedValue({
      weekdays: [{ weekday: 'SATURDAY', triggerTime: '09:00:00', limitTime: null, custom: false }],
    });
    const [sabado] = await obtenerHorarioSemanal('h-1');
    expect(sabado.customReminder).toBeUndefined();
    expect(sabado.reminderMinutesList).toBeUndefined();
  });

  it('la lista de preferencias suma los siete días de cada hábito (campo aditivo)', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{
        habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null,
        weekdays: [{ weekday: 'THURSDAY', triggerTime: '09:00:00', active: true, reminderEnabled: true, reminderMinutesList: [0], customTime: true, customReminder: true }],
      }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.weekdays?.[0]).toMatchObject({ weekday: 'THURSDAY', customTime: true, customReminder: true, reminderMinutesList: [0] });
  });

  it('sin `weekdays` (backend anterior) la lista se lee como siempre', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{ habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.weekdays).toBeUndefined();
  });

  it('unos `weekdays` que no se entienden no tumban la lista: las alarmas de todos los hábitos dependen de ella', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{ habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null, weekdays: 'raro' }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.habitId).toBe('h-1');
    expect(gym.weekdays).toBeUndefined();
  });
});
