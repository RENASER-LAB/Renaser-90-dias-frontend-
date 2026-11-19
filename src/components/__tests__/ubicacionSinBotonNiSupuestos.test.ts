import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * #235 (2026-11-19, decisión del dueño): «¿Dónde vives?» no trae el botón «Usar mi ubicación» y no muestra como elegido lo que la
 * persona no eligió.
 *
 * El botón nunca usaba el GPS en el teléfono (`navigator.geolocation` no existe en React Native) y caía en la IP, que da la ciudad del
 * proveedor de internet; con lugares fijos inventados si no respondía. Y, aunque los campos estuvieran vacíos, las filas mostraban el
 * primero de cada lista (por ejemplo «Arequipa») como si fuera lo elegido.
 *
 * Contra el código de antes estas pruebas fallan: el botón estaba, y las filas vacías decían «Arequipa» en vez de «Seleccionar».
 */

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined },
}));

import { LocationCascadePicker, type LocationData } from '../LocationCascadePicker';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

const SIN_ELEGIR: LocationData = { pais: 'Perú', departamento: '', ciudad: '', distrito: '', direccion: '' };

function montar(data: LocationData): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(React.createElement(LocationCascadePicker, { data, onChange: () => undefined }));
  });
  return raiz!;
}

function tocable(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta,
  );
  if (!nodo) throw new Error(`No hay nada tocable con la etiqueta ${etiqueta}`);
  return nodo;
}

async function tocar(r: ReactTestRenderer, etiqueta: string) {
  const nodo = tocable(r, etiqueta);
  await act(async () => {
    nodo.props.onPress();
  });
}

const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children)).map(n =>
    ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join(''),
  );

const etiquetas = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel as string);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«¿Dónde vives?» sin «Usar mi ubicación» (#235)', () => {
  it('no hay botón de ubicación, ni su texto, ni su indicador de espera', () => {
    const r = montar(SIN_ELEGIR);
    expect(etiquetas(r)).not.toContain('Usar mi ubicación');
    expect(textos(r).join('|')).not.toMatch(/MI UBICACI[ÓO]N|DETECTANDO|Ubicaci[óo]n (detectada|aproximada)/);
    expect(r.root.findAll(n => n.type === ActivityIndicator)).toHaveLength(0);
    // Lo que sí sigue: el rótulo del grupo y las cuatro filas.
    expect(textos(r)).toContain('Ubicación geográfica');
    expect(etiquetas(r)).toEqual(expect.arrayContaining(['país: Perú']));
  });

  it('sin elegir, departamento, ciudad y distrito dicen «Seleccionar» (no el primero de cada lista)', () => {
    const r = montar(SIN_ELEGIR);
    expect(etiquetas(r)).toEqual(
      expect.arrayContaining([
        'depto / estado: Seleccionar',
        'ciudad / provincia: Seleccionar',
        'distrito / zona: Seleccionar',
      ]),
    );
    expect(textos(r).join('|')).not.toMatch(/Arequipa|Lima|Miraflores|Cayma/);
  });

  it('con lo elegido, las filas dicen lo elegido', () => {
    const r = montar({ pais: 'Perú', departamento: 'Cusco', ciudad: 'Cusco', distrito: 'Wanchaq', direccion: '' });
    expect(etiquetas(r)).toEqual(
      expect.arrayContaining(['depto / estado: Cusco', 'ciudad / provincia: Cusco', 'distrito / zona: Wanchaq']),
    );
  });
});

describe('La cascada se recorre en orden cuando falta un nivel (#235)', () => {
  it('tocar «ciudad» o «distrito» sin departamento abre la hoja de departamentos, no una lista vacía o supuesta', async () => {
    for (const fila of ['ciudad / provincia: Seleccionar', 'distrito / zona: Seleccionar']) {
      const r = montar(SIN_ELEGIR);
      await tocar(r, fila);
      expect(textos(r)).toContain('Departamento / Estado');
      expect(textos(r)).toContain('Arequipa'); // la lista de departamentos de Perú, para elegir
      act(() => r.unmount());
      raiz = null;
    }
  });

  it('con departamento pero sin ciudad, «distrito» abre la hoja de ciudades', async () => {
    const r = montar({ ...SIN_ELEGIR, departamento: 'Cusco' });
    await tocar(r, 'distrito / zona: Seleccionar');
    expect(textos(r)).toContain('Provincia / Ciudad');
  });

  it('con ciudad elegida, «distrito» abre los distritos de esa ciudad', async () => {
    const r = montar({ ...SIN_ELEGIR, departamento: 'Arequipa', ciudad: 'Arequipa' });
    await tocar(r, 'distrito / zona: Seleccionar');
    expect(textos(r)).toContain('Distritos de Arequipa');
    expect(textos(r)).toContain('Cayma');
  });
});

describe('El selector no vuelve a usar la ubicación del navegador (#235)', () => {
  const codigo = fs
    .readFileSync(path.resolve(__dirname, '..', 'LocationCascadePicker.tsx'), 'utf8')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

  it('su código no trae ni el botón ni sus piezas', () => {
    expect(codigo).not.toMatch(/geolocation|handleUseCurrentGPS|fallbackIPDetection|isDetectingGPS|detectUserLocation|reverseGeocode/);
    expect(codigo).not.toMatch(/Usar mi ubicaci|MI UBICACI/);
  });
});
