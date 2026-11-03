import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La hoja «Tu 80/20» de Plan con las vistas Semana y Mes (spec 031): el control «Hoy · Semana · Mes» solo aparece si el servidor ofrece
 * las vistas nuevas; el aviso «tu análisis está listo» la abre directo en la vista que corresponde; «Agendar mis acciones» cierra la hoja y
 * abre el planificador. La regla de Pareto de «Hoy» no cambia.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: () => undefined }));
type PropsDeHoja = { visible?: boolean; titulo?: string; children?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.children) : null) };
});

const mockLeer = jest.fn<(tipo: string, inicio: string | null) => Promise<unknown>>();
jest.mock('../../../ochenta-veinte/api/ochentaVeinteApi', () => ({
  obtenerOchentaVeinteDeLaPersona: (tipo: string, inicio: string | null) => mockLeer(tipo, inicio),
}));

import { ApiError } from '../../../../services/http/apiClient';
import type { VistaDelPeriodo } from '../../../ochenta-veinte/types/ochentaVeinte.types';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import { HojaOchentaVeinte } from '../TarjetasDelPlan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.setTimeout(60_000);

const CIFRAS = {
  desde: '2026-10-26', hasta: '2026-11-01', planificadas: 12, cumplidas: 9, diasConAcciones: 5, porVenir: 0, impactoPlanificado: 60,
  impactoCumplido: 45, porcentajeCumplidas: 75, verdes: null, veintePorCiento: null, porEje: [], lasQueMasMovieron: [], lasQueSeFueron: [],
  cumplioLoQueMenosMovia: false, cierre: null,
};
const vista = (extra: Partial<VistaDelPeriodo> = {}): VistaDelPeriodo => ({
  tipo: 'SEMANA', numero: 10, inicio: '2026-10-26', fin: '2026-11-01', cerrado: false, anterior: null, siguiente: null, cifras: CIFRAS,
  semanas: [], estado: 'EN_CURSO', falta: [], minimoDeAcciones: 5, codigoRenaser: null, analisis: null, generadoEn: null, ...extra,
});
const accion = (): RocaDiariaApi => ({
  id: 'a1', fecha: '2026-10-27', posicion: 1, titulo: 'Entrenar', descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
  eje: 'CUERPO', rocaSemanalId: 's1', horaInicio: '09:00:00', horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
  bloqueada: false, acciones: [],
});

beforeEach(() => {
  mockLeer.mockReset();
  mockLeer.mockImplementation(async tipo => vista({ tipo: tipo as 'SEMANA' | 'MES', numero: tipo === 'MES' ? 3 : 10 }));
});

const vaciar = () => new Promise<void>(res => setImmediate(res));
async function abrir(props: { vistaInicial?: 'SEMANA' | 'MES'; alAgendar?: () => void; alCerrar?: () => void } = {}): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(HojaOchentaVeinte, { visible: true, alCerrar: props.alCerrar ?? jest.fn(), eje: 'CUERPO', deHoy: [accion()], ...props }),
    );
    await vaciar();
  });
  return r;
}
function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}
function boton(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const nodo = r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
  if (!nodo) throw new Error(`No hay un botón «${etiqueta}»`);
  return nodo;
}
async function tocar(r: ReactTestRenderer, etiqueta: string) {
  await act(async () => {
    boton(r, etiqueta).props.onPress();
    await vaciar();
  });
}

describe('con las vistas nuevas del servidor', () => {
  it('abre en «Hoy», con la regla de Pareto de siempre, y ofrece Hoy · Semana · Mes', async () => {
    const r = await abrir();
    const t = textos(r);
    expect(t).toContain('Prioriza lo que más acerca tu meta.');
    expect(t).toContain('Tus acciones de hoy · Cuerpo');
    expect(t).toContain('Hoy');
    expect(t).toContain('Semana');
    expect(t).toContain('Mes');
  });

  it('«Semana» y «Mes» muestran todos los ejes y cada periodo se lee una sola vez', async () => {
    const r = await abrir();
    await tocar(r, 'Semana');
    expect(textos(r)).toContain('Semana 10');
    expect(textos(r)).toContain('9 de 12 acciones cumplidas · 75 %');
    await tocar(r, 'Mes');
    expect(textos(r)).toContain('Mes 3');
    await tocar(r, 'Semana');
    expect(mockLeer.mock.calls.filter(c => c[0] === 'SEMANA')).toHaveLength(1);
    expect(mockLeer.mock.calls.filter(c => c[0] === 'MES')).toHaveLength(1);
  });

  it('el aviso «tu análisis está listo» la abre directo en el mes (sin parpadear en «Hoy»)', async () => {
    const r = await abrir({ vistaInicial: 'MES' });
    const t = textos(r);
    expect(t).toContain('Mes 3');
    expect(t).not.toContain('Prioriza lo que más acerca tu meta.');
  });

  it('sin acciones, «Agendar mis acciones» cierra la hoja y abre el planificador', async () => {
    mockLeer.mockImplementation(async () =>
      vista({ cifras: { ...CIFRAS, planificadas: 0, cumplidas: 0, porcentajeCumplidas: null } }),
    );
    const alCerrar = jest.fn();
    const alAgendar = jest.fn();
    const r = await abrir({ alCerrar, alAgendar });
    await tocar(r, 'Semana');
    await tocar(r, 'Agendar mis acciones');
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(alAgendar).toHaveBeenCalledTimes(1);
  });
});

describe('contra un servidor sin las vistas nuevas', () => {
  it('un 404 deja la hoja como siempre: sin control, solo la regla de Pareto', async () => {
    mockLeer.mockRejectedValue(new ApiError(404, 'no'));
    const r = await abrir();
    const t = textos(r);
    expect(t).toContain('Prioriza lo que más acerca tu meta.');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Semana' && typeof n.props.onPress === 'function')).toHaveLength(0);
  });

  it('abierta desde el aviso también cae en «Hoy»', async () => {
    mockLeer.mockRejectedValue(new ApiError(404, 'no'));
    const r = await abrir({ vistaInicial: 'SEMANA' });
    expect(textos(r)).toContain('Prioriza lo que más acerca tu meta.');
  });
});

describe('cerrada no pide nada', () => {
  it('con `visible` en falso no hay ninguna lectura', async () => {
    await act(async () => {
      TestRenderer.create(React.createElement(HojaOchentaVeinte, { visible: false, alCerrar: jest.fn(), eje: 'CUERPO', deHoy: [] }));
      await vaciar();
    });
    expect(mockLeer).not.toHaveBeenCalled();
  });
});
