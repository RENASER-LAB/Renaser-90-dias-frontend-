/**
 * Comunidad → Eventos, compacta (2026-11-03, pedido del dueño con capturas de su teléfono: «Redúcele el tamaño de texto, es muy
 * grande»): la cabecera de la sección —«Mi agenda» y «Crear evento», «Calendario / Tarjetas», «Solo a los que voy» y el mes con
 * «Hoy ‹ ›»— ocupaba media pantalla antes del calendario.
 *
 * Se fijan los números que se pidieron: botones de 44 de alto con la etiqueta a 15 y SIEMPRE en un renglón («Crear evento» nunca en
 * dos), el selector de formación a 14, el mes a 20 y menos aire entre las filas. La sección se monta de verdad; sus hijos pesados
 * (el calendario, el detalle…) y la red son dobles.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => undefined }));
jest.mock('../../../../services/http/apiClient', () => ({ ApiError: class extends Error {}, mensajeDeError: () => '' }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
jest.mock('../../api/eventosApi', () => ({ obtenerEvento: () => new Promise(() => undefined) }));
jest.mock('../../utils/portadaDelEvento', () => ({ subirPortada: async () => undefined }));
jest.mock('../../utils/vistaPreferida', () => ({
  VISTA_POR_DEFECTO: 'calendario',
  leerVistaPreferida: async () => 'calendario',
  guardarVistaPreferida: async () => undefined,
}));
jest.mock('../../hooks/useEventos', () => ({
  useEventos: () => ({
    ocurrencias: [],
    cargando: false,
    refrescando: false,
    fallo: null,
    yaLeido: true,
    recargar: async () => null,
    responder: async () => null,
    quitarDeLaLista: async () => null,
  }),
}));
jest.mock('../../hooks/useEventosDelMes', () => ({
  useEventosDelMes: () => ({ ocurrencias: [], cargando: false, fallo: null, recargar: async () => null, marcarAsistencia: async () => null }),
}));
jest.mock('../DetalleDelEvento', () => ({ DetalleDelEvento: () => null }));
jest.mock('../FormularioDelEvento', () => ({ FormularioDelEvento: () => null }));
jest.mock('../MiAgenda', () => ({ MiAgenda: () => null }));
jest.mock('../TarjetasDeEventos', () => ({ TarjetasDeEventos: () => null }));
jest.mock('../../../formaciones/hooks/useFormacionDeLaComunidad', () => ({
  useFormacionDeLaComunidad: () => ({
    hayQueElegirParaCrear: false,
    mostrarSelector: true,
    eleccion: 'TODAS',
    opciones: [
      { valor: 'TODAS', etiqueta: 'Todas', nombreCompleto: 'Todas las formaciones' },
      { valor: 'ESCUELA', etiqueta: 'Escuela', nombreCompleto: 'Escuela Renaser' },
      { valor: 'DIPLOMADO', etiqueta: 'Diplomado', nombreCompleto: 'Diplomado' },
      { valor: 'CERTIFICACION', etiqueta: 'Certificación', nombreCompleto: 'Certificación' },
    ],
    elegir: () => undefined,
  }),
}));

import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { BotonPrincipal, BotonSecundario } from '../../../../components/Legible';
import { BarraInferiorProvider } from '../../../../navigation/barraAlDesplazar/BarraInferior';
import { SelectorDeFormacionDeLaComunidad } from '../../../formaciones/components/SelectorDeFormacionDeLaComunidad';
import { CalendarioDelMes } from '../CalendarioDelMes';
import { SeccionEventos } from '../SeccionEventos';
import { SelectorDeVista } from '../SelectorDeVista';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});
async function montar(elemento: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento);
  });
  montadas.push(r);
  return r;
}
const porTipo = (raiz: ReactTestInstance, tipo: unknown) => raiz.findAll(n => (n.type as unknown) === tipo);
/** Los nodos más externos que cumplen la condición (un `Pressable` aparece varias veces en el árbol: el compuesto y el nativo). */
const superiores = (raiz: ReactTestInstance, condicion: (n: ReactTestInstance) => boolean): ReactTestInstance[] =>
  (raiz as unknown as { findAll: (c: (n: ReactTestInstance) => boolean, o: { deep: boolean }) => ReactTestInstance[] }).findAll(condicion, { deep: false });
const estilo = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
/** El botón de Legible por su etiqueta accesible, con el `Pressable` que lo dibuja y su texto. */
function boton(r: ReactTestRenderer, nombre: string) {
  const [pressable] = r.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === nombre && typeof n.props.onPress === 'function');
  const [texto] = pressable.findAll(n => (n.type as unknown) === 'Text');
  const flatten = (n: ReactTestInstance) => StyleSheet.flatten(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style) ?? {};
  return { caja: flatten(pressable), texto, estiloDelTexto: estilo(texto) };
}

describe('los botones de Legible, en su forma compacta', () => {
  it('compacto: 44 de alto, etiqueta de 15 en un solo renglón que se achica antes de bajar', async () => {
    const r = await montar(React.createElement(BotonPrincipal, { etiqueta: 'Crear evento', icono: 'plus', compacto: true, onPress: () => undefined }));
    const { caja, texto, estiloDelTexto } = boton(r, 'Crear evento');
    expect(caja.minHeight).toBe(44);
    expect(estiloDelTexto.fontSize).toBe(15);
    expect(texto.props.numberOfLines).toBe(1);
    expect(texto.props.adjustsFontSizeToFit).toBe(true);
    expect(texto.props.minimumFontScale).toBe(0.85);
  });

  it('sin `compacto`, el botón es el de siempre: 52 de alto, 17 de letra y sin tope de renglones', async () => {
    const r = await montar(React.createElement(BotonSecundario, { etiqueta: 'Mi agenda', onPress: () => undefined }));
    const { caja, texto, estiloDelTexto } = boton(r, 'Mi agenda');
    expect(caja.minHeight).toBe(52);
    expect(estiloDelTexto.fontSize).toBe(17);
    expect(texto.props.numberOfLines).toBeUndefined();
    expect(texto.props.adjustsFontSizeToFit).toBeFalsy();
  });
});

describe('la cabecera de Eventos', () => {
  async function seccion(rol: string) {
    return montar(
      React.createElement(
        BarraInferiorProvider,
        null,
        React.createElement(SeccionEventos, {
          userId: 'u-1',
          rol,
          eventoPedido: null,
          onEventoPedidoAtendido: () => undefined,
          volverRef: { current: null },
        }),
      ),
    );
  }

  it('«Mi agenda» y «Crear evento» miden 44, con la etiqueta a 15 y en un renglón', async () => {
    const r = await seccion('ADMIN');
    for (const nombre of ['Mi agenda', 'Crear evento']) {
      const { caja, texto, estiloDelTexto } = boton(r, nombre);
      expect(caja.minHeight).toBe(44);
      expect(estiloDelTexto.fontSize).toBe(15);
      expect(texto.props.numberOfLines).toBe(1);
    }
  });

  it('sin permiso para crear, solo está «Mi agenda»', async () => {
    const r = await seccion('TRAINEE');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Crear evento')).toHaveLength(0);
    expect(boton(r, 'Mi agenda').caja.minHeight).toBe(44);
  });

  it('«Calendario / Tarjetas» mide 44 con la letra a 15', async () => {
    const r = await seccion('ADMIN');
    const [selector] = porTipo(r.root, SelectorDeVista);
    const opciones = superiores(selector, n => n.props.accessibilityRole === 'tab');
    expect(opciones).toHaveLength(2);
    for (const op of opciones) {
      const fila = StyleSheet.flatten(op.props.style({ pressed: false }));
      expect(fila.minHeight).toBe(44);
      const [texto] = op.findAll(n => (n.type as unknown) === 'Text');
      expect(estilo(texto).fontSize).toBe(15);
    }
  });

  it('«Solo a los que voy» mide 44 con la letra a 15', async () => {
    const r = await seccion('ADMIN');
    const [casilla] = superiores(r.root, n => n.props.accessibilityRole === 'checkbox');
    expect(StyleSheet.flatten(casilla.props.style({ pressed: false })).minHeight).toBe(44);
    const [texto] = casilla.findAll(n => (n.type as unknown) === 'Text');
    expect(estilo(texto).fontSize).toBe(15);
  });

  it('menos aire entre las filas: 10 (eran 16)', async () => {
    const r = await seccion('ADMIN');
    const [scroll] = r.root.findAll(n => (n.type as unknown) === 'RCTScrollView');
    const [contenedor] = scroll.findAll(n => (n.type as unknown) === 'View' && estilo(n).gap === 10 && !('flexDirection' in estilo(n)));
    expect(contenedor).toBeDefined();
  });
});

describe('el mes del calendario', () => {
  const propsDelCalendario = {
    mes: { anio: 2026, mes: 10 },
    hoyIso: '2026-11-03',
    porDia: {},
    diaElegido: '2026-11-03',
    zona: 'America/Lima',
    cargando: false,
    fallo: false,
    onCambiarMes: () => undefined,
    onHoy: () => undefined,
    onElegirDia: () => undefined,
    onReintentar: () => undefined,
    onAbrir: () => undefined,
  };

  it('el nombre del mes va a 20 y el año a 14', async () => {
    const r = await montar(React.createElement(CalendarioDelMes, propsDelCalendario));
    const [mes] = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header');
    expect(estilo(mes).fontSize).toBe(20);
    const textos = r.root.findAll(n => (n.type as unknown) === 'Text').filter(n => String(n.props.children) === '2026');
    expect(estilo(textos[0]).fontSize).toBe(14);
  });

  it('«Hoy», «‹» y «›» miden 44', async () => {
    const r = await montar(React.createElement(CalendarioDelMes, propsDelCalendario));
    for (const nombre of ['Ir a hoy', 'Mes anterior', 'Mes siguiente']) {
      expect(boton(r, nombre).caja.minHeight).toBe(44);
    }
  });
});

describe('el selector de formación (Todas / Escuela / Diplomado / Certificación)', () => {
  it('va en su forma compacta: letra de 14 y segmentos de 40 con el área táctil en 44', async () => {
    const r = await montar(React.createElement(SelectorDeFormacionDeLaComunidad));
    const [control] = porTipo(r.root, ControlSegmentado);
    expect(control.props.compacto).toBe(true);
    const segmentos = superiores(r.root, n => n.props.accessibilityRole === 'radio');
    expect(segmentos).toHaveLength(4);
    for (const s of segmentos) {
      expect(StyleSheet.flatten(s.props.style).minHeight).toBe(40);
      expect(s.props.hitSlop).toEqual({ top: 2, bottom: 2 });
      const [texto] = s.findAll(n => (n.type as unknown) === 'Text');
      expect(estilo(texto).fontSize).toBe(14);
    }
  });

  it('los demás controles segmentados no cambian (14,5 y 44)', async () => {
    const r = await montar(
      React.createElement(ControlSegmentado, {
        opciones: [
          { valor: 'a', etiqueta: 'Uno' },
          { valor: 'b', etiqueta: 'Dos' },
        ],
        valor: 'a',
        onCambiar: () => undefined,
      }),
    );
    const [segmento] = superiores(r.root, n => n.props.accessibilityRole === 'tab');
    expect(StyleSheet.flatten(segmento.props.style).minHeight).toBe(44);
    const [texto] = segmento.findAll(n => (n.type as unknown) === 'Text');
    expect(estilo(texto).fontSize).toBe(14.5);
  });
});
