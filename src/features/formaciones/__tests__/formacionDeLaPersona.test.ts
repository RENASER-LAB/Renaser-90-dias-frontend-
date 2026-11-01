import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text, TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View, Text: Texto } = require('react-native');
  const React = require('react');
  return {
    HojaDesdeAbajo: ({ visible, titulo, children, pie }: { visible: boolean; titulo: string; children: unknown; pie?: unknown }) =>
      visible ? React.createElement(View, null, React.createElement(Texto, null, titulo), children, pie) : null,
  };
});
const mockConfirmar = jest.fn<(titulo: string, mensaje?: string) => Promise<boolean>>();
jest.mock('../../admin/utils/dialogo', () => ({ confirmar: (t: string, m?: string) => mockConfirmar(t, m), avisar: jest.fn() }));
jest.mock('../api/formacionesApi', () => ({
  leerFormacionDeUnaPersonaApi: jest.fn(),
  listarFormaciones: jest.fn(),
  trasladarAprendiz: jest.fn(),
  asignarFormaciones: jest.fn(),
}));

import { ApiError } from '../../../services/http/apiClient';
import { asignarFormaciones, leerFormacionDeUnaPersonaApi, listarFormaciones, trasladarAprendiz } from '../api/formacionesApi';
import { FormacionDeLaPersona } from '../components/FormacionDeLaPersona';
import { FormacionesDelPersonal } from '../components/FormacionesDelPersonal';
import type { FormacionDeUnaPersona, TarjetaDeFormacion } from '../types/formaciones.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leer = leerFormacionDeUnaPersonaApi as jest.MockedFunction<typeof leerFormacionDeUnaPersonaApi>;
const listar = listarFormaciones as jest.MockedFunction<typeof listarFormaciones>;
const trasladar = trasladarAprendiz as jest.MockedFunction<typeof trasladarAprendiz>;
const asignar = asignarFormaciones as jest.MockedFunction<typeof asignarFormaciones>;

const resumen = (codigo: string, nombre: string, duracionesDias: number[], activa = true) => ({
  codigo,
  nombre,
  descripcion: '',
  activa,
  duracionesDias,
  etiquetasDeDuracion: duracionesDias.map(d => (d === 365 ? '1 año' : '3 meses')),
  version: 1,
});
const tarjetas: TarjetaDeFormacion[] = [
  { resumen: resumen('ESCUELA', 'Escuela Renaser', [90]), aprendicesActivos: 0, personal: 0, grupos: 0, porAtender: 0 },
  { resumen: resumen('DIPLOMADO', 'Diplomado Renaser', [90, 365]), aprendicesActivos: 0, personal: 0, grupos: 0, porAtender: 0 },
  { resumen: resumen('CERTIFICACION', 'Certificación Renaser', [90], false), aprendicesActivos: 0, personal: 0, grupos: 0, porAtender: 0 },
];
const deAna: FormacionDeUnaPersona = {
  formacion: 'ESCUELA',
  duracionDias: 90,
  programaActivado: true,
  formacionesDelPersonal: [],
  historial: [],
};

let raiz: ReactTestRenderer | null = null;
const montar = async (elemento: React.ReactElement) => {
  await act(async () => {
    raiz = TestRenderer.create(elemento);
  });
};
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => String(n.props.children));
const hay = (texto: string) => textos().some(t => t.includes(texto));
const boton = (etiqueta: string): ReactTestInstance =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  leer.mockReset();
  listar.mockReset();
  trasladar.mockReset();
  asignar.mockReset();
  mockConfirmar.mockReset();
  listar.mockResolvedValue(tarjetas);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la formación en la ficha', () => {
  it('dice en cuál está y por cuánto, y ofrece pasarla solo si es un aprendiz', async () => {
    leer.mockResolvedValue(deAna);
    await montar(React.createElement(FormacionDeLaPersona, { personaId: 'p1', nombre: 'Ana', esAprendiz: true }));
    expect(textos()).toEqual(expect.arrayContaining(['Formación', 'Escuela Renaser · 3 meses']));
    expect(boton('Pasar a otra formación')).toBeDefined();
    act(() => raiz?.unmount());

    await montar(React.createElement(FormacionDeLaPersona, { personaId: 'p1', nombre: 'Ana', esAprendiz: false }));
    expect(boton('Pasar a otra formación')).toBeUndefined();
  });

  it('lista lo que cursó antes, con cómo terminó y el motivo', async () => {
    leer.mockResolvedValue({
      ...deAna,
      formacion: 'DIPLOMADO',
      duracionDias: 365,
      historial: [
        { formacion: 'ESCUELA', duracionDias: 90, fechaInicio: '2026-07-01', fechaFin: '2026-10-30', diaFinal: 40, resultado: 'DADA_POR_TERMINADA', motivo: 'Cambió de programa', puntosLiga: null, trasladadoA: 'DIPLOMADO' },
      ],
    });
    await montar(React.createElement(FormacionDeLaPersona, { personaId: 'p1', nombre: 'Ana', esAprendiz: true }));
    expect(textos()).toEqual(expect.arrayContaining(['Diplomado Renaser · 1 año', 'Antes cursó', 'Escuela Renaser · 3 meses']));
    expect(hay('La dieron por terminada el 30 de octubre · llegó al día 40. Motivo: Cambió de programa')).toBe(true);
  });

  it('si el servidor no la ofrece (backend anterior) no se dibuja nada', async () => {
    leer.mockRejectedValue(new ApiError(404, 'no existe'));
    await montar(React.createElement(FormacionDeLaPersona, { personaId: 'p1', nombre: 'Ana', esAprendiz: true }));
    expect(raiz!.root.findAll(n => n.type === Text)).toHaveLength(0);
  });
});

describe('pasar a un aprendiz a otra formación', () => {
  const abrir = async (alTrasladar = jest.fn()) => {
    leer.mockResolvedValue(deAna);
    await montar(React.createElement(FormacionDeLaPersona, { personaId: 'p1', nombre: 'Ana', esAprendiz: true, alTrasladar }));
    await act(async () => boton('Pasar a otra formación').props.onPress());
    return alTrasladar;
  };

  it('ofrece las disponibles menos la actual, con las duraciones de la elegida', async () => {
    await abrir();
    expect(boton('Escuela Renaser')).toBeUndefined();
    expect(boton('Diplomado Renaser')).toBeDefined();
    expect(boton('Certificación Renaser')).toBeUndefined();
    act(() => boton('Diplomado Renaser').props.onPress());
    expect(boton('3 meses (90 días)')).toBeDefined();
    expect(boton('1 año (365 días)')).toBeDefined();
  });

  it('confirma antes de pasarla y manda formación, duración y sin motivo si ya terminó', async () => {
    const alTrasladar = await abrir();
    mockConfirmar.mockResolvedValueOnce(true);
    trasladar.mockResolvedValueOnce(undefined);
    act(() => boton('Diplomado Renaser').props.onPress());
    act(() => boton('1 año (365 días)').props.onPress());
    await act(async () => boton('Pasar de formación').props.onPress());
    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    expect(mockConfirmar.mock.calls[0][1]).toContain('empieza de cero');
    expect(trasladar).toHaveBeenCalledWith('p1', { formacion: 'DIPLOMADO', duracionDias: 365, darPorTerminada: false, motivo: null });
    expect(alTrasladar).toHaveBeenCalledWith('Diplomado Renaser');
  });

  it('si no confirma, no manda nada', async () => {
    await abrir();
    mockConfirmar.mockResolvedValueOnce(false);
    act(() => boton('Diplomado Renaser').props.onPress());
    await act(async () => boton('Pasar de formación').props.onPress());
    expect(trasladar).not.toHaveBeenCalled();
  });

  it('si todavía no terminó (409) lo dice y abre el motivo para darla por terminada', async () => {
    await abrir();
    mockConfirmar.mockResolvedValue(true);
    trasladar.mockRejectedValueOnce(new ApiError(409, 'Esta persona todavía no terminó su formación. Para pasarla de formación, dala por terminada con un motivo escrito.'));
    act(() => boton('Diplomado Renaser').props.onPress());
    await act(async () => boton('Pasar de formación').props.onPress());
    expect(hay('todavía no terminó su formación')).toBe(true);
    const motivo = raiz!.root.findAll(n => n.type === TextInput && n.props.accessibilityLabel === 'Motivo para darla por terminada')[0];
    expect(motivo).toBeDefined();
    expect(hay('Escribe el motivo (al menos 3 letras).')).toBe(true);

    act(() => motivo.props.onChangeText('Cambió de programa'));
    trasladar.mockResolvedValueOnce(undefined);
    await act(async () => boton('Pasar de formación').props.onPress());
    expect(trasladar).toHaveBeenLastCalledWith('p1', { formacion: 'DIPLOMADO', duracionDias: 90, darPorTerminada: true, motivo: 'Cambió de programa' });
  });
});

describe('las formaciones en las que trabaja el personal', () => {
  const personal = (activa = 'ESCUELA'): FormacionDeUnaPersona => ({
    formacion: null,
    duracionDias: 90,
    programaActivado: false,
    formacionesDelPersonal: [{ formacion: activa, activa: true }],
    historial: [],
  });

  it('parte de lo asignado y guarda lo marcado con la activa', async () => {
    leer.mockResolvedValue(personal());
    await montar(React.createElement(FormacionesDelPersonal, { personaId: 'm1', nombre: 'Marta' }));
    expect(boton('Escuela Renaser').props.accessibilityState.checked).toBe(true);
    expect(boton('Diplomado Renaser').props.accessibilityState.checked).toBe(false);
    expect(boton('Guardar formaciones').props.disabled ?? boton('Guardar formaciones').props.accessibilityState?.disabled).toBeTruthy();

    act(() => boton('Diplomado Renaser').props.onPress());
    act(() => boton('Dejar Diplomado Renaser como activa').props.onPress());
    asignar.mockResolvedValueOnce(undefined);
    await act(async () => boton('Guardar formaciones').props.onPress());
    expect(asignar).toHaveBeenCalledWith('m1', ['ESCUELA', 'DIPLOMADO'], 'DIPLOMADO');
    expect(hay('rige en el próximo movimiento')).toBe(true);
  });

  it('si lidera un grupo en la que se le quita, dice la razón del servidor', async () => {
    leer.mockResolvedValue({ ...personal(), formacionesDelPersonal: [{ formacion: 'ESCUELA', activa: true }, { formacion: 'DIPLOMADO', activa: false }] });
    await montar(React.createElement(FormacionesDelPersonal, { personaId: 'm1', nombre: 'Marta' }));
    act(() => boton('Diplomado Renaser').props.onPress());
    asignar.mockRejectedValueOnce(new ApiError(409, 'No se puede quitar la formación «Diplomado Renaser»: esta persona lidera el grupo «Fénix».'));
    await act(async () => boton('Guardar formaciones').props.onPress());
    expect(hay('lidera el grupo «Fénix»')).toBe(true);
  });

  it('no deja guardar sin ninguna marcada', async () => {
    leer.mockResolvedValue(personal());
    await montar(React.createElement(FormacionesDelPersonal, { personaId: 'm1', nombre: 'Marta' }));
    act(() => boton('Escuela Renaser').props.onPress());
    expect(hay('Marca al menos una formación.')).toBe(true);
  });
});
