/** Spec 048 (FR-009): si al cerrar sesión queda algo sin enviar, se avisa antes cuántas cosas se perderían. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockAlerta = jest.fn();
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { _reiniciarCola, agregarEnvio, ponerCuentaActual } from '../colaSinRed';
import { salirAvisandoPendientes, textoDelAvisoDeSalida } from '../salirAvisandoPendientes';

beforeEach(async () => {
  await AsyncStorage.clear();
  _reiniciarCola();
  mockAlerta.mockReset();
  ponerCuentaActual('ana');
});

describe('cerrar sesión con cosas sin enviar (spec 048)', () => {
  it('sin pendientes sale sin preguntar', async () => {
    const salir = jest.fn();
    await salirAvisandoPendientes(salir);
    expect(salir).toHaveBeenCalled();
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('con pendientes avisa cuántas cosas se perderían y solo sale si la persona confirma', async () => { // spec 048 FR-009
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, { instante: new Date(), origen: 'RELOJ_DEL_SISTEMA' });
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r2' }, { instante: new Date(), origen: 'RELOJ_DEL_SISTEMA' });
    const salir = jest.fn();

    await salirAvisandoPendientes(salir);

    expect(salir).not.toHaveBeenCalled();
    const [titulo, texto, botones] = mockAlerta.mock.calls[0] as [string, string, Array<{ text: string; onPress?: () => void }>];
    expect(titulo).toBe('Tienes cosas sin enviar');
    expect(texto).toBe(textoDelAvisoDeSalida(2));
    botones.find(b => b.text === 'Salir igual')?.onPress?.();
    expect(salir).toHaveBeenCalled();
  });
});
