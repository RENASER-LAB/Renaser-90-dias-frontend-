/**
 * Spec 007, historia 2 (T023): Yo → Alarmas muestra la guía de la marca y el botón abre la pantalla de la
 * marca; con una marca desconocida cae a la lista de batería o a los ajustes de Renaser.
 *
 * Contra el código de antes falla: la guía decía a todos «Batería → Sin restricciones» y el botón solo abría
 * los ajustes de la app (`Linking.openSettings`), sin saber de «Inicio de aplicaciones» de Honor.
 *
 * 2026-10-31 (alarmas silenciosas): es el único lugar donde se habla de esto. El título dice «Para que tus recordatorios
 * suenen siempre», el botón «Revisar», y no hay culpa al teléfono ni «no cierres la app a la fuerza».
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Linking, Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
const mockAlerta = jest.fn();
jest.mock('../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { usarModuloDeAlarmas } from '../alarmaExactaNativa';
import { GuiaDeBateria, TEXTO_DE_BATERIA } from '../components/GuiaDeBateria';
import { BOTON_DE_LA_GUIA, TITULO_DE_LA_GUIA } from '../data/guiasPorMarca';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LINEA_HONOR = 'Inicio de aplicaciones → Renaser → apaga «Gestionar automáticamente» y deja todo encendido.';

let raiz: ReactTestRenderer | null = null;
const abrirAjusteDeLaMarca = jest.fn<() => 'pantalla_de_la_marca' | 'lista_de_bateria' | 'ajustes_de_la_app' | 'ninguna'>();

function comoAndroid(marca: { Brand: string; Manufacturer: string }) {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'constants', 'get').mockReturnValue(marca as never);
}

function montar() {
  act(() => {
    raiz = TestRenderer.create(React.createElement(GuiaDeBateria));
  });
}

function textos(): string[] {
  return raiz!.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => [n.props.children].flat(Infinity).filter(x => typeof x === 'string').join(''));
}

async function tocarAbrirAjustes() {
  const boton = raiz!.root.findAll(n => typeof n.props?.onPress === 'function' && n.props.accessibilityRole === 'button')[0];
  await act(async () => {
    boton.props.onPress();
  });
}

beforeEach(() => {
  abrirAjusteDeLaMarca.mockReset().mockReturnValue('pantalla_de_la_marca');
  mockAlerta.mockReset();
  usarModuloDeAlarmas({
    puedeProgramarAlarmasExactas: () => true,
    abrirAjusteDeAlarmasExactas: () => true,
    abrirAjusteDeLaMarca,
  });
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('el texto y el botón (2026-10-31)', () => {
  it('el título es «Para que tus recordatorios suenen siempre» y el botón, «Revisar»', () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    montar();
    expect(TITULO_DE_LA_GUIA).toBe('Para que tus recordatorios suenen siempre');
    expect(BOTON_DE_LA_GUIA).toBe('Revisar');
    expect(textos()).toContain('Para que tus recordatorios suenen siempre');
    expect(textos()).toContain('Revisar');
    expect(textos()).not.toContain('Abrir ajustes');
  });

  it.each([
    ['HONOR', 'HONOR'],
    ['Xiaomi', 'Redmi'],
    ['samsung', 'samsung'],
    ['OPPO', 'OPPO'],
    ['vivo', 'vivo'],
    ['Google', 'google'],
  ])('%s / %s: nada de «teléfono cerró», «a la fuerza» ni «se borren»', (fabricante, marca) => {
    comoAndroid({ Brand: marca, Manufacturer: fabricante });
    montar();
    const todo = textos().join(' ');
    expect(todo).not.toMatch(/cerr[óo] Renaser|a la fuerza|se borren|no sonaron/i);
  });

  it('el botón mide al menos 48 (área de toque) y el texto no baja de 16', () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    montar();
    const aplanar = (e: unknown): Record<string, unknown> => Object.assign({}, ...[e].flat(Infinity).filter(Boolean));
    const estiloDelBoton = aplanar(
      raiz!.root.findAll(n => typeof n.props?.onPress === 'function' && n.props.accessibilityRole === 'button')[0].props.style({ pressed: false }),
    );
    expect(Number(estiloDelBoton.minHeight)).toBeGreaterThanOrEqual(48);
    for (const texto of raiz!.root.findAll(n => (n.type as unknown) === 'Text')) {
      expect(Number(aplanar(texto.props.style).fontSize)).toBeGreaterThanOrEqual(16);
    }
  });
});

describe('con una marca conocida', () => {
  it('Honor: muestra la línea de Honor, no el texto genérico', () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    montar();
    expect(textos()).toContain(LINEA_HONOR);
    expect(textos()).not.toContain(TEXTO_DE_BATERIA);
  });

  it('«Revisar» abre la pantalla de la marca y no los ajustes genéricos', async () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    montar();
    await tocarAbrirAjustes();
    expect(abrirAjusteDeLaMarca).toHaveBeenCalledTimes(1);
    expect(ajustes).not.toHaveBeenCalled();
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('si la marca no tiene pantalla que abrir (`ninguna`), caen los ajustes de Renaser', async () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    abrirAjusteDeLaMarca.mockReturnValue('ninguna');
    const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    montar();
    await tocarAbrirAjustes();
    expect(ajustes).toHaveBeenCalledTimes(1);
  });

  it('si ni los ajustes se abren, dice el camino a mano', async () => {
    comoAndroid({ Brand: 'HONOR', Manufacturer: 'HONOR' });
    abrirAjusteDeLaMarca.mockReturnValue('ninguna');
    jest.spyOn(Linking, 'openSettings').mockRejectedValue(new Error('nada'));
    montar();
    await tocarAbrirAjustes();
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo abrir', 'Abre los Ajustes del teléfono, entra a Apps → Renaser → Batería.');
  });
});

describe('con una marca desconocida: lo de hoy', () => {
  it('muestra el texto de siempre', () => {
    comoAndroid({ Brand: 'google', Manufacturer: 'Google' });
    montar();
    expect(textos()).toContain(TEXTO_DE_BATERIA);
  });

  it('con un APK anterior al módulo, el botón abre los ajustes de Renaser como antes', async () => {
    comoAndroid({ Brand: 'google', Manufacturer: 'Google' });
    usarModuloDeAlarmas(null);
    const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    montar();
    await tocarAbrirAjustes();
    expect(ajustes).toHaveBeenCalledTimes(1);
    expect(mockAlerta).not.toHaveBeenCalled();
  });
});

describe('la sección', () => {
  it('en iOS y web no se dibuja', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    montar();
    expect(textos()).toEqual([]);
  });

  it('TEXTO_DE_BATERIA sigue exportado desde el componente, ya en positivo', () => {
    expect(TEXTO_DE_BATERIA).toBe('En Batería, elige «Sin restricciones» para Renaser.');
  });
});
