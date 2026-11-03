import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El Código Renaser compacto (2026-11-03, pedido del dueño): «Allí en el código Renaser hay mucho texto y se extendió demasiado».
 *
 * Se fija lo que se quitó (el título grande, el párrafo y la línea de ayuda de cada pregunta), lo que queda (la cabecera chica y
 * los cinco enunciados) y dónde viven «Escuchar» y «Dictar»: dos íconos en el renglón del enunciado, no una fila de botones debajo.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View: Vista } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: Vista, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-linear-gradient', () => {
  const { View: Vista } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: Vista };
});
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() } }));
jest.mock('../../storage/borradorRadar', () => ({
  borrarBorrador: async () => undefined,
  guardarBorrador: async () => undefined,
  leerBorrador: async () => null,
  limpiarBorradoresViejos: async () => undefined,
}));

const mockDictado = {
  disponible: true,
  dictandoEn: null as string | null,
  parcial: '',
  fallo: null as { campo: string; mensaje: string } | null,
  alternar: jest.fn(),
  detener: jest.fn(),
};
jest.mock('../../hooks/useDictadoDelRadar', () => ({ useDictadoDelRadar: () => mockDictado }));
const mockVoz = { leyendo: null as string | null, alternar: jest.fn(), detener: jest.fn() };
jest.mock('../../hooks/useEscucharPregunta', () => ({ useEscucharPregunta: () => mockVoz }));

import { Icon } from '../../../../components/Icon';
import { Presionable } from '../../../../components/Presionable';
import { SliderRating } from '../../../../components/SliderRating';
import { PREGUNTA_ENERGIA, PREGUNTAS_RADAR } from '../../config/configRadar';
import { BotonDeVoz } from '../BotonDeVoz';
import { CodigoRenaserModal } from '../CodigoRenaserModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Las instancias de un componente dentro de un árbol (los tipos de `react-test-renderer` de este proyecto no traen `findAllByType`). */
const porTipo = (raiz: ReactTestInstance, tipo: unknown): ReactTestInstance[] => raiz.findAll(n => (n.type as unknown) === tipo);

const slot = { hora: 11, etiqueta: '11:00', cierraA: '12:00' } as never;
const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
  Object.assign(mockDictado, { disponible: true, dictandoEn: null, parcial: '', fallo: null });
  mockVoz.leyendo = null;
});

function montar(extra: { obligatorio?: boolean } = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(CodigoRenaserModal, {
        visible: true,
        slot,
        obligatorio: true,
        usuarioId: null,
        enviando: false,
        error: null,
        onEnviar: async () => true,
        onCerrar: () => undefined,
        onLimpiarError: () => undefined,
        ...extra,
      }),
    );
  });
  montadas.push(r);
  return r;
}

const textosSueltos = (n: ReactTestInstance): string[] =>
  n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string').join(''));
const todoElTexto = (r: ReactTestRenderer) => textosSueltos(r.root).join(' | ');

describe('lo que se quitó (menos texto)', () => {
  it('no hay título grande ni el párrafo de «Responde con lo que hay…»', () => {
    const t = todoElTexto(montar());
    expect(t).not.toContain('¿Dónde estás ahora mismo?');
    expect(t).not.toContain('Responde con lo que hay');
    expect(t).not.toContain('Este registro es el de las');
    expect(t).not.toContain('se cierra a las');
  });

  it('ninguna pregunta dibuja su línea de ayuda', () => {
    const t = todoElTexto(montar());
    for (const ayuda of [
      'Lo que estás haciendo en este momento',
      'El pensamiento que te está ocupando',
      'La emoción, no la interpretación',
      'Eso que sabes que toca y estás postergando',
    ]) {
      expect(t).not.toContain(ayuda);
    }
    // Y la configuración tampoco guarda ya una ayuda: no hay de dónde sacarla.
    for (const p of PREGUNTAS_RADAR) expect(Object.keys(p)).not.toContain('ayuda');
  });

  it('en reposo (sin dictar ni escuchar) el único texto de cada pregunta es su enunciado', () => {
    const t = textosSueltos(montar().root);
    expect(t.filter(x => /Te escucho|sube el volumen/.test(x))).toHaveLength(0);
  });
});

describe('lo que queda', () => {
  it('la cabecera es solo «Código Renaser · 11:00», y con «Innegociable» cuando no se puede cerrar', () => {
    const t = textosSueltos(montar().root);
    expect(t).toContain('Código Renaser · 11:00 · Innegociable');
    const opcional = textosSueltos(montar({ obligatorio: false }).root);
    expect(opcional).toContain('Código Renaser · 11:00');
  });

  it('las cinco preguntas, con sus textos exactos y en orden', () => {
    const t = textosSueltos(montar().root);
    const enunciados = [
      '¿Dónde estoy y qué estoy haciendo ahora?',
      '¿Qué estoy pensando?',
      '¿Qué estoy sintiendo?',
      '¿Qué estoy evitando?',
      '¿Cuál es mi nivel de energía?',
    ];
    expect(PREGUNTAS_RADAR.map(p => p.titulo)).toEqual(enunciados.slice(0, 4));
    expect(PREGUNTA_ENERGIA).toBe(enunciados[4]);
    const posiciones = enunciados.map(e => t.indexOf(e));
    expect(posiciones.every(p => p >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('la energía es una pregunta más, con el mismo selector del 1 al 10, y no se dicta ni se escucha', () => {
    const r = montar();
    const [energia] = r.root.findAll((n: ReactTestInstance) => n.type === SliderRating);
    expect(energia.props).toMatchObject({ label: '¿Cuál es mi nivel de energía?', variante: 'pregunta' });
    expect(porTipo(energia, BotonDeVoz)).toHaveLength(0);
  });
});

describe('los íconos de voz viven en el renglón de la pregunta', () => {
  /** El renglón de una pregunta: la `View` en fila que contiene el enunciado y sus botones de voz. */
  function renglonDe(r: ReactTestRenderer, titulo: string): ReactTestInstance {
    const [enunciado] = r.root.findAll(n => (n.type as unknown) === 'Text' && textosSueltos(n).join('') === titulo);
    let actual: ReactTestInstance | null = enunciado.parent;
    while (actual) {
      if (actual.type === View && StyleSheet.flatten(actual.props.style)?.flexDirection === 'row') return actual;
      actual = actual.parent;
    }
    throw new Error(`No hay renglón para ${titulo}`);
  }

  it('cada pregunta de texto tiene su parlante y su micrófono en el MISMO renglón que su enunciado', () => {
    const r = montar();
    for (const p of PREGUNTAS_RADAR) {
      const renglon = renglonDe(r, p.titulo);
      const nombres = porTipo(renglon, Presionable)
        .map(b => String(b.props.accessibilityLabel))
        .sort();
      expect(nombres).toEqual([`Dictar la respuesta a ${p.titulo}`, `Escuchar la pregunta ${p.titulo}`].sort());
    }
  });

  it('son de solo ícono, de 20, con el área táctil de 44 y un solo toque cada uno', () => {
    const r = montar();
    const botones = porTipo(r.root, BotonDeVoz);
    expect(botones).toHaveLength(8);
    for (const b of botones) {
      expect(textosSueltos(b)).toEqual([]);
      const presionable = porTipo(b, Presionable)[0];
      expect(StyleSheet.flatten(presionable.props.style)).toMatchObject({ width: 44, height: 44 });
      expect(porTipo(b, Icon)[0].props.size).toBe(20);
    }
  });

  it('el enunciado cede ancho en vez de aplastar a los íconos, y estos no agrandan el renglón', () => {
    const r = montar();
    const [enunciado] = r.root.findAll(n => (n.type as unknown) === 'Text' && textosSueltos(n).join('') === PREGUNTAS_RADAR[0].titulo);
    expect(StyleSheet.flatten(enunciado.props.style)).toMatchObject({ flex: 1, flexShrink: 1, fontSize: 16 });
    const [par] = renglonDe(r, PREGUNTAS_RADAR[0].titulo).findAll(
      n => n.type === View && porTipo(n, BotonDeVoz).length === 2 && StyleSheet.flatten(n.props.style)?.marginTop !== undefined,
    );
    // 44 de área táctil dentro de un renglón de ~22: sobra 11 por arriba y por abajo.
    expect(StyleSheet.flatten(par.props.style)).toMatchObject({ marginTop: -11, marginBottom: -11, flexShrink: 0 });
  });

  it('sin reconocimiento de voz queda solo el parlante en cada renglón', () => {
    mockDictado.disponible = false;
    const r = montar();
    expect(porTipo(r.root, BotonDeVoz)).toHaveLength(4);
  });
});

describe('cuando algo está activo, se nota', () => {
  it('el micrófono abierto es dorado y selecciona el ícono; las otras tres preguntas siguen en reposo', () => {
    mockDictado.dictandoEn = 'whatAmIFeeling';
    const r = montar();
    const botones = porTipo(r.root, BotonDeVoz);
    const activos = botones.filter(b => b.props.activo);
    expect(activos).toHaveLength(1);
    expect(activos[0].props).toMatchObject({ icono: 'mic', pulso: true });
    expect(activos[0].props.nombreAccesibleActivo).toBe(`Parar de dictar la respuesta a ${PREGUNTAS_RADAR[2].titulo}`);
  });

  it('el parlante mientras suena se marca activo y pasa a pausa', () => {
    mockVoz.leyendo = 'whatAmIThinking';
    const r = montar();
    const activos = porTipo(r.root, BotonDeVoz).filter(b => b.props.activo);
    expect(activos).toHaveLength(1);
    expect(activos[0].props).toMatchObject({ icono: 'volume', iconoActivo: 'pause' });
  });
});
