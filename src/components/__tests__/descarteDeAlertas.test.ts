import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert as AlertNativo, Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { Alert, opcionesNativasDeDescarte } from '../Alerta';
import { avisar, confirmar } from '../../features/admin/utils/dialogo';

/**
 * E-606: el atrás de Android no cerraba los diálogos nativos (`cancelable` es `false` por defecto en Android). La regla
 * es la del diálogo de web: cerrar = elegir «cancelar»; sin cancelar y sin acciones, se cierra; una elección obligada
 * no se cierra.
 */
describe('opcionesNativasDeDescarte (E-606)', () => {
  it('con un botón cancel, cerrar es elegirlo', () => {
    const cancelar = jest.fn();
    const aceptar = jest.fn();
    const opciones = opcionesNativasDeDescarte([
      { text: 'Cancelar', style: 'cancel', onPress: cancelar },
      { text: 'Sí', onPress: aceptar },
    ]);

    expect(opciones.cancelable).toBe(true);
    opciones.onDismiss?.();
    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(aceptar).not.toHaveBeenCalled();
  });

  it('sin botones, o con botones que no hacen nada, se cierra sin ejecutar nada', () => {
    expect(opcionesNativasDeDescarte()).toEqual({ cancelable: true });
    expect(opcionesNativasDeDescarte([{ text: 'OK' }])).toEqual({ cancelable: true });
  });

  it('una elección obligada (acciones y ninguna cancel) no se cierra', () => {
    expect(opcionesNativasDeDescarte([{ text: 'Reintentar', onPress: jest.fn() }, { text: 'Salir', onPress: jest.fn() }]))
      .toEqual({ cancelable: false });
  });
});

describe('los diálogos nativos piden poder cerrarse (E-606)', () => {
  const plataforma = Platform.OS;
  let alertSpy: jest.SpiedFunction<typeof AlertNativo.alert>;

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
    alertSpy = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    (Platform as { OS: string }).OS = plataforma;
  });

  it('confirmar: el atrás resuelve «no» y nunca «sí»', async () => {
    const respuesta = confirmar('¿Eliminar este hábito?', 'No se deshace.', { ok: 'Eliminar', destructivo: true });

    const opciones = alertSpy.mock.calls[0][3];
    expect(opciones?.cancelable).toBe(true);
    opciones?.onDismiss?.();
    await expect(respuesta).resolves.toBe(false);
  });

  it('avisar y Alert de componentes también se dejan cerrar', () => {
    avisar('No se pudo guardar', 'Inténtalo de nuevo.');
    Alert.alert('Listo', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Seguir', onPress: () => {} }]);

    expect(alertSpy.mock.calls[0][3]).toEqual({ cancelable: true });
    expect(alertSpy.mock.calls[1][3]?.cancelable).toBe(true);
  });
});
