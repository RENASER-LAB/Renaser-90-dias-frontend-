/**
 * Spec 007, historia 2 (T022): la hoja que avisa, al abrir la app, que el teléfono cerró Renaser y borró las
 * alarmas, y lleva a la guía de la marca.
 *
 * Contra el código de antes falla: `AvisoDeAlarmasBorradas.tsx` no existía. En Honor la persona no se
 * enteraba de por qué «las alarmas no suenan».
 *
 * El archivo es `.test.ts` y no `.test.tsx` (como decía tasks.md): el `testMatch` de `jest.config.js` solo
 * toma `.test.ts`, así que un `.tsx` no se correría nunca.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Linking, Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSesion: { userId: string | null } = { userId: 'u-1' };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockSesion.userId ? { id: mockSesion.userId } : null }),
}));

/** El orden en que corrió cada paso: primero se ponen al día las alarmas, después se revisa la detención. */
const mockOrden: string[] = [];
jest.mock('../ponerAlDiaLasAlarmas', () => ({
  ponerAlDiaLasAlarmas: jest.fn(async () => {
    mockOrden.push('ponerAlDia');
    return null;
  }),
  esperarLaPuestaAlDia: jest.fn(async () => {
    mockOrden.push('esperar');
  }),
}));
jest.mock('../detencionForzada', () => ({
  revisarDetencionForzada: jest.fn(async () => {
    mockOrden.push('revisar');
    return 'avisar';
  }),
}));

/** El atrás del sistema: lo que la hoja registró y si está activo (con la hoja cerrada, no). */
const mockAtras: { alAtras: (() => boolean | void) | null; activo: boolean | null } = { alAtras: null, activo: null };
jest.mock('../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (alAtras: () => boolean | void, activo: boolean = true) => {
    mockAtras.alAtras = alAtras;
    mockAtras.activo = activo;
  },
}));

const mockAlerta = jest.fn();
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { usarModuloDeAlarmas } from '../alarmaExactaNativa';
import { revisarDetencionForzada } from '../detencionForzada';
import { esperarLaPuestaAlDia, ponerAlDiaLasAlarmas } from '../ponerAlDiaLasAlarmas';
import {
  AvisoDeAlarmasBorradas,
  olvidarLaRevisionDeEstaApertura,
  TEXTO_DEL_AVISO,
  TITULO_DEL_AVISO,
} from '../components/AvisoDeAlarmasBorradas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
/** La línea de Honor de `data-model.md`: el teléfono simulado de estas pruebas. */
const LINEA_HONOR_PARA_LAS_PRUEBAS = 'Inicio de aplicaciones → Renaser → apaga «Gestionar automáticamente» y deja todo encendido.';
const abrirAjusteDeLaMarca = jest.fn<() => 'pantalla_de_la_marca' | 'lista_de_bateria' | 'ajustes_de_la_app' | 'ninguna'>();

function comoAndroidHonor() {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'constants', 'get').mockReturnValue({ Brand: 'HONOR', Manufacturer: 'HONOR' } as never);
}

beforeEach(() => {
  mockOrden.length = 0;
  mockSesion.userId = 'u-1';
  mockAtras.alAtras = null;
  mockAtras.activo = null;
  olvidarLaRevisionDeEstaApertura();
  abrirAjusteDeLaMarca.mockReset().mockReturnValue('pantalla_de_la_marca');
  usarModuloDeAlarmas({
    puedeProgramarAlarmasExactas: () => true,
    abrirAjusteDeAlarmasExactas: () => true,
    abrirAjusteDeLaMarca,
  });
  // Las implementaciones se vuelven a poner en cada prueba: `restoreAllMocks` las puede haber borrado.
  jest.mocked(ponerAlDiaLasAlarmas).mockImplementation(async () => {
    mockOrden.push('ponerAlDia');
    return null;
  });
  jest.mocked(esperarLaPuestaAlDia).mockImplementation(async () => {
    mockOrden.push('esperar');
  });
  jest.mocked(revisarDetencionForzada).mockImplementation(async () => {
    mockOrden.push('revisar');
    return 'avisar';
  });
  mockAlerta.mockReset();
  comoAndroidHonor();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

/** Deja correr las promesas encadenadas del efecto (poner al día → revisar → mostrar). */
async function vaciar() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

async function abrir() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(AvisoDeAlarmasBorradas));
  });
  await vaciar();
}

function textos(): string[] {
  return raiz!.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => [n.props.children].flat(Infinity).filter(x => typeof x === 'string').join(''));
}

function hayHoja(): boolean {
  return raiz!.root.findAll(n => (n.type as unknown) === 'Modal' || (n.type as { name?: string }).name === 'Modal').length > 0;
}

/** El primer control con `onPress` y rol de botón que lleva ese texto (los envoltorios de `Pressable` repiten las props). */
function botonCon(texto: string) {
  const nodos = raiz!.root.findAll(
    n =>
      typeof n.props?.onPress === 'function' &&
      n.props.accessibilityRole === 'button' &&
      n.findAll(h => (h.type as unknown) === 'Text' && [h.props.children].flat().join('') === texto).length > 0,
  );
  expect(nodos.length).toBeGreaterThan(0);
  return nodos[0];
}

async function tocar(texto: string) {
  const boton = botonCon(texto);
  await act(async () => {
    boton.props.onPress();
  });
  await vaciar();
}

describe('cuándo aparece', () => {
  it('con una detención forzada nueva: una hoja con dos frases y los botones «Arreglarlo» y «Ahora no»', async () => {
    await abrir();

    expect(hayHoja()).toBe(true);
    const todo = textos();
    expect(todo).toContain(TITULO_DEL_AVISO);
    expect(todo).toContain(TEXTO_DEL_AVISO);
    // Tuteo y dos frases (el título no es una frase).
    expect(TEXTO_DEL_AVISO.split(/[.!?](\s|$)/).filter(x => x.trim().length > 1)).toHaveLength(2);
    expect(TEXTO_DEL_AVISO).toBe('Por eso no sonaron tus alarmas. Ya las volvimos a poner.');
    expect(TITULO_DEL_AVISO).toBe('Tu teléfono cerró Renaser');
    // La línea de la marca (aquí, Honor).
    expect(todo).toContain(LINEA_HONOR_PARA_LAS_PRUEBAS);
    expect(todo).toContain('Arreglarlo');
    expect(todo).toContain('Ahora no');
  });

  it('las alarmas se ponen al día primero (esperando la corrida en curso) y recién después se revisa', async () => {
    await abrir();
    expect(mockOrden).toEqual(['ponerAlDia', 'esperar', 'revisar']);
    expect(ponerAlDiaLasAlarmas).toHaveBeenCalledWith('u-1');
    expect(esperarLaPuestaAlDia).toHaveBeenCalledTimes(1);
    expect(revisarDetencionForzada).toHaveBeenCalledWith('u-1');
  });

  it('sin detención forzada, o quitada de recientes sin más, no muestra nada', async () => {
    jest.mocked(revisarDetencionForzada).mockResolvedValue('nada');
    await abrir();
    expect(hayHoja()).toBe(false);
    expect(textos()).not.toContain(TITULO_DEL_AVISO);
  });

  it('sin sesión no revisa ni muestra nada; al entrar, revisa', async () => {
    mockSesion.userId = null;
    await abrir();
    expect(revisarDetencionForzada).not.toHaveBeenCalled();
    expect(hayHoja()).toBe(false);

    mockSesion.userId = 'u-1';
    await act(async () => {
      raiz!.update(React.createElement(AvisoDeAlarmasBorradas));
    });
    await vaciar();
    expect(revisarDetencionForzada).toHaveBeenCalledTimes(1);
    expect(hayHoja()).toBe(true);
  });

  it('en iOS y en la web no hace nada', async () => {
    for (const sistema of ['ios', 'web'] as const) {
      jest.replaceProperty(Platform, 'OS', sistema);
      await abrir();
      expect(revisarDetencionForzada).not.toHaveBeenCalled();
      expect(ponerAlDiaLasAlarmas).not.toHaveBeenCalled();
      expect(hayHoja()).toBe(false);
      act(() => raiz?.unmount());
      raiz = null;
    }
  });

  it('una sola revisión por apertura de la app, aunque se vuelva a montar o cambie la cuenta', async () => {
    await abrir();
    expect(revisarDetencionForzada).toHaveBeenCalledTimes(1);

    act(() => raiz!.unmount());
    raiz = null;
    await abrir();
    expect(revisarDetencionForzada).toHaveBeenCalledTimes(1);

    mockSesion.userId = 'u-2';
    await act(async () => {
      raiz!.update(React.createElement(AvisoDeAlarmasBorradas));
    });
    await vaciar();
    expect(revisarDetencionForzada).toHaveBeenCalledTimes(1);
  });

  it('si algo falla al poner al día o al revisar, no se cae la app', async () => {
    jest.mocked(ponerAlDiaLasAlarmas).mockRejectedValueOnce(new Error('sin red'));
    jest.mocked(revisarDetencionForzada).mockRejectedValueOnce(new Error('boom'));
    await expect(abrir()).resolves.toBeUndefined();
    expect(hayHoja()).toBe(false);
  });
});

describe('los botones', () => {
  it('«Arreglarlo» abre la pantalla de la marca y cierra la hoja', async () => {
    await abrir();
    await tocar('Arreglarlo');
    expect(abrirAjusteDeLaMarca).toHaveBeenCalledTimes(1);
    expect(hayHoja()).toBe(false);
  });

  it('si el teléfono no tiene pantalla de la marca ni ninguna otra, cae a los ajustes de Renaser', async () => {
    abrirAjusteDeLaMarca.mockReturnValue('ninguna');
    const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await abrir();
    await tocar('Arreglarlo');
    expect(ajustes).toHaveBeenCalledTimes(1);
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('si ni los ajustes se pueden abrir, lo dice con el camino a mano', async () => {
    abrirAjusteDeLaMarca.mockReturnValue('ninguna');
    jest.spyOn(Linking, 'openSettings').mockRejectedValue(new Error('nada'));
    await abrir();
    await tocar('Arreglarlo');
    expect(mockAlerta).toHaveBeenCalledTimes(1);
  });

  it('«Ahora no» solo cierra la hoja', async () => {
    await abrir();
    await tocar('Ahora no');
    expect(abrirAjusteDeLaMarca).not.toHaveBeenCalled();
    expect(hayHoja()).toBe(false);
  });
});

describe('el atrás del sistema', () => {
  it('con la hoja abierta el gesto atrás la cierra y no minimiza la app', async () => {
    await abrir();
    expect(mockAtras.activo).toBe(true);
    let manejado: boolean | void = undefined;
    await act(async () => {
      manejado = mockAtras.alAtras?.();
    });
    await vaciar();
    expect(manejado).not.toBe(false);
    expect(hayHoja()).toBe(false);
    expect(mockAtras.activo).toBe(false);
  });

  it('el atrás del Modal (Android) también la cierra', async () => {
    await abrir();
    const modal = raiz!.root.findAll(n => typeof n.props?.onRequestClose === 'function')[0];
    await act(async () => {
      modal.props.onRequestClose();
    });
    await vaciar();
    expect(hayHoja()).toBe(false);
  });
});
