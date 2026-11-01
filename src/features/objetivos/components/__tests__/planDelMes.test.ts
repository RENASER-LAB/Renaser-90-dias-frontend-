/**
 * «Planificar mi mes» (spec 028, decisión del dueño 028-2: el mes es el plan de OBJETIVOS de Plan). Se prueba lo que la persona ve y lo
 * que se escribe: el mes de hoy al abrir, otro mes al elegirlo (con sus lecturas), el objetivo del mes en palabras, el guardado de
 * CUALQUIERA de los tres meses, que salir sin guardar no escribe, y que tocar la semana de ahora abre «Organizar mi semana» recién cuando
 * la hoja se fue (nunca una semana que no llegó).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { MesDelPlan, PlanMensualDelEje } from '../../api/planMensualApi';
import type { RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});

type PropsDeHoja = {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  tamano?: string;
  alCerrar: () => void;
  alTerminarDeCerrar?: () => void;
  bajoElTitulo?: React.ReactNode;
  children?: React.ReactNode;
};
let mockHoja: PropsDeHoja | null = null;
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (p: PropsDeHoja) => {
      mockHoja = p;
      return p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.bajoElTitulo, p.children) : null;
    },
  };
});

type PropsDeControl = { opciones: { valor: string; etiqueta: string }[]; valor: string; onCambiar: (v: string) => void };
let mockControl: PropsDeControl | null = null;
jest.mock('../../../../components/ControlSegmentado', () => ({
  ControlSegmentado: (p: PropsDeControl) => {
    mockControl = p;
    return null;
  },
}));

type PropsDelEditor = { visible: boolean; mes: MesDelPlan | null; unidad: string; onCerrar: () => void; onGuardar: (c: number | null) => void };
let mockEditor: PropsDelEditor | null = null;
jest.mock('../EditarObjetivoDelMesModal', () => ({
  EditarObjetivoDelMesModal: (p: PropsDelEditor) => {
    mockEditor = p;
    return null;
  },
}));

jest.mock('../../../../components/ConfirmacionEnLinea', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { ConfirmacionEnLinea: (p: { texto: string }) => R.createElement(Text, { accessibilityLabel: 'confirmacion' }, p.texto) };
});

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (t: string, m?: string) => mockAlerta(t, m) } }));
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), seleccion: jest.fn(), error: jest.fn() } }));

const mockLeer = jest.fn<(semana?: number) => Promise<RocaSemanalApi[]>>();
jest.mock('../../api/objetivosApi', () => ({ obtenerRocasSemanales: (semana?: number) => mockLeer(semana) }));

import { PlanDelMesModal } from '../PlanDelMesModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Lunes 7/09/2026: empezó un lunes. El día 38 es el miércoles 14/10 → semana 6, mes 2 (semanas 5 a 8). */
const HOY = new Date(2026, 9, 14, 12, 0);
const DIA = 38;
const DOMINGO = new Date(2026, 9, 18, 12, 0);
const DIA_DOMINGO = 42;

const MAESTRAS = [
  { id: 'm-cuerpo', eje: 'CUERPO' },
  { id: 'm-trabajo', eje: 'TRABAJO' },
] as unknown as RocaMaestraApi[];
const semanal = (numeroSemana: number, titulo: string, autoevaluacionFin: number | null = null) =>
  ({ id: `s${numeroSemana}`, rocaMaestraId: 'm-cuerpo', numeroSemana, titulo, autoevaluacionFin }) as unknown as RocaSemanalApi;

const mesDelPlan = (numeroMes: number, parcial: Partial<MesDelPlan> = {}): MesDelPlan => ({
  numeroMes,
  diaDeCierre: numeroMes * 30,
  enCurso: numeroMes === 2,
  estado: 'CON_CIFRA',
  cifra: 90 - numeroMes * 3,
  paso: null,
  falta: null,
  sube: false,
  motivo: null,
  editado: false,
  titulo: null,
  ...parcial,
});
const planDeCuerpo = (unidad = 'kg', meses = [mesDelPlan(1), mesDelPlan(2), mesDelPlan(3)]): PlanMensualDelEje => ({
  eje: 'CUERPO',
  mesActual: 2,
  unidad,
  unidadAdelante: false,
  meses,
  semana: null,
});

const mockGuardarMes = jest.fn<(eje: string, mes: number, c: { titulo: string; cifra: number | null; unidad: string }) => Promise<{ ok: true } | { ok: false; mensaje: string }>>();
const planMensual = (plan: PlanMensualDelEje | null = planDeCuerpo()) => ({
  porEje: new Map(plan ? [['CUERPO' as const, plan]] : []),
  guardando: false,
  guardarMes: mockGuardarMes as never,
});

let raiz: ReactTestRenderer | null = null;
const onOrganizarSemana = jest.fn();
const alCerrar = jest.fn();

async function dibujar(parcial: Partial<React.ComponentProps<typeof PlanDelMesModal>> = {}) {
  const props: React.ComponentProps<typeof PlanDelMesModal> = {
    visible: true,
    alCerrar,
    eje: 'CUERPO',
    diaPrograma: DIA,
    maestras: MAESTRAS,
    planMensual: planMensual(),
    onOrganizarSemana,
    hoy: HOY,
    ...parcial,
  };
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(PlanDelMesModal, props));
  });
  return props;
}

const todoElTexto = () =>
  raiz!.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => {
      const hijos = React.Children.toArray(n.props.children as React.ReactNode);
      return hijos.map(h => (typeof h === 'string' || typeof h === 'number' ? String(h) : '')).join('');
    })
    .join(' | ');
const botones = () => raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
const etiqueta = (b: ReactTestInstance) => String(b.props.accessibilityLabel ?? '');
const botonDeLaSemana = (numero: number) => botones().find(b => etiqueta(b).startsWith(`Semana ${numero}`));
const botonCambiar = () => botones().find(b => /el objetivo de este mes$/.test(etiqueta(b)));

beforeEach(() => {
  mockHoja = null;
  mockControl = null;
  mockEditor = null;
  mockLeer.mockImplementation(async semana => (semana === 5 ? [semanal(5, 'Llegar a 85 kg', 8)] : semana === 6 ? [semanal(6, 'Llegar a 84 kg')] : []));
  mockGuardarMes.mockResolvedValue({ ok: true });
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset();
  mockGuardarMes.mockReset();
});

describe('PlanDelMesModal: lo que se ve', () => {
  it('abre en el mes de hoy, con los tres meses para elegir', async () => {
    await dibujar();
    expect(mockHoja).toMatchObject({ visible: true, titulo: 'Planificar mi mes', subtitulo: 'Cuerpo', tamano: 'grande' });
    expect(mockControl!.opciones.map(o => o.etiqueta)).toEqual(['Mes 1', 'Mes 2', 'Mes 3']);
    expect(mockControl!.valor).toBe('2');
    const texto = todoElTexto();
    expect(texto).toContain('Mes 2 · Semanas 5 a 8');
    expect(texto).toContain('5 oct a 1 nov');
    expect(texto).toContain('El mes en curso');
  });

  it('dice el objetivo del mes del eje abierto: la cifra, el día de cierre y que la propone el sistema', async () => {
    await dibujar();
    const texto = todoElTexto();
    expect(texto).toContain('Objetivo del mes');
    expect(texto).toContain('84 kg');
    expect(texto).toContain('Al Día 60 · Propuesta');
  });

  it('una cifra que escribió la persona se lee como suya', async () => {
    await dibujar({ planMensual: planMensual(planDeCuerpo('kg', [mesDelPlan(1), mesDelPlan(2, { editado: true }), mesDelPlan(3)])) });
    expect(todoElTexto()).toContain('Al Día 60 · Tu cifra');
  });

  it('las semanas del mes: número, fechas, estado y el objetivo semanal del eje cuando ya existe', async () => {
    await dibujar();
    const texto = todoElTexto();
    expect(texto).toContain('Semana 5');
    expect(texto).toContain('5 a 11 oct');
    expect(texto).toContain('Revisada');
    expect(texto).toContain('Llegar a 85 kg');
    expect(texto).toContain('Esta semana');
    expect(texto).toContain('Llegar a 84 kg');
    expect(texto).toContain('Se arma el domingo');
    expect(texto).toContain('Todavía no llega');
    expect(texto).toContain('El objetivo de cada semana se arma el domingo.');
  });

  it('solo lee las semanas que pasaron y la de ahora: la 7 y la 8 no llegaron', async () => {
    await dibujar();
    expect(mockLeer.mock.calls.map(([n]) => n).sort()).toEqual([5, 6]);
  });

  it('el domingo también lee la que se arma hoy', async () => {
    await dibujar({ hoy: DOMINGO, diaPrograma: DIA_DOMINGO });
    expect(mockLeer.mock.calls.map(([n]) => n).sort()).toEqual([5, 6, 7]);
    expect(todoElTexto()).toContain('Se arma hoy');
  });

  it('elegir otro mes muestra el suyo y lee sus semanas (las del mes 1 ya pasaron)', async () => {
    await dibujar();
    await act(async () => mockControl!.onCambiar('1'));
    const texto = todoElTexto();
    expect(texto).toContain('Mes 1 · Semanas 1 a 4');
    expect(texto).toContain('7 sep a 4 oct');
    expect(texto).not.toContain('El mes en curso');
    expect(texto).toContain('87 kg');
    expect(texto).toContain('Al Día 30');
    expect(mockLeer.mock.calls.map(([n]) => n).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    // Un mes que todavía no llega: ninguna semana se lee y todas dicen que no llegan.
    mockLeer.mockClear();
    await act(async () => mockControl!.onCambiar('3'));
    expect(mockLeer).not.toHaveBeenCalled();
    expect(todoElTexto()).toContain('Mes 3 · Semanas 9 a 13');
    expect(todoElTexto()).toContain('81 kg');
  });

  it('sin cifra dice el motivo y no inventa un número', async () => {
    const sinCifra = mesDelPlan(2, { estado: 'SIN_CIFRA', cifra: null, motivo: 'SIN_TIPO' });
    await dibujar({ planMensual: planMensual(planDeCuerpo('kg', [mesDelPlan(1), sinCifra, mesDelPlan(3)])) });
    expect(todoElTexto()).toContain('Tu objetivo no se mide con un número.');
    expect(botonCambiar()).toBeDefined();
    expect(etiqueta(botonCambiar()!)).toBe('Escribir la cifra el objetivo de este mes');
  });

  it('sin unidad en el eje no se ofrece cambiar nada; sin el plan, tampoco', async () => {
    await dibujar({ planMensual: planMensual(planDeCuerpo('  ')) });
    expect(botonCambiar()).toBeUndefined();
    act(() => raiz?.unmount());
    await dibujar({ planMensual: planMensual(null) });
    expect(todoElTexto()).toContain('Todavía no tenemos el plan de este mes.');
    expect(botonCambiar()).toBeUndefined();
  });

  it('con la hoja cerrada no dibuja ni lee nada', async () => {
    await dibujar({ visible: false });
    expect(raiz!.root.findAll(n => (n.type as unknown) === 'Text')).toHaveLength(0);
    expect(mockLeer).not.toHaveBeenCalled();
  });
});

describe('PlanDelMesModal: lo que se escribe', () => {
  it('«Cambiar» abre el mismo formulario del objetivo del mes con el mes elegido', async () => {
    await dibujar();
    expect(mockEditor!.visible).toBe(false);
    await act(async () => mockControl!.onCambiar('3'));
    act(() => botonCambiar()!.props.onPress());
    expect(mockEditor).toMatchObject({ visible: true, unidad: 'kg' });
    expect(mockEditor!.mes?.numeroMes).toBe(3);
  });

  it('guardar escribe el objetivo del mes ELEGIDO (no el del mes en curso) y lo confirma en línea', async () => {
    const { planMensual: pm } = await dibujar();
    await act(async () => mockControl!.onCambiar('3'));
    act(() => botonCambiar()!.props.onPress());
    await act(async () => mockEditor!.onGuardar(79.5));
    expect(mockGuardarMes).toHaveBeenCalledTimes(1);
    expect(mockGuardarMes).toHaveBeenCalledWith('CUERPO', 3, { titulo: 'Objetivo del mes 3', cifra: 79.5, unidad: 'kg' });
    expect(pm.guardando).toBe(false);
    expect(mockEditor!.visible).toBe(false);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(todoElTexto()).toContain('Tu objetivo del mes 3 quedó guardado.');
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('dejar la cifra vacía también se guarda (quita la cifra)', async () => {
    await dibujar();
    act(() => botonCambiar()!.props.onPress());
    await act(async () => mockEditor!.onGuardar(null));
    expect(mockGuardarMes).toHaveBeenCalledWith('CUERPO', 2, { titulo: 'Objetivo del mes 2', cifra: null, unidad: 'kg' });
  });

  it('si el servidor lo rechaza, lo dice con su mensaje y no confirma', async () => {
    mockGuardarMes.mockResolvedValue({ ok: false, mensaje: 'No pudimos guardar el objetivo del mes.' });
    await dibujar();
    act(() => botonCambiar()!.props.onPress());
    await act(async () => mockEditor!.onGuardar(80));
    expect(mockAlerta).toHaveBeenCalledWith('El objetivo de este mes', 'No pudimos guardar el objetivo del mes.');
    expect(mockLogro).not.toHaveBeenCalled();
    expect(todoElTexto()).not.toContain('quedó guardado');
  });

  it('salir del formulario sin guardar no escribe nada', async () => {
    await dibujar();
    act(() => botonCambiar()!.props.onPress());
    expect(mockEditor!.visible).toBe(true);
    act(() => mockEditor!.onCerrar());
    expect(mockEditor!.visible).toBe(false);
    expect(mockGuardarMes).not.toHaveBeenCalled();
  });

  it('cerrar la hoja sin tocar nada no escribe', async () => {
    await dibujar();
    act(() => mockHoja!.alCerrar());
    expect(alCerrar).toHaveBeenCalled();
    expect(mockGuardarMes).not.toHaveBeenCalled();
  });
});

describe('PlanDelMesModal: organizar la semana de ahora', () => {
  it('solo la semana de ahora es un botón; las que pasaron y las que no llegaron solo se leen', async () => {
    await dibujar();
    expect(botonDeLaSemana(6)).toBeDefined();
    expect(botonDeLaSemana(5)).toBeUndefined();
    expect(botonDeLaSemana(7)).toBeUndefined();
    expect(botonDeLaSemana(8)).toBeUndefined();
    expect(etiqueta(botonDeLaSemana(6)!)).toContain('Toca para organizar tu semana.');
  });

  it('tocarla cierra la hoja y recién cuando se fue abre «Organizar mi semana», una sola vez', async () => {
    await dibujar();
    act(() => botonDeLaSemana(6)!.props.onPress());
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(onOrganizarSemana).not.toHaveBeenCalled();
    act(() => mockHoja!.alTerminarDeCerrar!());
    expect(onOrganizarSemana).toHaveBeenCalledTimes(1);
    act(() => mockHoja!.alTerminarDeCerrar!());
    expect(onOrganizarSemana).toHaveBeenCalledTimes(1);
  });

  it('cerrar la hoja sin tocar la semana no abre nada al irse', async () => {
    await dibujar();
    act(() => mockHoja!.alCerrar());
    act(() => mockHoja!.alTerminarDeCerrar!());
    expect(onOrganizarSemana).not.toHaveBeenCalled();
  });

  it('el domingo también se organiza la que empieza', async () => {
    await dibujar({ hoy: DOMINGO, diaPrograma: DIA_DOMINGO });
    expect(botonDeLaSemana(6)).toBeDefined();
    expect(botonDeLaSemana(7)).toBeDefined();
    expect(botonDeLaSemana(8)).toBeUndefined();
  });

  it('abrir de nuevo después de un toque que no llegó a cerrar no deja un pedido pendiente', async () => {
    await dibujar();
    act(() => botonDeLaSemana(6)!.props.onPress());
    await act(async () => {
      raiz!.update(React.createElement(PlanDelMesModal, { visible: false, alCerrar, eje: 'CUERPO', diaPrograma: DIA, maestras: MAESTRAS, planMensual: planMensual(), onOrganizarSemana, hoy: HOY }));
    });
    await act(async () => {
      raiz!.update(React.createElement(PlanDelMesModal, { visible: true, alCerrar, eje: 'CUERPO', diaPrograma: DIA, maestras: MAESTRAS, planMensual: planMensual(), onOrganizarSemana, hoy: HOY }));
    });
    act(() => mockHoja!.alTerminarDeCerrar!());
    expect(onOrganizarSemana).not.toHaveBeenCalled();
  });
});
