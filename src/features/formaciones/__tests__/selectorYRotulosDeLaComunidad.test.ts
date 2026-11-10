import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { AvisoDeFormacionPorElegir } from '../components/AvisoDeFormacionPorElegir';
import { RotuloDeFormacion } from '../components/RotuloDeFormacion';
import { SelectorDeFormacionDeLaComunidad } from '../components/SelectorDeFormacionDeLaComunidad';
import {
  elegirFormacionDeLaComunidad,
  estadoDeLaFormacionDeLaComunidad,
  fijarLaEleccionRecordada,
  prepararLaFormacionDeLaComunidad,
  reiniciarLaFormacionDeLaComunidad,
} from '../estado/formacionDeLaComunidad';
import { eleccionDelControl, opcionesDelSelector, ordenDeFormaciones, valorDelControl } from '../utils/opcionesDeLaComunidad';
import { nombreSinRenaser } from '../utils/nombreDeFormacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ESCUELA = { codigo: 'ESCUELA', nombre: 'Escuela Renaser' };
const DIPLOMADO = { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' };
const CERTIFICACION = { codigo: 'CERTIFICACION', nombre: 'Certificación Renaser' };
const LAS_TRES = [ESCUELA, DIPLOMADO, CERTIFICACION];

let raiz: ReactTestRenderer | null = null;
/** Sin ningún elemento nativo dibujado (los tipos mínimos de `react-test-renderer` no traen `toJSON`). */
const sinNada = (r: ReactTestRenderer) => r.root.findAll(x => typeof x.type === 'string').length === 0;
/** El primer nodo con esas props (los tipos mínimos no traen `findByProps`); falla si no existe. */
const conProps = (r: ReactTestRenderer, props: Record<string, unknown>) => {
  const nodo = r.root.findAll(x => Object.entries(props).every(([k, v]) => x.props[k] === v))[0];
  if (!nodo) throw new Error(`No hay un nodo con ${JSON.stringify(props)}`);
  return nodo;
};
const montar = (elemento: React.ReactElement) =>
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(x => (x.type as unknown) === 'Text').map(x => (Array.isArray(x.props.children) ? x.props.children.join('') : x.props.children));
const botones = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll(x => x.props.accessibilityRole === 'radio' && typeof x.props.onPress === 'function');

beforeEach(() => {
  reiniciarLaFormacionDeLaComunidad();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('las opciones del selector', () => {
  it('#169: solo las formaciones que manda el servidor (sin «Todas»), sin el «Renaser» del final', () => {
    expect(opcionesDelSelector(LAS_TRES).map(o => o.etiqueta)).toEqual(['Escuela', 'Diplomado', 'Certificación']);
    expect(opcionesDelSelector(LAS_TRES).map(o => o.valor)).toEqual(['ESCUELA', 'DIPLOMADO', 'CERTIFICACION']);
    expect(opcionesDelSelector(LAS_TRES)[1].nombreCompleto).toBe('Diplomado Renaser');
  });

  it('un nombre que Administración cambió se respeta, y sin lista usa las tres de fábrica', () => {
    expect(opcionesDelSelector([{ codigo: 'DIPLOMADO', nombre: 'Diplomado Premium' }]).map(o => o.etiqueta)).toEqual(['Diplomado Premium']);
    expect(opcionesDelSelector([]).map(o => o.etiqueta)).toEqual(['Escuela', 'Diplomado', 'Certificación']);
    expect(opcionesDelSelector(null)).toHaveLength(3);
    expect(nombreSinRenaser('Escuela Renaser')).toBe('Escuela');
    expect(nombreSinRenaser('Renaser')).toBe('Renaser');
  });

  it('el control habla de textos y el estado de null', () => {
    expect(valorDelControl(null)).toBe('todas');
    expect(valorDelControl('DIPLOMADO')).toBe('DIPLOMADO');
    expect(eleccionDelControl('todas')).toBeNull();
    expect(eleccionDelControl('CERTIFICACION')).toBe('CERTIFICACION');
  });

  it('el orden de los grupos: la Escuela, el Diplomado, la Certificación y al final lo desconocido', () => {
    expect(ordenDeFormaciones(['CERTIFICACION', 'ESCUELA', 'OTRA', 'DIPLOMADO', 'ESCUELA'])).toEqual(['ESCUELA', 'DIPLOMADO', 'CERTIFICACION', 'OTRA']);
  });
});

describe('el selector de formación de la Comunidad', () => {
  it('#169: quien ve todas lo ve con tres opciones (sin «Todas»), la primera elegida si no había nada recordado', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true, { disponibles: LAS_TRES });
    fijarLaEleccionRecordada('admin-1', null);
    montar(React.createElement(SelectorDeFormacionDeLaComunidad));
    expect(textos(raiz!)).toEqual(['Escuela', 'Diplomado', 'Certificación']);
    expect(botones(raiz!).map(b => b.props.accessibilityState.selected)).toEqual([true, false, false]);
    expect(botones(raiz!).map(b => b.props.accessibilityLabel)).toEqual(['Escuela Renaser', 'Diplomado Renaser', 'Certificación Renaser']);
  });

  it('tocar una formación la elige en el estado de la Comunidad', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true, { disponibles: LAS_TRES });
    fijarLaEleccionRecordada('admin-1', null);
    montar(React.createElement(SelectorDeFormacionDeLaComunidad));
    act(() => botones(raiz!)[2].props.onPress());
    expect(estadoDeLaFormacionDeLaComunidad().eleccion).toBe('CERTIFICACION');
    expect(botones(raiz!).map(b => b.props.accessibilityState.selected)).toEqual([false, false, true]);
  });

  it('el aprendiz, el mentor y el líder no ven nada: ni un segmento ni la palabra «formación»', () => {
    prepararLaFormacionDeLaComunidad('aprendiz-1', false, { disponibles: [ESCUELA], activa: ESCUELA });
    montar(React.createElement(SelectorDeFormacionDeLaComunidad));
    expect(sinNada(raiz!)).toBe(true);
    act(() => prepararLaFormacionDeLaComunidad('mentor-1', false, { disponibles: [DIPLOMADO, CERTIFICACION], activa: DIPLOMADO }));
    expect(sinNada(raiz!)).toBe(true);
  });
});

describe('el rótulo de formación de una fila', () => {
  it('#169: con una formación siempre elegida (ya no hay «Todas») el rótulo no hace falta: no se dibuja', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true, { disponibles: LAS_TRES });
    fijarLaEleccionRecordada('admin-1', null);
    montar(React.createElement(RotuloDeFormacion, { formation: 'DIPLOMADO' }));
    expect(sinNada(raiz!)).toBe(true);
    act(() => elegirFormacionDeLaComunidad('DIPLOMADO'));
    expect(sinNada(raiz!)).toBe(true);
    act(() => elegirFormacionDeLaComunidad(null)); // una elección vacía no vuelve a «Todas»
    expect(sinNada(raiz!)).toBe(true);
  });

  it('para las demás cuentas nunca se dibuja, y una fila sin formación (o con un valor raro) tampoco', () => {
    prepararLaFormacionDeLaComunidad('aprendiz-1', false, { disponibles: [ESCUELA], activa: ESCUELA });
    montar(React.createElement(RotuloDeFormacion, { formation: 'ESCUELA' }));
    expect(sinNada(raiz!)).toBe(true);

    act(() => {
      prepararLaFormacionDeLaComunidad('admin-1', true, { disponibles: LAS_TRES });
      fijarLaEleccionRecordada('admin-1', null);
    });
    act(() => raiz!.update(React.createElement(RotuloDeFormacion, { formation: undefined })));
    expect(sinNada(raiz!)).toBe(true);
    act(() => raiz!.update(React.createElement(RotuloDeFormacion, { formation: 42 as unknown as string })));
    expect(sinNada(raiz!)).toBe(true);
    act(() => raiz!.update(React.createElement(RotuloDeFormacion, { formation: '   ' })));
    expect(sinNada(raiz!)).toBe(true);
  });
});

describe('«Elige una formación arriba…»', () => {
  it('es una línea (no un diálogo) con el texto de lo que se quiso hacer', () => {
    montar(React.createElement(AvisoDeFormacionPorElegir, { texto: 'Elige una formación arriba para publicar.' }));
    expect(textos(raiz!)).toEqual(['Elige una formación arriba para publicar.']);
    expect(conProps(raiz!, { accessibilityRole: 'alert' })).toBeTruthy();
  });
});
