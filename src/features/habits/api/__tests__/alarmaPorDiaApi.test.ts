import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { fijarAlarmaDelDia, fijarAlarmaGeneral, obtenerHorarioSemanal, obtenerPreferencias } from '../habitsApi';

/**
 * Spec 009 (D-283): «cómo suena» la alarma. El contrato es aditivo: lo nuevo es opcional y un backend anterior
 * (que no manda nada de esto) tiene que seguir leyéndose sin error.
 */
describe('guardar cómo suena', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(undefined);
  });

  it('PUT .../alarm con los CUATRO campos, que el servidor exige (si falta uno responde 400)', async () => {
    await fijarAlarmaGeneral('h-1', { sonido: true, vibracion: false, voz: true, repetir: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/habit-preferences/h-1/alarm', {
      method: 'PUT',
      body: { sound: true, vibration: false, voice: true, repeat: true },
    });
  });

  it('PUT .../weekdays/{wd}/alarm: lo de un día, con los cuatro campos aunque alguno sea falso', async () => {
    await fijarAlarmaDelDia('h-1', 'SATURDAY', { sonido: false, vibracion: true, voz: false, repetir: false });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/habit-preferences/h-1/weekdays/SATURDAY/alarm', {
      method: 'PUT',
      body: { sound: false, vibration: true, voice: false, repeat: false },
    });
  });
});

describe('leer cómo suena', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('el horario semanal trae «cómo suena» resuelto de cada día y si es propio', async () => {
    mockApiFetch.mockResolvedValue({
      weekdays: [{
        weekday: 'SATURDAY', triggerTime: '09:00:00', limitTime: null, custom: false, active: true,
        alarm: { sound: false, vibration: true, voice: false, repeat: true }, customAlarm: true,
      }],
    });
    const [sabado] = await obtenerHorarioSemanal('h-1');
    expect(sabado).toMatchObject({ customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: true } });
  });

  it('un backend anterior no manda `alarm` ni `customAlarm` y se lee igual', async () => {
    mockApiFetch.mockResolvedValue({
      weekdays: [{ weekday: 'SATURDAY', triggerTime: '09:00:00', limitTime: null, custom: false }],
    });
    const [sabado] = await obtenerHorarioSemanal('h-1');
    expect(sabado.customAlarm).toBeUndefined();
    expect(sabado.alarm).toBeUndefined();
  });

  it('la lista de preferencias trae la general de cada hábito y la de cada día', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{
        habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null,
        alarm: { sound: true, vibration: true, voice: false, repeat: false },
        weekdays: [{
          weekday: 'THURSDAY', triggerTime: '09:00:00', active: true,
          alarm: { sound: true, vibration: false, voice: true, repeat: true }, customAlarm: true,
        }],
      }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.alarm).toMatchObject({ sound: true, vibration: true, voice: false, repeat: false });
    expect(gym.weekdays?.[0]).toMatchObject({ customAlarm: true, alarm: { vibration: false, voice: true, repeat: true } });
  });

  it('una combinación que no se entiende se descarta SOLA: no tumba la lista de la que dependen las alarmas', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{
        habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null,
        alarm: { sound: 'sí' },
        weekdays: [{ weekday: 'THURSDAY', alarm: 7, customAlarm: true }],
      }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.habitId).toBe('h-1');
    expect(gym.alarm).toBeUndefined();
    expect(gym.weekdays?.[0].alarm).toBeUndefined();
    expect(gym.weekdays?.[0].customAlarm).toBe(true);
  });

  it('sin `alarm` (backend anterior) la lista se lee como siempre', async () => {
    mockApiFetch.mockResolvedValue({
      habits: [{ habitId: 'h-1', title: 'Gimnasio', triggerTime: '07:00:00', limitTime: null, customized: true, pendingChange: null }],
    });
    const [gym] = await obtenerPreferencias();
    expect(gym.alarm).toBeUndefined();
  });
});
