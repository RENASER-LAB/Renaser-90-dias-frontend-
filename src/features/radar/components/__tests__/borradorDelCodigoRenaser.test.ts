import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El borrador del Código Renaser se guarda GRADUALMENTE (2026-11-03, pedido del dueño: «que se guarde gradualmente»): lo que la
 * persona escribe, dicta o elige se escribe en el teléfono mientras lo hace (400 ms sin teclear), por cuenta y por hora, y
 * reaparece tal cual al reabrir el formulario en la misma hora.
 *
 * Aquí el almacenamiento es el de verdad (`borradorRadar.ts`) sobre el doble oficial de AsyncStorage, y el reloj del servidor es
 * controlable: lo que se prueba es el conjunto, no un doble del borrador.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() } }));
const mockReloj = { ahora: new Date(2026, 10, 3, 11, 5, 0) };
jest.mock('../../../../services/http/relojServidor', () => ({ ahoraConfiable: () => mockReloj.ahora }));
jest.mock('../../hooks/useDictadoDelRadar', () => ({
  useDictadoDelRadar: () => ({ disponible: true, dictandoEn: null, parcial: '', fallo: null, alternar: () => undefined, detener: () => undefined }),
}));

import { RETARDO_DEL_BORRADOR_MS } from '../../hooks/useBorradorDelRadar';
import { borrarTodosLosBorradores, claveDeBorrador, leerBorrador } from '../../storage/borradorRadar';
import type { CheckInRadarApi } from '../../types/radar.types';
import { CodigoRenaserModal } from '../CodigoRenaserModal';
import { EnergiaEnChips } from '../EnergiaEnChips';
import { IndicadorDeGuardado } from '../IndicadorDeGuardado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Las instancias de un componente dentro de un árbol (los tipos de `react-test-renderer` de este proyecto no traen `findAllByType`). */
const porTipo = (raiz: ReactTestInstance, tipo: unknown): ReactTestInstance[] => raiz.findAll(n => (n.type as unknown) === tipo);

const slot = { hora: 11, etiqueta: '11:00', cierraA: '12:00' } as never;
const onEnviar = jest.fn(async (_c: CheckInRadarApi) => true);
const onCerrar = jest.fn();
const montadas: ReactTestRenderer[] = [];

function elemento(visible: boolean, usuarioId: string | null) {
  return React.createElement(CodigoRenaserModal, {
    visible,
    slot,
    obligatorio: true,
    usuarioId,
    enviando: false,
    error: null,
    onEnviar,
    onCerrar,
    onLimpiarError: () => undefined,
  });
}

/** Monta el formulario y deja que termine de leer el borrador (la lectura es asíncrona). */
async function abrir(usuarioId: string | null = 'u1'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento(true, usuarioId));
    await vaciar();
  });
  montadas.push(r);
  return r;
}
async function cerrar(r: ReactTestRenderer, usuarioId: string | null = 'u1') {
  await act(async () => {
    r.update(elemento(false, usuarioId));
    await vaciar();
  });
}
async function reabrir(r: ReactTestRenderer, usuarioId: string | null = 'u1') {
  await act(async () => {
    r.update(elemento(true, usuarioId));
    await vaciar();
  });
}
/** Deja correr las escrituras al almacenamiento, que son varias promesas encadenadas. */
async function vaciar() {
  for (let i = 0; i < 40; i += 1) await Promise.resolve();
}
async function pasar(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
    await vaciar();
  });
}
function textoDe(n: ReactTestInstance): string {
  return n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string').join(''))
    .join(' | ');
}
async function tocarRegistrar(r: ReactTestRenderer) {
  const [boton] = r.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === 'button' && textoDe(n) === 'Registrar');
  expect(boton).toBeDefined();
  await act(async () => {
    boton.props.onPress();
    await vaciar();
  });
}

const campos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'TextInput');
const valores = (r: ReactTestRenderer) => campos(r).map(c => c.props.value as string);
const escribir = (r: ReactTestRenderer, i: number, texto: string) => act(() => campos(r)[i].props.onChangeText(texto));
const energia = (r: ReactTestRenderer, v: number) =>
  act(() => r.root.findAll((n: ReactTestInstance) => n.type === EnergiaEnChips)[0].props.onChange(v));
const claveDeLaHora = (usuario = 'u1') => claveDeBorrador(usuario, mockReloj.ahora);
const enDisco = async (usuario = 'u1') => leerBorrador(usuario, mockReloj.ahora);

beforeEach(async () => {
  jest.useFakeTimers();
  mockReloj.ahora = new Date(2026, 10, 3, 11, 5, 0);
  await AsyncStorage.clear();
  onEnviar.mockReset();
  onEnviar.mockResolvedValue(true);
  onCerrar.mockClear();
});
afterEach(async () => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
  jest.useRealTimers();
});

describe('se guarda mientras se escribe', () => {
  it('a los 400 ms de dejar de teclear, no antes', async () => {
    const r = await abrir();
    escribir(r, 0, 'En mi oficina, revisando correos');

    await pasar(RETARDO_DEL_BORRADOR_MS - 1);
    expect(await enDisco()).toBeNull();

    await pasar(1);
    expect((await enDisco())?.respuestas.whatAmIDoing).toBe('En mi oficina, revisando correos');
  });

  it('la clave es de la cuenta y de la hora: renaser.radar.borrador.<cuenta>|<fecha>|<HH>', async () => {
    const r = await abrir('cuenta-7');
    escribir(r, 1, 'En la reunión de ventas');
    await pasar(RETARDO_DEL_BORRADOR_MS);

    expect(claveDeBorrador('cuenta-7', mockReloj.ahora)).toBe('renaser.radar.borrador.cuenta-7|2026-11-03|11');
    expect(await AsyncStorage.getAllKeys()).toEqual(['renaser.radar.borrador.cuenta-7|2026-11-03|11']);
  });

  it('teclear seguido es UNA sola escritura al terminar, no una por tecla', async () => {
    const setItem = AsyncStorage.setItem as unknown as jest.Mock;
    setItem.mockClear();
    const r = await abrir();
    escribir(r, 2, 'C');
    await pasar(200);
    escribir(r, 2, 'Cansa');
    await pasar(200);
    escribir(r, 2, 'Cansancio y calma');
    expect(setItem).not.toHaveBeenCalled();

    await pasar(RETARDO_DEL_BORRADOR_MS);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect((await enDisco())?.respuestas.whatAmIFeeling).toBe('Cansancio y calma');
  });

  it('la energía elegida también se guarda, sola', async () => {
    const r = await abrir();
    energia(r, 7);
    await pasar(RETARDO_DEL_BORRADOR_MS);
    expect((await enDisco())?.energia).toBe(7);
  });

  it('lo que ya está guardado no se vuelve a escribir', async () => {
    const r = await abrir();
    escribir(r, 0, 'algo');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    const setItem = AsyncStorage.setItem as unknown as jest.Mock;
    setItem.mockClear();

    escribir(r, 0, 'algo distinto');
    escribir(r, 0, 'algo');
    await pasar(RETARDO_DEL_BORRADOR_MS * 3);

    expect(setItem).not.toHaveBeenCalled();
  });

  it('sin sesión no guarda nada', async () => {
    const r = await abrir(null);
    escribir(r, 0, 'sin cuenta');
    await pasar(RETARDO_DEL_BORRADOR_MS * 3);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('un formulario en blanco no deja borrador: si se borra todo, el borrador se va', async () => {
    const r = await abrir();
    escribir(r, 0, 'algo');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    expect(await enDisco()).not.toBeNull();

    escribir(r, 0, '');
    await pasar(RETARDO_DEL_BORRADOR_MS);

    expect(await enDisco()).toBeNull();
  });

  it('dice «Guardado» (el contador del indicador sube) cada vez que quedó algo escrito', async () => {
    const r = await abrir();
    const cuenta = () => porTipo(r.root, IndicadorDeGuardado)[0].props.cuenta as number;
    expect(cuenta()).toBe(0);

    escribir(r, 0, 'primero');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    expect(cuenta()).toBe(1);

    escribir(r, 0, 'primero y segundo');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    expect(cuenta()).toBe(2);
  });
});

describe('no se pierde lo escrito', () => {
  it('si se cierra el formulario con un cambio esperando, se guarda al cerrar (los últimos 400 ms)', async () => {
    const r = await abrir();
    escribir(r, 3, 'Llamar al cliente que me espera');

    await cerrar(r);

    expect((await enDisco())?.respuestas.whatAmIAvoiding).toBe('Llamar al cliente que me espera');
  });

  it('si la app se desmonta con un cambio esperando, también se guarda', async () => {
    const r = await abrir();
    escribir(r, 0, 'Trabajando');
    act(() => r.unmount());
    montadas.splice(montadas.indexOf(r), 1);
    await pasar(1);
    expect((await enDisco())?.respuestas.whatAmIDoing).toBe('Trabajando');
  });

  it('al reabrir EN LA MISMA HORA, vuelven las cuatro respuestas y la energía tal cual', async () => {
    const r = await abrir();
    escribir(r, 0, 'En casa');
    escribir(r, 1, 'En mi plan del día');
    escribir(r, 2, 'Calma');
    escribir(r, 3, 'Hacer ejercicio');
    energia(r, 8);
    await pasar(RETARDO_DEL_BORRADOR_MS);
    await cerrar(r);

    await reabrir(r);

    expect(valores(r)).toEqual(['En casa', 'En mi plan del día', 'Calma', 'Hacer ejercicio']);
    expect(r.root.findAll((n: ReactTestInstance) => n.type === EnergiaEnChips)[0].props.value).toBe(8);
  });

  it('y también tras cerrar la app y abrirla de nuevo (un formulario nuevo, no el mismo)', async () => {
    const primero = await abrir();
    escribir(primero, 2, 'Ansiedad');
    energia(primero, 3);
    await pasar(RETARDO_DEL_BORRADOR_MS);
    act(() => primero.unmount());
    montadas.splice(montadas.indexOf(primero), 1);

    mockReloj.ahora = new Date(2026, 10, 3, 11, 40, 0);
    const segundo = await abrir();

    expect(valores(segundo)).toEqual(['', '', 'Ansiedad', '']);
    expect(segundo.root.findAll((n: ReactTestInstance) => n.type === EnergiaEnChips)[0].props.value).toBe(3);
  });

  it('un borrador de OTRA hora no aparece, y el viejo se barre', async () => {
    const r = await abrir();
    escribir(r, 0, 'Lo de las 11');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    await cerrar(r);

    mockReloj.ahora = new Date(2026, 10, 3, 12, 1, 0);
    await reabrir(r);

    expect(valores(r)).toEqual(['', '', '', '']);
    expect(await AsyncStorage.getAllKeys()).not.toContain('renaser.radar.borrador.u1|2026-11-03|11');
  });

  it('el borrador de una cuenta no aparece en la sesión de otra', async () => {
    const r = await abrir('u1');
    escribir(r, 0, 'Es de la cuenta uno');
    await pasar(RETARDO_DEL_BORRADOR_MS);
    act(() => r.unmount());
    montadas.splice(montadas.indexOf(r), 1);

    const otra = await abrir('u2');

    expect(valores(otra)).toEqual(['', '', '', '']);
  });

  it('no pisa un borrador con el formulario en blanco mientras todavía lo está leyendo', async () => {
    await AsyncStorage.setItem(
      claveDeLaHora(),
      JSON.stringify({
        respuestas: { whatAmIDoing: 'guardado', whatAmIThinking: '', whatAmIFeeling: '', whatAmIAvoiding: '' },
        energia: 5,
        guardadoEn: '2026-11-03T16:05:00Z',
      }),
    );
    // La lectura tarda más que la espera del borrador.
    let soltar!: () => void;
    const detenida = new Promise<void>(resolver => {
      soltar = resolver;
    });
    const getItem = AsyncStorage.getItem as unknown as jest.Mock<(clave: string) => Promise<string | null>>;
    const original = getItem.getMockImplementation()!;
    getItem.mockImplementation(async (clave: string) => {
      await detenida;
      return original(clave);
    });

    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(elemento(true, 'u1'));
      await vaciar();
    });
    montadas.push(r);
    await pasar(RETARDO_DEL_BORRADOR_MS * 5);
    expect(await AsyncStorage.getAllKeys()).toContain(claveDeLaHora());

    await act(async () => {
      soltar();
      await vaciar();
    });
    await pasar(1);

    expect(valores(r)[0]).toBe('guardado');
    getItem.mockImplementation(original);
  });
});

describe('lo que la persona ya escribió manda sobre un borrador que llega tarde', () => {
  it('si teclea antes de que termine la lectura, su texto se queda y el borrador viejo no lo pisa', async () => {
    await AsyncStorage.setItem(
      claveDeLaHora(),
      JSON.stringify({
        respuestas: { whatAmIDoing: 'viejo', whatAmIThinking: 'viejo', whatAmIFeeling: '', whatAmIAvoiding: '' },
        energia: null,
        guardadoEn: '2026-11-03T16:05:00Z',
      }),
    );
    let soltar!: () => void;
    const detenida = new Promise<void>(resolver => {
      soltar = resolver;
    });
    const getItem = AsyncStorage.getItem as unknown as jest.Mock<(clave: string) => Promise<string | null>>;
    const original = getItem.getMockImplementation()!;
    getItem.mockImplementation(async (clave: string) => {
      await detenida;
      return original(clave);
    });
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(elemento(true, 'u1'));
      await vaciar();
    });
    montadas.push(r);

    escribir(r, 0, 'lo nuevo');
    await act(async () => {
      soltar();
      await vaciar();
    });
    await pasar(RETARDO_DEL_BORRADOR_MS);

    expect(valores(r)).toEqual(['lo nuevo', '', '', '']);
    expect((await enDisco())?.respuestas.whatAmIDoing).toBe('lo nuevo');
    getItem.mockImplementation(original);
  });
});

describe('al registrar', () => {
  it('con éxito se borra el borrador y cerrar el formulario no lo vuelve a escribir', async () => {
    const r = await abrir();
    for (let i = 0; i < 4; i += 1) escribir(r, i, `respuesta ${i}`);
    energia(r, 6);
    await pasar(RETARDO_DEL_BORRADOR_MS);
    expect(await enDisco()).not.toBeNull();

    // Un cambio de último momento, todavía esperando su turno, justo antes de registrar.
    escribir(r, 0, 'respuesta 0 corregida');
    await tocarRegistrar(r);
    expect(onEnviar).toHaveBeenCalledTimes(1);
    await cerrar(r);
    await pasar(RETARDO_DEL_BORRADOR_MS * 3);

    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(await enDisco()).toBeNull();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('si no se pudo registrar, el borrador se queda', async () => {
    onEnviar.mockResolvedValue(false);
    const r = await abrir();
    for (let i = 0; i < 4; i += 1) escribir(r, i, `respuesta ${i}`);
    energia(r, 6);
    await pasar(RETARDO_DEL_BORRADOR_MS);
    await tocarRegistrar(r);

    expect(onCerrar).not.toHaveBeenCalled();
    expect((await enDisco())?.respuestas.whatAmIAvoiding).toBe('respuesta 3');
  });
});

describe('cerrar sesión', () => {
  it('borrarTodosLosBorradores quita los de todas las cuentas y horas, y deja lo demás', async () => {
    await AsyncStorage.multiSet([
      ['renaser.radar.borrador.u1|2026-11-03|11', '{}'],
      ['renaser.radar.borrador.u2|2026-11-02|09', '{}'],
      ['renaser.radar.slot.09', 'no es un borrador'],
      ['renaser.otra.cosa', 'queda'],
    ]);

    await borrarTodosLosBorradores();

    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['renaser.otra.cosa', 'renaser.radar.slot.09']);
  });
});
