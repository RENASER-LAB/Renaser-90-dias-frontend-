/**
 * «Kilómetros diarios» se adapta al teléfono (spec 042, pedido del dueño del 2026-11-05: «que se detecte el dispositivo solo»).
 * Donde se puede correr con GPS (Android, servidor con carreras e interruptor prendido) el botón de la derecha es «Correr» y no
 * «Subir»; la captura queda como opción secundaria en la hoja del hábito. En cualquier otro caso la fila es la de siempre.
 */
// spec 042 FR-001, FR-045
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

let mockEnCurso = false;
jest.mock('../../../carrera/hooks/useCarreraEnVivo', () => ({ useCarreraEnVivo: () => (mockEnCurso ? { fase: 'corriendo' } : null) }));
const mockPedirLaCarrera = jest.fn();
jest.mock('../../../carrera/servicios/pedidosDeLaCarrera', () => ({ pedirLaCarrera: (p: unknown) => mockPedirLaCarrera(p) }));

import { ProveedorDePasosDeLaLista, type PasosDeLaLista } from '../../../pasos/components/PasosDeLaLista';
import type { VistaDeKilometros } from '../../../pasos/utils/vistaDeKilometros';
import { lugarDeLaCarrera } from '../../../carrera/utils/entradaDeLaCarrera';
import type { ItemDelDia } from '../../utils/itemsDelDia';
import type { ModoDeLaFila } from '../../utils/filaDelDia';
import { FilaDelDia } from '../FilaDelDia';
import { HojaDelHabito } from '../HojaDelHabito';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TELEFONO = { paquete: 'x', etiqueta: 'Tu teléfono', dispositivo: 'TELEFONO' as const };
const habit = (extra: Partial<HabitItem> = {}): HabitItem => ({
  id: 'r-km', habitoId: 'h-km', dimension: 'CUERPO', title: 'Kilómetros diarios', time: '17:00', tag: 'Innegociable', streak: 4,
  done: false, hasEvidence: false, tieneTrackHoy: true, estado: 'PENDIENTE', evidenceRequirement: 'REQUIRED', systemKey: 'DAILY_KM', ...extra,
});
const item = (h: HabitItem = habit()): ItemDelDia => ({
  clave: h.id, tipo: 'habito', titulo: 'Kilómetros diarios', hora: '17:00', hecho: h.done, icono: null, dimension: 'Cuerpo',
  puntos: 8, guia: null, habit: h,
});
const captura: VistaDeKilometros = { modo: 'captura' } as VistaDeKilometros;
const pasosDe = (vista: VistaDeKilometros, carrera: boolean): PasosDeLaLista => ({
  registroId: 'r-km', vista, registrando: false, onConectar: jest.fn(), onActualizar: jest.fn(), onRegistrar: jest.fn(), carrera,
});

let raiz: ReactTestRenderer | null = null;
const onAbrir = jest.fn();
const onSubir = jest.fn();

function montar(pasos: PasosDeLaLista | null, it_: ItemDelDia = item(), modo: ModoDeLaFila = 'hoy') {
  const fila = React.createElement(FilaDelDia, { item: it_, modo, marca: null, ahoraMs: Date.parse('2026-11-05T22:00:00Z'), onAbrir, onSubir });
  act(() => {
    raiz = TestRenderer.create(React.createElement(ProveedorDePasosDeLaLista, { value: pasos }, fila));
  });
}
const textosDeNodos = (nodos: ReactTestInstance[]): string[] =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''));
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const porEtiqueta = (etiqueta: string) =>
  raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta)[0];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockEnCurso = false;
  onAbrir.mockReset();
  onSubir.mockReset();
  mockPedirLaCarrera.mockReset();
});

describe('dónde va la carrera en la fila (pura)', () => {
  it('por cumplir y sin el avance de los pasos: en la fila, en lugar de «Subir»', () => {
    expect(lugarDeLaCarrera({ ofrecida: true, modo: 'hoy', hecho: false, conAvanceDePasos: false })).toBe('fila');
    expect(lugarDeLaCarrera({ ofrecida: true, modo: 'atrasado', hecho: false, conAvanceDePasos: false })).toBe('fila');
  });
  it('ya cumplido o con el avance de los pasos a la derecha: debajo del nombre', () => {
    expect(lugarDeLaCarrera({ ofrecida: true, modo: 'hecho', hecho: true, conAvanceDePasos: false })).toBe('debajo');
    expect(lugarDeLaCarrera({ ofrecida: true, modo: 'hoy', hecho: false, conAvanceDePasos: true })).toBe('debajo');
  });
  it('sin carrera ofrecida, o con el día cerrado: nada', () => {
    expect(lugarDeLaCarrera({ ofrecida: false, modo: 'hoy', hecho: false, conAvanceDePasos: false })).toBeNull();
    expect(lugarDeLaCarrera({ ofrecida: true, modo: 'cerrado', hecho: false, conAvanceDePasos: false })).toBeNull();
  });
});

describe('la fila de «Kilómetros diarios» según el teléfono', () => {
  it('sin la carrera (web, iPhone, backend anterior o interruptor apagado) es la fila de siempre, con «Subir»', () => {
    montar(pasosDe(captura, false));
    expect(textos()).toContain('Subir');
    expect(textos()).not.toContain('Correr');
    expect(textos()).not.toContain('Correr con GPS');
  });

  it('sin proveedor de pasos (un backend anterior) también, con «Subir»', () => {
    montar(null);
    expect(textos()).toContain('Subir');
    expect(textos()).not.toContain('Correr');
  });

  it('con la carrera disponible: «Correr» a la derecha y NO «Subir»; tocarlo abre la cuenta 3, 2, 1', () => {
    montar(pasosDe(captura, true));
    expect(textos()).toContain('Correr');
    expect(textos()).not.toContain('Subir');
    expect(textos()).not.toContain('Correr con GPS');
    const boton = porEtiqueta('Correr con GPS: Kilómetros diarios');
    expect(boton).toBeDefined();
    const estilo = Object.assign({}, ...[boton.props.style].flat(3).filter(Boolean));
    expect((estilo.minHeight as number) + 2 * (boton.props.hitSlop as number)).toBeGreaterThanOrEqual(48);
    act(() => boton.props.onPress());
    expect(mockPedirLaCarrera).toHaveBeenCalledWith({ tipo: 'empezar', registroId: 'r-km' });
    expect(onSubir).not.toHaveBeenCalled();
  });

  it('con Health Connect: «Cuenta tus pasos solo ›» sigue debajo y «Correr» a la derecha, sin «Subir»', () => {
    montar(pasosDe({ modo: 'ofrecer', soporte: 'disponible' } as VistaDeKilometros, true));
    expect(textos()).toContain('Cuenta tus pasos solo');
    expect(textos()).toContain('Correr');
    expect(textos()).not.toContain('Subir');
  });

  it('con una carrera en curso dice «Volver» y la vuelve a abrir', () => {
    mockEnCurso = true;
    montar(pasosDe(captura, true));
    expect(textos()).toContain('Volver');
    act(() => porEtiqueta('Carrera en curso · Volver').props.onPress());
    expect(mockPedirLaCarrera).toHaveBeenCalledWith({ tipo: 'volver' });
  });

  it('ya cumplido: el ✓ y la hora a la derecha, y «Correr con GPS» debajo para sumar más km', () => {
    const h = habit({ done: true });
    montar(pasosDe(captura, true), item(h), 'hecho');
    expect(textos()).toContain('Correr con GPS');
    expect(textos()).not.toContain('Subir');
  });

  it('con el avance de los pasos: el círculo a la derecha y «Correr con GPS» debajo', () => {
    montar(
      pasosDe(
        { modo: 'avance', km: 3.2, pasos: 7120, meta: 5, metaLista: false, aproximado: false, fuente: TELEFONO, fuentes: [TELEFONO], noSumadas: [], leidoEn: new Date(2026, 10, 5, 17, 8), conectadoHoyA: null } as VistaDeKilometros,
        true,
      ),
    );
    expect(textos()).toContain('Correr con GPS');
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Todavía no llegas a tu meta').length).toBeGreaterThan(0);
  });
});

describe('la hoja de «Kilómetros diarios» con la carrera', () => {
  const onAccion = jest.fn();
  function montarHoja(carrera: { enCurso: boolean } | null) {
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(HojaDelHabito, { visible: true, item: item(), modo: 'hoy', ahoraMs: Date.parse('2026-11-05T22:00:00Z'), onCerrar: jest.fn(), onAccion, carrera }),
      );
    });
  }
  it('el botón principal es «Correr con GPS» y la captura queda como secundaria («Subir captura»)', () => {
    montarHoja({ enCurso: false });
    expect(textos()).toContain('Correr con GPS');
    expect(textos()).toContain('Subir captura');
    act(() => porEtiqueta('Subir captura').props.onPress());
    expect(onAccion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipo: 'registrar' }));
  });
  it('sin la carrera, la hoja es la de siempre (sin «Correr con GPS»)', () => {
    montarHoja(null);
    expect(textos()).not.toContain('Correr con GPS');
    expect(textos()).not.toContain('Subir captura');
  });
});
