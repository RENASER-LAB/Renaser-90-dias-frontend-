/**
 * Cambiar la hora de un hábito desde Plan tiene que mover la alarma del teléfono.
 *
 * **El bug (2026-09-26).** `PlanScreen.guardarNuevaHora` mandaba `PATCH /habit-preferences/{id}` y
 * nada más: la alarma local, programada a la hora vieja, seguía sonando a esa hora todos los días.
 * La hoja de Training sí reprogramaba; Plan no.
 *
 * Contra el código viejo este archivo falla: `cambiarHoraDelHabito` no existía y Plan llamaba directo
 * a `habitsApi.cambiarHorario`, que no toca `expo-notifications`; ninguna alarma se cancelaba ni se
 * volvía a programar.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Programada = {
  content: { title: string; sound: unknown };
  trigger: { type?: string; hour: number; minute: number; channelId: string; date?: Date };
};

const mockProgramadas: Programada[] = [];
const mockCanceladas: string[] = [];
const mockEstado = { siguienteId: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Programada) => {
    mockProgramadas.push(pedido);
    return `alarma-${mockEstado.siguienteId++}`;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCanceladas.push(id);
  }),
}));

const mockCambiarHorario = jest.fn(async () => ({ deferred: true, deferredEffectiveDate: '2026-09-27' }));
jest.mock('../../api/habitsApi', () => ({
  cambiarHorario: (...args: unknown[]) => (mockCambiarHorario as (...a: unknown[]) => unknown)(...args),
}));

import * as recordatorios from '../recordatoriosDeHabito';
import { cambiarHoraDelHabito } from '../../utils/cambioDeHora';

const USUARIO = 'u-1';
const HABITO = 'h-despertar';

beforeEach(async () => {
  mockProgramadas.length = 0;
  mockCanceladas.length = 0;
  mockEstado.siguienteId = 1;
  mockCambiarHorario.mockClear();
  await AsyncStorage.clear();
});

describe('cambiar la hora de un hábito desde Plan', () => {
  it('mueve la alarma a la hora nueva, con las mismas antelaciones, y cancela la vieja', async () => {
    expect(recordatorios.HAY_RECORDATORIOS_LOCALES).toBe(true);
    // Alarma puesta desde Training: 06:30 con aviso a la hora y 10 min antes.
    await recordatorios.programar(USUARIO, HABITO, 'Despertar', '06:30', [0, 10]);
    const viejas = ['alarma-1', 'alarma-2'];
    mockProgramadas.length = 0;

    await cambiarHoraDelHabito({
      userId: USUARIO,
      habitoId: HABITO,
      titulo: 'Despertar',
      horaNueva: '05:00',
      limitTime: null,
      recordatorio: { activo: true, minutosAntes: 10 },
    });

    expect(mockCambiarHorario).toHaveBeenCalledWith(HABITO, '05:00:00', null, { activo: true, minutosAntes: 10 });
    expect(mockCanceladas).toEqual(viejas);
    const horas = mockProgramadas.map(p => `${p.trigger.hour}:${String(p.trigger.minute).padStart(2, '0')}`);
    expect(horas).toEqual(['4:50', '5:00']);
    expect(await recordatorios.antelacionesDe(USUARIO, HABITO)).toEqual([0, 10]);
  });

  it('D-217: con la hora de hoy y el cambio diferido, la diaria nueva no arranca hasta su fecha', async () => {
    await recordatorios.programar(USUARIO, HABITO, 'Despertar', '06:30', [0]);
    mockProgramadas.length = 0;
    const pasado = new Date();
    pasado.setDate(pasado.getDate() + 2);
    const dos = (n: number) => String(n).padStart(2, '0');
    const desde = `${pasado.getFullYear()}-${dos(pasado.getMonth() + 1)}-${dos(pasado.getDate())}`;
    mockCambiarHorario.mockImplementationOnce(async () => ({ deferred: true, deferredEffectiveDate: desde }));

    await cambiarHoraDelHabito({
      userId: USUARIO,
      habitoId: HABITO,
      titulo: 'Despertar',
      horaNueva: '05:00',
      limitTime: null,
      recordatorio: { activo: true, minutosAntes: 0 },
      horaAnterior: '06:30',
    });

    // Antes: una diaria de las 05:00 en el acto, que sonaba mañana aunque el cambio rigiera pasado mañana.
    expect(mockProgramadas.some(p => p.trigger.type === 'daily')).toBe(false);
    const primera = mockProgramadas.find(p => p.trigger.date?.getHours() === 5);
    expect(primera?.trigger.date?.getDate()).toBe(pasado.getDate());
  });

  it('no inventa una alarma si este teléfono nunca tuvo una para ese hábito', async () => {
    const { alarma } = await cambiarHoraDelHabito({
      userId: USUARIO,
      habitoId: HABITO,
      titulo: 'Despertar',
      horaNueva: '05:00',
      limitTime: null,
      recordatorio: { activo: false, minutosAntes: null },
    });
    expect(alarma).toBeNull();
    expect(mockProgramadas).toHaveLength(0);
  });

  it('si el servidor rechaza el cambio, la alarma no se mueve', async () => {
    await recordatorios.programar(USUARIO, HABITO, 'Despertar', '06:30', [0]);
    mockProgramadas.length = 0;
    mockCambiarHorario.mockImplementationOnce(async () => {
      throw new Error('500');
    });
    await expect(
      cambiarHoraDelHabito({
        userId: USUARIO,
        habitoId: HABITO,
        titulo: 'Despertar',
        horaNueva: '05:00',
        limitTime: null,
        recordatorio: { activo: true, minutosAntes: 0 },
      }),
    ).rejects.toThrow('500');
    expect(mockCanceladas).toHaveLength(0);
    expect(mockProgramadas).toHaveLength(0);
  });

  it('respeta el sonido elegido para ese hábito al reprogramar', async () => {
    await recordatorios.fijarSonido(USUARIO, HABITO, 'campana');
    await recordatorios.programar(USUARIO, HABITO, 'Despertar', '06:30', [0]);
    mockProgramadas.length = 0;
    await recordatorios.reprogramarTrasCambioDeHora(USUARIO, HABITO, 'Despertar', '05:00');
    expect(mockProgramadas[0].trigger.channelId).toBe('recordatorios-habitos-campana');
    expect(mockProgramadas[0].content.sound).toBe('campana_renaser.wav');
  });

  it('sin sonido elegido sale por el canal de siempre', async () => {
    await recordatorios.programar(USUARIO, HABITO, 'Despertar', '06:30', [0]);
    expect(mockProgramadas[0].trigger.channelId).toBe('recordatorios-habitos');
    expect(mockProgramadas[0].content.sound).toBe(true);
  });
});

/**
 * La prueba de arriba verifica la función; esta, que Plan la use. Es la línea que faltaba: si alguien
 * vuelve a llamar al PATCH directo desde la pantalla, la alarma vuelve a quedar en la hora vieja y
 * ninguna otra prueba lo nota (la pantalla no se puede montar en Jest sin medio árbol de contextos).
 */
describe('PlanScreen', () => {
  it('cambia la hora por cambiarHoraDelHabito, no con el PATCH suelto', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const fuente = fs.readFileSync(path.join(__dirname, '../../../../screens/PlanScreen.tsx'), 'utf8');
    expect(fuente).toContain('cambiarHoraDelHabito(');
    expect(fuente).not.toContain('habitsApi.cambiarHorario(');
  });
});
