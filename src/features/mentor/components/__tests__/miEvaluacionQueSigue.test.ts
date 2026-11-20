import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import type { EvaluacionPropiaApi } from '../../api/mentorSchemas';
import { evaluacionPropiaSchema } from '../../api/mentorSchemas';
import { altoDelToque, montar, porTestID, tocable, tocar, todoElTexto, tocables } from '../../__tests__/ayudasDeLasPantallas';
import { diferenciaConElMesAnterior } from '../../utils/queSigueDeLaEvaluacion';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: ({ children }: { children: React.ReactNode }) => R.createElement(R.Fragment, null, children) };
});
jest.mock('../../hooks/useRankingDeGrupos', () => ({
  useRankingDeGrupos: () => ({ ranking: null, miFila: null, total: 0, disponible: false }),
}));

import { HojaDeMiEvaluacion, type AccionesDeLaHoja } from '../HojaDeMiEvaluacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * «Mi evaluación» con «Qué sigue» (spec 057 FR-013): la diferencia con el mes anterior, las acciones con su motivo y quién baja el
 * promedio. Todo viene del servidor; estas pruebas fallan si la hoja deja de decirlo o de dejar tocar lo que dice que se toca.
 */
const base: EvaluacionPropiaApi = {
  mes: '2026-11',
  zona: 'America/Lima',
  porcentaje: 72,
  entregadas: 30,
  esperadas: 40,
  alumnosEvaluados: 4,
  alumnosExcluidos: 0,
  tardiasFueraDeVentana: 2,
  verificadas: 0,
  estado: 'CALCULADA',
  versionFormula: 'v1',
  corteEn: '2026-11-20T12:00:00Z',
  tramos: [],
  porcentajeMesAnterior: 69,
  quienBaja: [
    { aprendizId: 'u-ana', grupoId: 'g-1', nombre: 'Ana', porcentaje: 40, entregadas: 4, esperadas: 10 },
    { aprendizId: 'u-beto', grupoId: 'g-1', nombre: 'Beto', porcentaje: 70, entregadas: 7, esperadas: 10 },
    { aprendizId: 'u-fuera', grupoId: 'g-2', nombre: 'Fuera', porcentaje: 75, entregadas: 3, esperadas: 4 },
  ],
  acciones: [
    { tipo: 'ESCRIBIR', accion: 'Escríbele a Ana', motivo: 'Entregó 4 de 10 este mes', aprendizId: 'u-ana', nombre: 'Ana' },
    { tipo: 'VENTANAS', accion: 'Recuérdales las horas de entrega', motivo: '2 evidencias llegaron fuera de hora' },
  ],
};

const escribirle = jest.fn<AccionesDeLaHoja['escribirle']>();
const abrirLaFicha = jest.fn<(id: string) => void>();
let escribiendoId: string | null = null;
const alCerrar = jest.fn<() => void>();

function hoja(evaluacion: EvaluacionPropiaApi | null = base) {
  const acciones: AccionesDeLaHoja = {
    escribirle,
    escribiendoId,
    abrirFicha: id => (id === 'u-fuera' ? null : () => abrirLaFicha(id)),
    avatarDe: () => null,
  };
  return React.createElement(HojaDeMiEvaluacion, { visible: true, alCerrar, evaluacion, cohorteId: 'c-1', grupoId: 'g-1', acciones });
}

beforeEach(() => {
  escribirle.mockReset();
  abrirLaFicha.mockReset();
  alCerrar.mockReset();
  escribiendoId = null;
});

describe('la diferencia con el mes anterior', () => {
  it('dice cuántos puntos más o menos que en el mes anterior, con el nombre del mes', async () => { // spec 057 FR-013
    const r = await montar(hoja());
    expect(todoElTexto(r)).toContain('3 puntos más que en octubre');
    expect(diferenciaConElMesAnterior({ ...base, porcentajeMesAnterior: 73 })).toBe('1 punto menos que en octubre');
    expect(diferenciaConElMesAnterior({ ...base, porcentajeMesAnterior: 72 })).toBe('Igual que en octubre');
    expect(diferenciaConElMesAnterior({ ...base, mes: '2026-01', porcentajeMesAnterior: 60 })).toBe('12 puntos más que en diciembre');
  });

  it('sin mes anterior calculado (null o una respuesta vieja sin el campo) no se muestra ni deja hueco', async () => { // spec 057 FR-013
    for (const porcentajeMesAnterior of [null, undefined]) {
      const r = await montar(hoja({ ...base, porcentajeMesAnterior }));
      expect(porTestID(r, 'diferencia-con-el-mes-anterior')).toHaveLength(0);
      expect(todoElTexto(r)).not.toContain('que en octubre');
    }
  });
});

describe('«Qué sigue»', () => {
  it('muestra cada acción con su motivo en gris', async () => { // spec 057 FR-013
    const texto = todoElTexto(await montar(hoja()));
    expect(texto).toContain('Qué sigue');
    expect(texto).toContain('Escríbele a Ana');
    expect(texto).toContain('Entregó 4 de 10 este mes');
    expect(texto).toContain('Recuérdales las horas de entrega');
    expect(texto).toContain('2 evidencias llegaron fuera de hora');
  });

  it('tocar ESCRIBIR cierra la hoja y abre el 1 a 1 con ese aprendiz; las demás acciones no son botones', async () => { // spec 057 FR-013
    const r = await montar(hoja());
    await tocar(r, 'Escríbele a Ana');
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(escribirle).toHaveBeenCalledWith('u-ana', 'Ana');
    expect(tocables(r).some(n => String(n.props.accessibilityLabel).includes('Recuérdales'))).toBe(false);
  });

  it('un toque, un pedido: con un chat abriéndose, ESCRIBIR queda apagado y no pide otro', async () => { // spec 057 FR-041
    escribiendoId = 'u-beto';
    const r = await montar(hoja());
    await tocar(r, 'Escríbele a Ana');
    expect(escribirle).not.toHaveBeenCalled();
    expect(tocable(r, 'Escríbele a Ana').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sin acciones (SIN_MUESTRA, SIN_HISTORIAL o servidor viejo) no hay título vacío', async () => { // spec 057 FR-013
    for (const parcial of [{ acciones: [], quienBaja: [] }, { acciones: undefined, quienBaja: undefined }, { acciones: null, quienBaja: null }]) {
      const r = await montar(hoja({ ...base, estado: 'SIN_MUESTRA', porcentaje: null, porcentajeMesAnterior: null, ...parcial }));
      const texto = todoElTexto(r);
      expect(texto).not.toContain('Qué sigue');
      expect(texto).not.toContain('Quién baja el promedio');
      expect(texto).toContain('Este mes todavía no vencieron evidencias que medir');
    }
  });
});

describe('«Quién baja el promedio»', () => {
  it('lista a quienes bajan con su porcentaje y lo entregado, y el borde del avatar lleva su color', async () => { // spec 057 FR-013
    const r = await montar(hoja());
    const texto = todoElTexto(r);
    expect(texto).toContain('Quién baja el promedio');
    expect(texto).toContain('40 % · entregó 4 de 10');
    expect(texto).toContain('70 % · entregó 7 de 10');
    const bordes = porTestID(r, 'anillo-del-avatar').map(n => (n.props.style as { borderColor: string }).borderColor);
    expect(new Set(bordes).size).toBe(2); // rojo (Ana, bajo 60) y ámbar (Beto, 60 a 79)
  });

  it('tocar una persona de este grupo cierra la hoja y abre su ficha; una de otro grupo no abre nada', async () => { // spec 057 FR-013
    const r = await montar(hoja());
    await tocar(r, 'Abrir la ficha de Beto');
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(abrirLaFicha).toHaveBeenCalledWith('u-beto');
    /* La de otro grupo se lee (está en la lista) pero no es un botón: su ficha no se abre desde acá. */
    expect(todoElTexto(r)).toContain('Fuera');
    expect(tocables(r).some(n => String(n.props.accessibilityLabel).includes('Fuera'))).toBe(false);
  });

  it('cada toque mide al menos 48 de alto', async () => { // spec 057 FR-040
    const r = await montar(hoja());
    for (const etiqueta of ['Escríbele a Ana', 'Abrir la ficha de Ana']) expect(altoDelToque(tocable(r, etiqueta))).toBeGreaterThanOrEqual(48);
  });
});

describe('el esquema es null-safe', () => {
  const sinLoNuevo = { ...base } as Record<string, unknown>;
  delete sinLoNuevo.porcentajeMesAnterior;
  delete sinLoNuevo.quienBaja;
  delete sinLoNuevo.acciones;

  it('una respuesta vieja, sin los tres campos nuevos, valida y la hoja se ve como antes', async () => { // spec 057 FR-010
    const leida = evaluacionPropiaSchema.parse(sinLoNuevo) as EvaluacionPropiaApi;
    const texto = todoElTexto(await montar(hoja(leida)));
    expect(texto).toContain('72%');
    expect(texto).not.toContain('Qué sigue');
  });
});
