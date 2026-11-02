/**
 * La fila de «Kilómetros diarios» con los pasos del teléfono (spec 037, D-310; maqueta 1.1, 2.1, 2.2, 2.3 y 3.2): solo esa fila cambia, y
 * solo cuando hay pasos que ofrecer. Sin proveedor —un día anterior, o un backend anterior— es la fila de siempre.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { HabitItem } from '../../../../screens/TrainingScreen';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { ProveedorDePasosDeLaLista, type PasosDeLaLista } from '../../../pasos/components/PasosDeLaLista';
import type { VistaDeKilometros } from '../../../pasos/utils/vistaDeKilometros';
import type { ItemDelDia } from '../../utils/itemsDelDia';
import type { ModoDeLaFila } from '../../utils/filaDelDia';
import { FilaDelDia } from '../FilaDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NBSP = ' ';
const TELEFONO = { paquete: 'x', etiqueta: 'Tu teléfono', dispositivo: 'TELEFONO' as const };

const habit = (extra: Partial<HabitItem> = {}): HabitItem => ({
  id: 'r-km', habitoId: 'h-km', dimension: 'CUERPO', title: 'Kilómetros diarios', time: '17:00', tag: 'Innegociable', streak: 4,
  done: false, hasEvidence: false, tieneTrackHoy: true, estado: 'PENDIENTE', evidenceRequirement: 'REQUIRED', systemKey: 'DAILY_KM', ...extra,
});
const item = (h: HabitItem = habit(), extra: Partial<ItemDelDia> = {}): ItemDelDia => ({
  clave: h.id, tipo: 'habito', titulo: 'Kilómetros diarios', hora: '17:00', hecho: h.done, icono: null, dimension: 'Cuerpo',
  puntos: 8, guia: null, habit: h, ...extra,
});

const avance = (km: number, metaLista: boolean): VistaDeKilometros => ({
  modo: 'avance', km, pasos: 7120, meta: 5, metaLista, aproximado: false, fuente: TELEFONO, fuentes: [TELEFONO], noSumadas: [],
  leidoEn: new Date(2026, 10, 4, 17, 8), conectadoHoyA: null,
});

const pasosDe = (vista: VistaDeKilometros, extra: Partial<PasosDeLaLista> = {}): PasosDeLaLista => ({
  registroId: 'r-km', vista, registrando: false, onConectar: jest.fn(), onActualizar: jest.fn(), onRegistrar: jest.fn(), ...extra,
});

let raiz: ReactTestRenderer | null = null;
const onAbrir = jest.fn();
const onSubir = jest.fn();

function montar(pasos: PasosDeLaLista | null, it_: ItemDelDia = item(), modo: ModoDeLaFila = 'hoy') {
  const fila = React.createElement(FilaDelDia, { item: it_, modo, marca: null, ahoraMs: Date.parse('2026-11-04T22:00:00Z'), onAbrir, onSubir });
  act(() => {
    raiz = TestRenderer.create(React.createElement(ProveedorDePasosDeLaLista, { value: pasos }, fila));
  });
}
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const textosDe = (n: ReactTestInstance) => textosDeNodos(n.findAll(() => true));
const porEtiqueta = (etiqueta: string) =>
  raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta)[0];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  onAbrir.mockReset();
  onSubir.mockReset();
});

describe('la fila de «Kilómetros diarios» con pasos', () => {
  it('sin proveedor (un backend anterior o un día anterior) es la fila de siempre: sin enlace, con «Subir»', () => {
    montar(null);
    expect(textos()).toContain('Kilómetros diarios');
    expect(textos()).toContain('Subir');
    expect(textos()).not.toContain('Cuenta tus pasos solo');
  });

  it('sin conectar: el enlace «Cuenta tus pasos solo ›» bajo el nombre, y «Subir» sigue ahí como respaldo', () => {
    const pasos = pasosDe({ modo: 'ofrecer', soporte: 'disponible' });
    montar(pasos);
    expect(textos()).toContain('Cuenta tus pasos solo');
    expect(textos()).toContain('Subir');
    act(() => porEtiqueta('Cuenta tus pasos solo').props.onPress());
    expect(pasos.onConectar).toHaveBeenCalledTimes(1);
    expect(onAbrir).not.toHaveBeenCalled();
  });

  it('en curso: la barra y «3,2 de 5 km», el círculo apagado y NINGÚN botón de registro ni «Subir» (maqueta 2.1)', () => {
    montar(pasosDe(avance(3.2, false)));
    expect(textos()).toContain(`3,2 de 5${NBSP}km`);
    expect(porEtiqueta('Todavía no llegas a tu meta')).toBeUndefined();
    const circulo = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Todavía no llegas a tu meta')[0];
    expect(circulo).toBeDefined();
    expect(textos()).not.toContain('Registrar');
    expect(textos()).not.toContain('Subir');
  });

  it('con la meta lista: «Registrar» (48 de alto) cierra el hábito, y tocar el nombre abre la hoja de los km', () => {
    const pasos = pasosDe(avance(5.4, true));
    montar(pasos);
    expect(textos()).toContain(`5,4${NBSP}km · ¡Meta lista!`);
    const registrar = porEtiqueta('Registrar Kilómetros diarios');
    expect(registrar).toBeDefined();
    expect(Object.assign({}, ...[registrar.props.style].flat(3).filter(Boolean)).minHeight).toBeGreaterThanOrEqual(48);
    act(() => registrar.props.onPress());
    expect(pasos.onRegistrar).toHaveBeenCalledTimes(1);

    const fila = raiz!.root.findAll(n => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel ?? '').startsWith('17:00'))[0];
    act(() => fila.props.onPress());
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('mientras registra, el botón no se puede volver a tocar', () => {
    montar(pasosDe(avance(5.4, true), { registrando: true }));
    expect(porEtiqueta('Registrar Kilómetros diarios').props.disabled).toBe(true);
  });

  it('sin pasos hoy: lo dice, «Actualizar», y la captura sigue siendo un botón aparte («Subir captura»)', () => {
    const pasos = pasosDe({ modo: 'sin-datos', hayManuales: false });
    montar(pasos);
    expect(textos()).toContain('Todavía no vemos pasos hoy');
    act(() => porEtiqueta('Actualizar').props.onPress());
    expect(pasos.onActualizar).toHaveBeenCalledTimes(1);
    act(() => porEtiqueta('Subir captura de Kilómetros diarios').props.onPress());
    expect(onSubir).toHaveBeenCalledTimes(1);
  });

  it('sin permiso: «Perdimos tus pasos» y la captura de respaldo', () => {
    montar(pasosDe({ modo: 'sin-permiso' }));
    expect(textos()).toContain('Perdimos tus pasos');
    expect(porEtiqueta('Subir captura de Kilómetros diarios')).toBeDefined();
  });

  it('ya cumplido: dice cuántos km, y es una fila hecha como las demás', () => {
    const hecha = habit({ done: true });
    montar(pasosDe({ modo: 'cumplido', km: 5.4, origen: 'HEALTH_CONNECT', fuente: 'Galaxy Watch' }), item(hecha, { hecho: true }), 'hecho');
    expect(textos()).toContain(`5,4${NBSP}km`);
    expect(textos()).not.toContain('Registrar');
  });

  it('otra fila de Training no cambia nunca, aunque haya pasos', () => {
    const otro = habit({ id: 'r-otro', habitoId: 'h-otro', title: 'Gimnasio', systemKey: 'GYM' });
    montar(pasosDe(avance(5.4, true)), item(otro, { titulo: 'Gimnasio' }));
    expect(textos()).toContain('Subir');
    expect(textos()).not.toContain('Registrar');
    expect(textos()).not.toContain('Meta lista');
  });

  it('fuera de hoy nunca ofrece registrar nada, aunque haya pasos', () => {
    const fila = React.createElement(FilaDelDia, {
      item: item(), modo: 'planificado' as ModoDeLaFila, marca: null, ahoraMs: Date.parse('2026-11-04T22:00:00Z'), esHoy: false, onAbrir,
    });
    act(() => {
      raiz = TestRenderer.create(React.createElement(ProveedorDePasosDeLaLista, { value: pasosDe(avance(5.4, true)) }, fila));
    });
    expect(textos()).not.toContain('Registrar');
    expect(textos()).not.toContain('Subir');
    expect(textos()).not.toContain('Meta lista');
  });
});
