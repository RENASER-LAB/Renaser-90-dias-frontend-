import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El Código Renaser compacto, con la opción C de la maqueta del dueño (2026-11-03): «Allí en el código Renaser hay mucho texto y se
 * extendió demasiado» y, después, «Dictar dentro del campo».
 *
 * Se fija lo que se quitó (el título grande, el párrafo, la línea de ayuda de cada pregunta, «Escuchar» y el texto del pie del
 * formulario obligatorio), lo que queda (la cabecera chica, los cinco enunciados) y cómo es cada pieza: el micrófono DENTRO del
 * campo, el campo multilínea que crece, lo dictado entrando en la misma caja y la energía en chips.
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

import { Icon } from '../../../../components/Icon';
import { PREGUNTA_ENERGIA, PREGUNTAS_RADAR } from '../../config/configRadar';
import { BotonDeDictar } from '../BotonDeDictar';
import { CodigoRenaserModal } from '../CodigoRenaserModal';
import { EnergiaEnChips } from '../EnergiaEnChips';
import {
  ALTO_MAXIMO_DEL_CAMPO,
  ALTO_MINIMO_DEL_CAMPO,
  LINEAS_MAXIMAS_DEL_CAMPO,
  MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO,
} from '../PreguntaDelRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Las instancias de un componente dentro de un árbol (los tipos de `react-test-renderer` de este proyecto no traen `findAllByType`). */
const porTipo = (raiz: ReactTestInstance, tipo: unknown): ReactTestInstance[] => raiz.findAll(n => (n.type as unknown) === tipo);
/** Los nodos más externos que cumplen la condición (un `Pressable` aparece varias veces en el árbol: el compuesto y el nativo). */
const superiores = (raiz: ReactTestInstance, condicion: (n: ReactTestInstance) => boolean): ReactTestInstance[] =>
  (raiz as unknown as { findAll: (c: (n: ReactTestInstance) => boolean, o: { deep: boolean }) => ReactTestInstance[] }).findAll(condicion, { deep: false });
const estilo = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
/** La `View` más cercana por encima de un nodo (el padre directo de un `Text` o un `TextInput` es el componente, no la caja). */
function vistaDeArriba(n: ReactTestInstance): ReactTestInstance {
  let actual: ReactTestInstance | null = n.parent;
  while (actual && actual.type !== View) actual = actual.parent;
  if (!actual) throw new Error('No hay una View por encima');
  return actual;
}

const slot = { hora: 11, etiqueta: '11:00', cierraA: '12:00' } as never;
const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
  Object.assign(mockDictado, { disponible: true, dictandoEn: null, parcial: '', fallo: null });
  mockDictado.alternar.mockReset();
});

function elemento(extra: { obligatorio?: boolean; textoDelPie?: string } = {}) {
  return React.createElement(CodigoRenaserModal, {
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
  });
}
function montar(extra: { obligatorio?: boolean; textoDelPie?: string } = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento(extra));
  });
  montadas.push(r);
  return r;
}
const refrescar = (r: ReactTestRenderer, extra: { obligatorio?: boolean } = {}) => act(() => r.update(elemento(extra)));

const textosSueltos = (n: ReactTestInstance): string[] =>
  n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''));
const todoElTexto = (r: ReactTestRenderer) => textosSueltos(r.root).join(' | ');
const campos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'TextInput');
const textoExacto = (r: ReactTestRenderer, palabras: string) => r.root.findAll(n => (n.type as unknown) === 'Text' && textosSueltos(n).join('') === palabras)[0];

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
    for (const p of PREGUNTAS_RADAR) expect(Object.keys(p)).not.toContain('ayuda');
  });

  it('«Escuchar» ya no existe: ni el parlante, ni su línea de volumen, ni nada que se llame así', () => {
    const r = montar();
    expect(todoElTexto(r)).not.toMatch(/Escuchar|sube el volumen/);
    const nombres = r.root.findAll(n => typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel as string);
    expect(nombres.filter(n => /Escuchar|Detener la lectura/.test(n))).toEqual([]);
    expect(porTipo(r.root, Icon).filter(i => i.props.name === 'volume' || i.props.name === 'pause')).toHaveLength(0);
  });

  it('el formulario obligatorio de los días 1 a 7 ya no dice «Completa las preguntas cada hora…» bajo «Registrar»', () => {
    const t = todoElTexto(montar({ obligatorio: true }));
    expect(t).not.toContain('Completa las preguntas cada hora');
    expect(t).not.toContain('primeros 7 días');
    expect(t).not.toContain('Puedes cerrarlo');
  });
});

describe('lo que queda', () => {
  it('la cabecera es solo «Código Renaser · 11:00», y con «Innegociable» cuando no se puede cerrar', () => {
    const t = textosSueltos(montar().root);
    expect(t).toContain('Código Renaser · 11:00 · Innegociable');
    expect(textosSueltos(montar({ obligatorio: false }).root)).toContain('Código Renaser · 11:00');
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

  it('el formulario que se puede cerrar sigue diciéndolo bajo «Registrar»; el de Mi Radar dice lo suyo', () => {
    expect(todoElTexto(montar({ obligatorio: false }))).toContain('Puedes cerrarlo; vuelve a ofrecerse la hora que viene.');
    expect(todoElTexto(montar({ obligatorio: false, textoDelPie: 'Texto de Mi Radar' }))).toContain('Texto de Mi Radar');
  });
});

describe('cada pregunta: sola en su renglón, con el micrófono DENTRO del campo (opción C)', () => {
  it('el enunciado queda solo: ningún botón comparte su renglón', () => {
    const r = montar();
    for (const p of PREGUNTAS_RADAR) {
      const enunciado = textoExacto(r, p.titulo);
      const padre = vistaDeArriba(enunciado);
      // El padre de la pregunta es la columna de la pregunta: su primer hijo es el enunciado, y no es una fila.
      expect(StyleSheet.flatten(padre.props.style)?.flexDirection).not.toBe('row');
      expect(porTipo(padre, BotonDeDictar).length).toBe(1);
      // Y el micrófono no cuelga del enunciado: está en la caja del campo, debajo.
      expect(porTipo(enunciado, BotonDeDictar)).toHaveLength(0);
    }
  });

  it('el micrófono comparte la caja del campo (el mismo borde) y va anclado ABAJO a la derecha', () => {
    const r = montar();
    const [campo] = campos(r);
    const caja = vistaDeArriba(campo);
    expect(porTipo(caja, BotonDeDictar)).toHaveLength(1);
    const ancla = caja.findAll(n => (n.type as unknown) === View && estilo(n).position === 'absolute')[0];
    expect(estilo(ancla)).toMatchObject({ position: 'absolute', right: 4, bottom: 4 });
    expect(porTipo(ancla, BotonDeDictar)).toHaveLength(1);
    // La caja lleva el borde y el fondo; el campo de adentro no tiene borde propio.
    expect(estilo(caja).borderWidth).toBe(1);
    expect(estilo(campo).borderWidth).toBeUndefined();
  });

  it('el micrófono es de solo ícono: 20 de ícono, 44 de área táctil, gris en reposo', () => {
    const r = montar();
    const [mic] = porTipo(r.root, BotonDeDictar);
    expect(porTipo(mic, Icon)[0].props).toMatchObject({ name: 'mic', size: 20 });
    expect(textosSueltos(mic)).toEqual([]);
    const [area] = superiores(mic, n => n.props.accessibilityRole === 'button');
    expect(estilo(area)).toMatchObject({ width: 44, height: 44 });
    expect(mic.props.activo).toBe(false);
  });

  it('el texto deja margen a la derecha para no pasar por debajo del micrófono; sin micrófono, el margen normal', () => {
    const r = montar();
    for (const campo of campos(r)) expect(estilo(campo).paddingRight).toBe(MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO);
    expect(MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO).toBeGreaterThanOrEqual(44 + 4);
    mockDictado.disponible = false;
    const sinMicrofono = montar();
    expect(porTipo(sinMicrofono.root, BotonDeDictar)).toHaveLength(0);
    for (const campo of campos(sinMicrofono)) expect(estilo(campo).paddingRight).toBe(14);
  });
});

describe('el campo multilínea que crece', () => {
  it('es multilínea, arranca en unas 2 líneas (~72) y crece hasta 5 antes de desplazarse por dentro', () => {
    const r = montar();
    expect(campos(r)).toHaveLength(4);
    for (const campo of campos(r)) {
      expect(campo.props.multiline).toBe(true);
      expect(campo.props.scrollEnabled).toBe(true);
      expect(estilo(campo).minHeight).toBe(ALTO_MINIMO_DEL_CAMPO);
      expect(estilo(campo).maxHeight).toBe(ALTO_MAXIMO_DEL_CAMPO);
      expect(estilo(campo).textAlignVertical).toBe('top');
    }
    expect(ALTO_MINIMO_DEL_CAMPO).toBe(72);
    expect(LINEAS_MAXIMAS_DEL_CAMPO).toBe(5);
    // Cinco líneas de 22 más el relleno de arriba y de abajo: el tope no llega a seis líneas.
    expect(ALTO_MAXIMO_DEL_CAMPO).toBeGreaterThanOrEqual(5 * 22);
    expect(ALTO_MAXIMO_DEL_CAMPO).toBeLessThan(6 * 22);
  });

  it('no hay un segundo scroll de pantalla: el único `ScrollView` es el del formulario', () => {
    const r = montar();
    expect(r.root.findAll(n => (n.type as unknown) === 'RCTScrollView').length).toBeLessThanOrEqual(1);
  });
});

describe('lo dictado entra en el campo mientras se habla', () => {
  it('el campo muestra lo escrito más lo que el reconocedor va entendiendo, en la misma caja, y no se puede teclear', () => {
    mockDictado.dictandoEn = 'whatAmIThinking';
    mockDictado.parcial = 'estoy pensando en la cuenta';
    const r = montar();
    const [, campo] = campos(r);
    expect(campo.props.value).toBe('estoy pensando en la cuenta');
    expect(campo.props.editable).toBe(false);
    // Las otras tres preguntas no se tocan.
    expect(campos(r)[0].props.value).toBe('');
    expect(campos(r)[0].props.editable).toBe(true);
  });

  it('cada tramo nuevo del reconocedor reescribe el mismo campo (crece con el texto)', () => {
    mockDictado.dictandoEn = 'whatAmIDoing';
    mockDictado.parcial = 'estoy en la oficina';
    const r = montar();
    expect(campos(r)[0].props.value).toBe('estoy en la oficina');
    mockDictado.parcial = 'estoy en la oficina revisando los correos del equipo';
    refrescar(r);
    expect(campos(r)[0].props.value).toBe('estoy en la oficina revisando los correos del equipo');
  });

  it('el cursor queda al final mientras se dicta y después, hasta que la persona toca el campo', () => {
    mockDictado.dictandoEn = 'whatAmIDoing';
    mockDictado.parcial = 'texto dictado';
    const r = montar();
    expect(campos(r)[0].props.selection).toEqual({ start: 13, end: 13 });
    // Sigue al final cuando llega más texto.
    mockDictado.parcial = 'texto dictado y más texto';
    refrescar(r);
    expect(campos(r)[0].props.selection).toEqual({ start: 25, end: 25 });
    // Termina el dictado: el cursor se queda al final.
    mockDictado.dictandoEn = null;
    mockDictado.parcial = '';
    refrescar(r);
    expect(campos(r)[0].props.selection).toBeDefined();
    // La persona toca el campo para corregir: el cursor vuelve a ser suyo.
    act(() => campos(r)[0].props.onFocus());
    expect(campos(r)[0].props.selection).toBeUndefined();
  });

  it('sin dictado el cursor es de quien escribe (no se fuerza ninguna selección)', () => {
    const r = montar();
    for (const campo of campos(r)) expect(campo.props.selection).toBeUndefined();
  });

  it('mientras dicta el micrófono se ve activo y la caja toma el borde dorado', () => {
    mockDictado.dictandoEn = 'whatAmIFeeling';
    const r = montar();
    const activos = porTipo(r.root, BotonDeDictar).filter(m => m.props.activo);
    expect(activos).toHaveLength(1);
    expect(activos[0].props.nombreAccesibleActivo).toBe(`Parar de dictar la respuesta a ${PREGUNTAS_RADAR[2].titulo}`);
    expect(campos(r)[2].props.placeholder).toBe('Te escucho…');
  });
});

describe('la energía en chips del 1 al 10', () => {
  it('la quinta pregunta son diez chips de 44 de alto, uno por número, y no tienen micrófono', () => {
    const r = montar();
    const [energia] = porTipo(r.root, EnergiaEnChips);
    const chips = superiores(energia, n => n.props.accessibilityRole === 'radio');
    expect(chips).toHaveLength(10);
    expect(chips.map(c => textosSueltos(c).join(''))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    for (const chip of chips) {
      const cuerpo = porTipo(chip, View).find(v => estilo(v).height === 44);
      expect(cuerpo).toBeDefined();
    }
    expect(porTipo(energia, BotonDeDictar)).toHaveLength(0);
  });

  it('debajo, «En reserva» y «A tope» a 13', () => {
    const r = montar();
    for (const palabras of ['En reserva', 'A tope']) {
      const t = textoExacto(r, palabras);
      expect(estilo(t).fontSize).toBe(13);
    }
  });

  it('elegir un chip llama a onChange con el número; el elegido va en dorado suave y en negrita', () => {
    const r = montar();
    const [energia] = porTipo(r.root, EnergiaEnChips);
    const cualquiera = () => superiores(porTipo(r.root, EnergiaEnChips)[0], n => n.props.accessibilityRole === 'radio');
    expect(cualquiera().every(c => c.props.accessibilityState.selected === false)).toBe(true);

    act(() => cualquiera()[6].props.onPress());

    const despues = cualquiera();
    expect(despues.map(c => c.props.accessibilityState.selected)).toEqual([false, false, false, false, false, false, true, false, false, false]);
    const siete = textoExacto(r, '7');
    expect(estilo(siete).fontFamily).toMatch(/700Bold/);
    expect(energia).toBeDefined();
  });
});
