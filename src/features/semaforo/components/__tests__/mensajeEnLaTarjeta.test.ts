import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';

/**
 * El mensaje del día en la tarjeta del semáforo de Hoy (spec 006 del backend, T026–T027).
 *
 * Lo que se fija: con mensaje, el sticker y el texto se ven y el texto entra en lo que lee el lector de
 * pantalla; SIN mensaje, la tarjeta es exactamente la de siempre (mismo texto, misma etiqueta, sin el
 * componente); un sticker desconocido o que no carga deja solo el texto; con «reducir movimiento» no hay
 * fundido.
 */

let mockReducido = false;

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../graficos', () => ({ GraficoDeDias: () => null, GraficoDeSemanas: () => null }));
/* Mismo doble de Reanimated que `jest.setup.js`, pero con «reducir movimiento» a voluntad de la prueba. */
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doble: any = jest.requireActual('react-native-reanimated/mock');
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    ...doble,
    useReducedMotion: () => mockReducido,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSharedValue: (inicial: any) => {
      const ref = useRef<unknown>(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});

import { formatearPorcentaje } from '../../utils/lecturaDelSemaforo';
import { TarjetaSemaforoHoy } from '../TarjetaSemaforoHoy';
import { MensajeDelSemaforo } from '../MensajeDelSemaforo';
import type { MensajeDelSemaforo as MensajeDto, SemaforoDeHoy } from '../../types/semaforo.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MENSAJE: MensajeDto = {
  id: 'a011',
  texto: 'María, faltan 2 para avanzar de color. Empieza por lo más sencillo y recupera movimiento.',
  sticker: 'azul-reloj',
};

const SEMAFORO: SemaforoDeHoy = {
  color: 'AMARILLO',
  etiqueta: 'Requiere atención',
  porcentaje: 71.4,
  diasConDatos: 6,
  pausado: false,
  dias: null,
  mensaje: null,
};

let raiz: ReactTestRenderer | null = null;

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz!;
}

const tarjeta = (semaforo: SemaforoDeHoy) =>
  dibujar(React.createElement(TarjetaSemaforoHoy, { semaforo, dias: null, onAbrir: () => undefined }));

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));

const etiquetaDeLaTarjeta = (r: ReactTestRenderer): string =>
  r.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[0].props.accessibilityLabel;

const stickers = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Image);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockReducido = false;
});

describe('la tarjeta del semáforo con el mensaje del día', () => {
  it('con mensaje, pinta el texto y el sticker del búho', () => {
    const r = tarjeta({ ...SEMAFORO, mensaje: MENSAJE });
    expect(textos(r)).toContain(MENSAJE.texto);
    expect(stickers(r)).toHaveLength(1);
    expect(stickers(r)[0].props.contentFit).toBe('contain');
    /* Es decorativo: el lector de pantalla lee el texto, no el nombre de un archivo. */
    expect(stickers(r)[0].props.accessible).toBe(false);
  });

  it('el texto del mensaje se agrega a lo que lee el lector de pantalla, después del resumen de siempre', () => {
    const conMensaje = etiquetaDeLaTarjeta(tarjeta({ ...SEMAFORO, mensaje: MENSAJE }));
    act(() => raiz?.unmount());
    const sinMensaje = etiquetaDeLaTarjeta(tarjeta(SEMAFORO));
    expect(conMensaje).toBe(`${sinMensaje} ${MENSAJE.texto}`);
    expect(sinMensaje).toBe(
      `Abrir tu semáforo de los últimos 7 días. Requiere atención, ${formatearPorcentaje(71.4)}. 6 de 7 días con datos.`,
    );
  });

  it('SIN mensaje, la tarjeta queda idéntica: ni sticker ni texto extra ni el componente', () => {
    const r = tarjeta(SEMAFORO);
    expect(r.root.findAll(n => n.type === MensajeDelSemaforo)).toHaveLength(0);
    expect(stickers(r)).toHaveLength(0);
    expect(textos(r)).toContain('Tu semáforo · últimos 7 días');
    expect(textos(r)).toContain('Requiere atención');
    expect(textos(r)).toContain('6 de 7 días con datos');
    /* Lo único que suma el mensaje es SU texto: con él, la tarjeta dice lo mismo más una línea. */
    const sinMensaje = textos(r);
    act(() => raiz?.unmount());
    const conMensaje = textos(tarjeta({ ...SEMAFORO, mensaje: MENSAJE }));
    expect(conMensaje.filter(t => t !== MENSAJE.texto)).toEqual(sinMensaje);
  });

  it('un sticker que esta versión no conoce deja solo el texto, sin hueco', () => {
    const r = tarjeta({ ...SEMAFORO, mensaje: { ...MENSAJE, sticker: 'violeta-bailando' } });
    expect(stickers(r)).toHaveLength(0);
    expect(textos(r)).toContain(MENSAJE.texto);
  });

  it('sin sticker (`null`) también queda solo el texto', () => {
    const r = tarjeta({ ...SEMAFORO, mensaje: { ...MENSAJE, sticker: null } });
    expect(stickers(r)).toHaveLength(0);
    expect(textos(r)).toContain(MENSAJE.texto);
  });

  it('si la imagen del sticker no carga, se saca y queda el texto', () => {
    const r = tarjeta({ ...SEMAFORO, mensaje: MENSAJE });
    expect(stickers(r)).toHaveLength(1);
    act(() => {
      (stickers(r)[0].props.onError as () => void)();
    });
    expect(stickers(r)).toHaveLength(0);
    expect(textos(r)).toContain(MENSAJE.texto);
  });
});

describe('MensajeDelSemaforo', () => {
  it('el texto es de tamaño de lectura (15, Jost) y va en el color de texto del tema', () => {
    const r = dibujar(React.createElement(MensajeDelSemaforo, { mensaje: MENSAJE }));
    const texto = r.root.findAll(n => (n.type as unknown) === 'Text')[0];
    expect(StyleSheet.flatten(texto.props.style)).toMatchObject({ fontFamily: 'Jost_400Regular', fontSize: 15, color: '#1E1B18' });
  });

  /* > Corregido 2026-10-19 (E2E en el emulador): el fundido con un valor compartido en un `useEffect` dejaba el
     > mensaje montado e invisible en Android. Ahora la entrada es la animación de montaje de Reanimated: la vista
     > nunca lleva una opacidad propia que pueda quedarse en 0. */
  it('entra con la animación de montaje (`entering`), sin opacidad propia que pueda quedarse en 0', () => {
    const r = dibujar(React.createElement(MensajeDelSemaforo, { mensaje: MENSAJE }));
    const conEntrada = r.root.findAll((n: ReactTestInstance) => n.props.entering !== undefined);
    expect(conEntrada.length).toBeGreaterThan(0);
    const conOpacidad = r.root.findAll((n: ReactTestInstance) => {
      const e = StyleSheet.flatten(n.props.style) as { opacity?: number } | undefined;
      return e?.opacity !== undefined;
    });
    expect(conOpacidad).toHaveLength(0);
  });
});
