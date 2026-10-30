import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Los avisos del teléfono del Código Renaser con Mi Radar (spec 012).
 *
 * Lo que más importa: **los días 1 a 7 programan exactamente lo mismo que antes** (las doce de 08:00 a 19:00, mismo
 * identificador, canal, minuto y contenido, sin `data`), y desde el día 8 solo suenan las horas que la persona eligió,
 * con Mi Radar encendido, una alarma SEMANAL por día y por hora de las que calculó el servidor con su Despertar y su Dormir (spec 019).
 * La invitación del día 8 se programa una sola vez por cuenta.
 */

const programadas: Array<{ identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> }> = [];
const canceladas: string[] = [];
const mockN = {
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationChannelAsync: async () => undefined,
  cancelScheduledNotificationAsync: async (id: string) => {
    canceladas.push(id);
  },
  scheduleNotificationAsync: async (pedido: { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> }) => {
    programadas.push(pedido);
    return pedido.identifier;
  },
};
const mockPermiso = jest.fn(async () => true);
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS_LOCALES: true,
  cargarNotificaciones: () => mockN,
  pedirPermiso: () => mockPermiso(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { miRadarConHoras, miRadarConHorario, miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import { sincronizarRecordatoriosDeRadar } from '../recordatoriosDeRadar';

const pad = (h: number) => String(h).padStart(2, '0');
const CANAL = 'recordatorios-codigo-renaser';
const CUERPO = '¿Dónde estás ahora mismo? Cinco preguntas, un minuto.';
const INVITACION = 'renaser.radar.invitacion';

const delasHoras = () => programadas.filter(p => p.identifier.startsWith('renaser.radar.slot.'));
function delasHorasPorTipo(tipo: 'daily' | 'weekly') {
  return programadas.filter(p => p.identifier.startsWith('renaser.radar.slot.') && p.trigger.type === tipo);
}
const laInvitacion = () => programadas.filter(p => p.identifier === INVITACION);

beforeEach(async () => {
  programadas.length = 0;
  canceladas.length = 0;
  mockPermiso.mockClear();
  mockPermiso.mockResolvedValue(true);
  await AsyncStorage.clear();
  // Martes 20/10/2026, 10:30 locales.
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'], now: new Date(2026, 9, 20, 10, 30) });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('días 1 a 7: exactamente como antes de Mi Radar', () => {
  it.each([1, 3, 7])('el día %i programa las doce de 08:00 a 19:00, diarias y a los :02, sin `data`', async dia => {
    await sincronizarRecordatoriosDeRadar(dia, null, 'u1');
    expect(delasHoras()).toEqual(
      Array.from({ length: 12 }, (_, i) => ({
        identifier: `renaser.radar.slot.${pad(8 + i)}`,
        content: { title: `Código Renaser · ${pad(8 + i)}:00`, body: CUERPO },
        trigger: { type: 'daily', hour: 8 + i, minute: 2, channelId: CANAL },
      })),
    );
    expect(delasHoras().every(p => !('data' in p.content))).toBe(true);
  });

  it('con Mi Radar lleno de datos (no debería existir antes del día 8) sigue igual', async () => {
    await sincronizarRecordatoriosDeRadar(4, miRadarConHoras([9, 14]), 'u1');
    expect(delasHoras().map(p => p.trigger.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('antes de programar cancela las franjas viejas (de 03 a 23), para no duplicar', async () => {
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    for (const h of [3, 8, 19, 23]) expect(canceladas).toContain(`renaser.radar.slot.${pad(h)}`);
  });

  it('el día 0 no programa nada de las horas', async () => {
    await sincronizarRecordatoriosDeRadar(0, null, 'u1');
    expect(delasHoras()).toEqual([]);
    expect(laInvitacion()).toEqual([]);
  });
});

describe('desde el día 8', () => {
  it('apagado: ninguna hora, y se cancelan las que hubiera de la semana 1', async () => {
    await sincronizarRecordatoriosDeRadar(8, miRadarConHoras([], false), 'u1');
    expect(programadas).toEqual([]);
    expect(canceladas).toContain('renaser.radar.slot.08');
    expect(canceladas).toContain('renaser.radar.slot.19');
  });

  it('sin saber qué tiene Mi Radar (null): ninguna', async () => {
    await sincronizarRecordatoriosDeRadar(12, null, 'u1');
    expect(programadas).toEqual([]);
  });

  it('encendido: una SEMANAL por día y por hora de ese día, con el canal y el minuto de siempre y la ruta que abre Mi Radar; ninguna diaria', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([9, 14]), 'u1');
    expect(delasHorasPorTipo('daily')).toEqual([]);
    expect(delasHorasPorTipo('weekly')).toHaveLength(14);
    expect(delasHoras()[0]).toEqual({
      identifier: 'renaser.radar.slot.d1.09',
      content: { title: 'Código Renaser · 09:00', body: CUERPO, data: { route: '/mi-radar' } },
      trigger: { type: 'weekly', weekday: 2, hour: 9, minute: 2, channelId: CANAL },
    });
  });

  it('automático de 05:30 a 22:30: de 06 a 22 todos los días, 17 por día y 119 en la semana', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarDePrueba(true), 'u1');
    expect(delasHoras()).toHaveLength(7 * 17);
    expect(delasHoras().filter(p => p.identifier.startsWith('renaser.radar.slot.d3.')).map(p => p.trigger.hour)).toEqual(
      [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    );
  });

  it('personalizado: el sábado con 6 de 17 suena a las 06, 09, 12, 16, 19 y 22', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarDePrueba(true, { 6: { horas: [6, 9, 12, 16, 19, 22], modo: 'PERSONALIZADO' } }), 'u1');
    expect(delasHoras().filter(p => p.identifier.startsWith('renaser.radar.slot.d6.')).map(p => p.trigger.hour)).toEqual([6, 9, 12, 16, 19, 22]);
  });

  it('cambiar el modo, las veces o el Despertar no deja las viejas: se cancelan todas y se programan las nuevas', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([9, 14, 20]), 'u1');
    programadas.length = 0;
    canceladas.length = 0;
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([7]), 'u1');
    expect(delasHoras().map(p => p.trigger.hour)).toEqual([7, 7, 7, 7, 7, 7, 7]);
    for (const h of [9, 14, 20]) expect(canceladas).toContain(`renaser.radar.slot.d1.${pad(h)}`);
  });

  it('el día 90 y después, igual que cualquier otro día: como la persona lo dejó', async () => {
    await sincronizarRecordatoriosDeRadar(90, miRadarConHoras([9]), 'u1');
    expect(delasHoras().map(p => p.trigger.hour)).toEqual([9, 9, 9, 9, 9, 9, 9]);
  });

  it('sin permiso de avisos no programa nada (y no falla)', async () => {
    mockPermiso.mockResolvedValue(false);
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([9]), 'u1');
    expect(programadas).toEqual([]);
  });
});

describe('desde el día 8: cada día con su propio horario', () => {
  // Sábado con 11:00 y domingo sin Radar; el resto, 09:00 y 14:00.
  const conDias = miRadarConHoras([9, 14], true, { 6: { horas: [11] }, 7: { horas: [], sinRadar: true } });

  it('programa 11 semanales (5 días × 2 + el sábado) con el id `renaser.radar.slot.d{día}.HH`', async () => {
    await sincronizarRecordatoriosDeRadar(10, conDias, 'u1');
    expect(delasHoras().map(p => p.identifier)).toEqual([
      'renaser.radar.slot.d1.09', 'renaser.radar.slot.d1.14',
      'renaser.radar.slot.d2.09', 'renaser.radar.slot.d2.14',
      'renaser.radar.slot.d3.09', 'renaser.radar.slot.d3.14',
      'renaser.radar.slot.d4.09', 'renaser.radar.slot.d4.14',
      'renaser.radar.slot.d5.09', 'renaser.radar.slot.d5.14',
      'renaser.radar.slot.d6.11',
    ]);
  });

  it('un día sin Despertar, sin Dormir o «Sin Radar» no tiene ninguna', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarDePrueba(true, { 3: { despertar: null }, 4: { dormir: null }, 7: { sinRadar: true } }), 'u1');
    for (const dia of [3, 4, 7]) {
      expect(delasHoras().filter(p => p.identifier.startsWith(`renaser.radar.slot.d${dia}.`))).toEqual([]);
    }
    expect(delasHoras().filter(p => p.identifier.startsWith('renaser.radar.slot.d1.'))).toHaveLength(17);
  });

  it('cada una es semanal con el día de `expo-notifications` (1 = domingo): el lunes es 2 y el sábado es 7', async () => {
    await sincronizarRecordatoriosDeRadar(10, conDias, 'u1');
    const lunes = delasHoras().find(p => p.identifier === 'renaser.radar.slot.d1.09')!;
    const sabado = delasHoras().find(p => p.identifier === 'renaser.radar.slot.d6.11')!;
    expect(lunes.trigger).toEqual({ type: 'weekly', weekday: 2, hour: 9, minute: 2, channelId: CANAL });
    expect(sabado.trigger).toEqual({ type: 'weekly', weekday: 7, hour: 11, minute: 2, channelId: CANAL });
  });

  it('el contenido es el de siempre, con la ruta que abre Mi Radar', async () => {
    await sincronizarRecordatoriosDeRadar(10, conDias, 'u1');
    expect(delasHoras().find(p => p.identifier === 'renaser.radar.slot.d6.11')!.content).toEqual({
      title: 'Código Renaser · 11:00',
      body: CUERPO,
      data: { route: '/mi-radar' },
    });
    expect(delasHoras().every(p => (p.content.data as { route: string }).route === '/mi-radar')).toBe(true);
  });

  it('pasar de la semana 1 (diarias) a Mi Radar cancela las diarias viejas', async () => {
    await sincronizarRecordatoriosDeRadar(7, null, 'u1');
    programadas.length = 0;
    canceladas.length = 0;
    await sincronizarRecordatoriosDeRadar(8, conDias, 'u1');
    for (const h of [8, 9, 14, 19]) expect(canceladas).toContain(`renaser.radar.slot.${pad(h)}`);
    expect(delasHorasPorTipo('daily')).toEqual([]);
  });

  it('apagar cancela las diarias Y las semanales de cualquier día y hora de 03 a 23, y no programa nada', async () => {
    await sincronizarRecordatoriosDeRadar(10, conDias, 'u1');
    programadas.length = 0;
    canceladas.length = 0;
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([], false), 'u1');
    expect(programadas).toEqual([]);
    for (const dia of [1, 2, 3, 4, 5, 6, 7]) {
      for (const hora of [3, 9, 14, 23]) expect(canceladas).toContain(`renaser.radar.slot.d${dia}.${pad(hora)}`);
    }
    for (const hora of [3, 8, 19, 23]) expect(canceladas).toContain(`renaser.radar.slot.${pad(hora)}`);
  });

  it('los días 1 a 7 también cancelan las semanales de Mi Radar (por si quedó alguna), sin programar ninguna', async () => {
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    for (const dia of [1, 7]) expect(canceladas).toContain(`renaser.radar.slot.d${dia}.10`);
    expect(delasHorasPorTipo('weekly')).toEqual([]);
  });

  it('con el Radar al máximo (21 horas los siete días) son 147 alarmas semanales: por debajo de las 500 de Android', async () => {
    await sincronizarRecordatoriosDeRadar(20, miRadarConHorario('02:00', '23:30'), 'u1');
    expect(delasHorasPorTipo('weekly')).toHaveLength(147);
  });

  it('sin permiso de avisos no programa nada (y no falla)', async () => {
    mockPermiso.mockResolvedValue(false);
    await sincronizarRecordatoriosDeRadar(10, conDias, 'u1');
    expect(programadas).toEqual([]);
  });

  it('todos los días sin Radar: encendido pero sin ningún aviso', async () => {
    await sincronizarRecordatoriosDeRadar(10, miRadarConHoras([], true, Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(d => [d, { sinRadar: true }]))), 'u1');
    expect(programadas.filter(p => p.identifier.startsWith('renaser.radar.slot.'))).toEqual([]);
  });
});

describe('la invitación del día 8', () => {
  it('durante la semana 1 deja UN aviso para el día 8 a las 09:00, con la ruta de Mi Radar', async () => {
    // Hoy es el día 3 (martes 20/10): el día 8 es el domingo 25/10.
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    const [invitacion] = laInvitacion();
    expect(laInvitacion()).toHaveLength(1);
    expect(invitacion.content).toEqual({
      title: 'Terminaste tu primera semana del Código Renaser',
      body: 'Si quieres seguir, enciende Mi Radar.',
      data: { route: '/mi-radar' },
    });
    expect(invitacion.trigger.type).toBe('date');
    expect(invitacion.trigger.channelId).toBe(CANAL);
    expect(invitacion.trigger.date).toEqual(new Date(2026, 9, 25, 9, 0, 0, 0));
  });

  it('el día 7 es mañana a las 09:00', async () => {
    await sincronizarRecordatoriosDeRadar(7, null, 'u1');
    expect(laInvitacion()[0].trigger.date).toEqual(new Date(2026, 9, 21, 9, 0, 0, 0));
  });

  it('una sola vez por cuenta: al volver a abrir la app no se programa otra', async () => {
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    await sincronizarRecordatoriosDeRadar(4, null, 'u1');
    expect(laInvitacion()).toHaveLength(1);
    expect(await AsyncStorage.getItem('radar.invitacionDia8.u1')).toBe('1');
  });

  it('otra cuenta en el mismo teléfono tiene la suya', async () => {
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    await sincronizarRecordatoriosDeRadar(3, null, 'u2');
    expect(laInvitacion()).toHaveLength(2);
  });

  it('sin permiso no se marca: se vuelve a intentar la próxima vez que se abra la app dentro de la semana', async () => {
    mockPermiso.mockResolvedValue(false);
    await sincronizarRecordatoriosDeRadar(3, null, 'u1');
    expect(laInvitacion()).toEqual([]);
    expect(await AsyncStorage.getItem('radar.invitacionDia8.u1')).toBeNull();
    mockPermiso.mockResolvedValue(true);
    await sincronizarRecordatoriosDeRadar(4, null, 'u1');
    expect(laInvitacion()).toHaveLength(1);
  });

  it('desde el día 8 no se programa (quien ya pasó el día 8 al salir esta versión no la recibe)', async () => {
    await sincronizarRecordatoriosDeRadar(8, miRadarConHoras([], false), 'u1');
    await sincronizarRecordatoriosDeRadar(20, miRadarConHoras([], false), 'u1');
    expect(laInvitacion()).toEqual([]);
  });

  it('si la persona enciende Mi Radar, se cancela; apagado, no se toca', async () => {
    await sincronizarRecordatoriosDeRadar(8, miRadarConHoras([], false), 'u1');
    expect(canceladas).not.toContain(INVITACION);
    await sincronizarRecordatoriosDeRadar(8, miRadarConHoras([9]), 'u1');
    expect(canceladas).toContain(INVITACION);
  });

  it('sin cuenta conocida no se programa', async () => {
    await sincronizarRecordatoriosDeRadar(3, null, null);
    expect(laInvitacion()).toEqual([]);
  });
});
