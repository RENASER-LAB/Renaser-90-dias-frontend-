import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Tocar la alarma de una acción de los objetivos, o el recordatorio diario, es atenderlos (spec 010, «Repetir si no la
 * atiendo»): el oyente de respuestas le avisa a `repeticionesDeAcciones` con los datos del aviso. Solo las alarmas cuya
 * combinación repite llevan `rocaId` o `diario`; un aviso sin ellos se abre como siempre y no atiende nada.
 */

type Respuesta = {
  notification: { date: number; request: { identifier: string; content: { data: Record<string, unknown> | null } } };
};
type Oyente = (respuesta: Respuesta) => void;

const mockOyentes: Oyente[] = [];
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((oyente: Oyente) => {
    mockOyentes.push(oyente);
    return { remove: () => undefined };
  }),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));
jest.mock('../pushNativo', () => ({ HAY_PUSH_NATIVO: true }));
const mockAtender = jest.fn<(datos: unknown, entregadaEnMs?: unknown) => Promise<null>>(async () => null);
jest.mock('../../../objetivos/notificaciones/repeticionesDeAcciones', () => ({
  atenderLaAlarmaDeObjetivos: (datos: unknown, entregadaEnMs?: unknown) => mockAtender(datos, entregadaEnMs),
}));
const mockAtenderHabito = jest.fn<(ruta: unknown, entregadaEnMs?: unknown) => Promise<null>>(async () => null);
jest.mock('../../../habits/notificaciones/repeticiones', () => ({
  atenderLaAlarmaDeUnHabito: (ruta: unknown, entregadaEnMs?: unknown) => mockAtenderHabito(ruta, entregadaEnMs),
}));

import { escucharAperturaDeAviso, olvidarRutaPendiente } from '../rutaDeAviso';

let siguiente = 1;
const tocar = (data: Record<string, unknown> | null, fecha = 1_700_000_000_000) => {
  for (const oyente of mockOyentes) {
    oyente({ notification: { date: fecha, request: { identifier: `n-${siguiente++}`, content: { data } } } });
  }
};

beforeEach(() => {
  mockOyentes.length = 0;
  mockAtender.mockClear();
  mockAtenderHabito.mockClear();
  olvidarRutaPendiente();
});

describe('tocar un aviso de las acciones de los objetivos', () => {
  it('la alarma de una acción que repite atiende esa acción, con la hora a la que se entregó', () => {
    const dejarDeEscuchar = escucharAperturaDeAviso();
    const datos = { route: '/objetivos/2026-09-26?eje=TRABAJO', rocaId: 'sab', alarma: { sonido: true, vibracion: true, voz: false, repetir: true } };
    tocar(datos);
    expect(mockAtender).toHaveBeenCalledTimes(1);
    expect(mockAtender).toHaveBeenCalledWith(datos, 1_700_000_000_000);
    // Y abre Plan → Objetivos como siempre.
    expect(mockAtenderHabito).not.toHaveBeenCalled();
    dejarDeEscuchar();
  });

  it('el recordatorio diario que repite atiende el recordatorio', () => {
    escucharAperturaDeAviso();
    tocar({ diario: true, alarma: { sonido: true, vibracion: true, voz: false, repetir: true } });
    expect(mockAtender).toHaveBeenCalledTimes(1);
  });

  it('un aviso sin `rocaId` ni `diario` (lo de siempre) no atiende nada', () => {
    escucharAperturaDeAviso();
    tocar({ route: '/objetivos/2026-09-26?eje=TRABAJO' });
    tocar(null);
    tocar({ rocaId: 7 });
    expect(mockAtender).not.toHaveBeenCalled();
  });

  it('el aviso de un hábito sigue atendiendo al hábito y no a las acciones', () => {
    escucharAperturaDeAviso();
    tocar({ route: '/habitos/h-1?dimension=BODY' });
    expect(mockAtenderHabito).toHaveBeenCalledTimes(1);
    expect(mockAtender).not.toHaveBeenCalled();
  });
});
