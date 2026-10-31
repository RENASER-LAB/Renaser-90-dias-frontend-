/**
 * #41: la hoja «Tomar foto / Elegir de la galería» de KILÓMETROS DIARIOS. Se prueba lo que ve y toca la
 * persona: los dos textos claros, que elegir avise qué se eligió y vibre una sola vez, y que cerrar la
 * hoja sea «no sacar ninguna foto». Y dónde se monta: sola antes de que haya foto, y DENTRO del `Modal` de la
 * pantalla partida cuando se cambia la foto (en iOS un `Modal` hermano no se presenta sobre otro).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Modal } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: (props: object) => React.createElement(View, props),
  };
});
const mockSeleccion = jest.fn();
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => undefined },
}));

import type { PropsRegistroConFotoModal } from '../../hooks/useRegistroConFoto';
import { HojaDeOrigenDeLaFoto, OPCIONES_DE_ORIGEN } from '../HojaDeOrigenDeLaFoto';
import { RegistroConFotoModal } from '../RegistroConFotoModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer;

function montar(elemento: React.ReactElement): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz;
}

function tocable(r: ReactTestRenderer, etiqueta: RegExp): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      etiqueta.test(n.props.accessibilityLabel),
  );
  if (!nodo) throw new Error(`No hay nada tocable con la etiqueta ${String(etiqueta)}`);
  return nodo;
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .flatMap(n => ([] as unknown[]).concat(n.props.children).filter((x): x is string => typeof x === 'string'));

beforeEach(() => {
  mockSeleccion.mockReset();
});

describe('la hoja «de dónde sale la foto»', () => {
  it('ofrece exactamente «Tomar foto» y «Elegir de la galería»', () => {
    expect(OPCIONES_DE_ORIGEN.map(o => [o.origen, o.titulo])).toEqual([
      ['camara', 'Tomar foto'],
      ['galeria', 'Elegir de la galería'],
    ]);
    const onElegir = jest.fn();
    const r = montar(
      React.createElement(HojaDeOrigenDeLaFoto, {
        origen: { titulo: 'Kilómetros diarios', onElegir, onCancelar: jest.fn() },
      }),
    );
    expect(textos(r)).toEqual(expect.arrayContaining(['Tomar foto', 'Elegir de la galería', 'Para registrar «Kilómetros diarios»']));
  });

  it('elegir la galería avisa «galeria» y vibra una sola vez; elegir la cámara, «camara»', () => {
    const onElegir = jest.fn();
    const r = montar(
      React.createElement(HojaDeOrigenDeLaFoto, {
        origen: { titulo: 'Kilómetros diarios', onElegir, onCancelar: jest.fn() },
      }),
    );
    act(() => tocable(r, /^Elegir de la galería/).props.onPress());
    expect(onElegir).toHaveBeenLastCalledWith('galeria');
    expect(mockSeleccion).toHaveBeenCalledTimes(1);
    act(() => tocable(r, /^Tomar foto/).props.onPress());
    expect(onElegir).toHaveBeenLastCalledWith('camara');
    expect(mockSeleccion).toHaveBeenCalledTimes(2);
  });

  it('con `origen` en null no se ve ninguna hoja', () => {
    const r = montar(React.createElement(HojaDeOrigenDeLaFoto, { origen: null }));
    expect(r.root.findAll(n => n.type === Modal)).toHaveLength(0);
  });

  it('cerrarla (✕, fondo, gesto o atrás) no saca ninguna foto', () => {
    const onCancelar = jest.fn();
    const onElegir = jest.fn();
    const r = montar(
      React.createElement(HojaDeOrigenDeLaFoto, { origen: { titulo: 'Kilómetros diarios', onElegir, onCancelar } }),
    );
    act(() => tocable(r, /^Cerrar sin elegir la foto$/).props.onPress());
    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onElegir).not.toHaveBeenCalled();
  });
});

const PROPS: PropsRegistroConFotoModal = {
  registro: null,
  origen: null,
  respuesta: '',
  enviando: false,
  error: null,
  onCambiarRespuesta: () => undefined,
  onRetomarFoto: () => undefined,
  onTerminar: () => undefined,
  onCerrar: () => undefined,
};

describe('dónde se monta la hoja', () => {
  const origen = { titulo: 'Kilómetros diarios', onElegir: jest.fn(), onCancelar: jest.fn() };

  it('antes de que haya foto, sola', () => {
    const r = montar(React.createElement(RegistroConFotoModal, { ...PROPS, origen }));
    expect(r.root.findAll(n => n.type === Modal)).toHaveLength(1);
    expect(textos(r)).toContain('Elegir de la galería');
  });

  it('con la pantalla partida abierta, dentro de su Modal', () => {
    const registro = {
      registroId: 'r-1',
      titulo: 'Kilómetros diarios',
      conPregunta: false,
      archivo: { uri: 'file:///a.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const, etiqueta: 'a', tomadaEn: null },
      evidenciaYaSubida: false,
      medicion: { unidad: 'KILOMETROS' as const, totalPrevio: 3 },
    };
    const r = montar(React.createElement(RegistroConFotoModal, { ...PROPS, registro, origen }));
    const modales = r.root.findAll(n => n.type === Modal);
    expect(modales).toHaveLength(2);
    // El segundo `Modal` (la hoja) cuelga del primero (la pantalla partida).
    expect(modales[0].findAll(n => n === modales[1])).toHaveLength(1);
    // El botón de arriba de la foto dice «cambiar», porque ahora también se puede elegir otra de la galería.
    expect(tocable(r, /^Cambiar la foto$/)).toBeDefined();
  });

  it('sin km el botón sigue diciendo «Tomar otra foto» y no hay hoja', () => {
    const registro = {
      registroId: 'r-1',
      titulo: 'Ducha fría',
      conPregunta: true,
      archivo: { uri: 'file:///a.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const, etiqueta: 'a', tomadaEn: null },
      evidenciaYaSubida: false,
      medicion: null,
    };
    const r = montar(React.createElement(RegistroConFotoModal, { ...PROPS, registro }));
    expect(r.root.findAll(n => n.type === Modal)).toHaveLength(1);
    expect(tocable(r, /^Tomar otra foto$/)).toBeDefined();
  });
});
