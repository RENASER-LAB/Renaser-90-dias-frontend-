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
jest.mock('../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View, Text: Texto } = require('react-native');
  const React = require('react');
  return {
    HojaDesdeAbajo: ({ visible, titulo, children, pie }: { visible: boolean; titulo: string; children: unknown; pie?: unknown }) =>
      visible ? React.createElement(View, null, React.createElement(Texto, null, titulo), children, pie) : null,
  };
});
jest.mock('../api/formacionesApi', () => ({ guardarFormacion: jest.fn() }));
const mockCentro: { tarjetas: unknown; cargando: boolean; fallo: unknown; recargar: jest.Mock; detalle: unknown } = {
  tarjetas: null,
  cargando: false,
  fallo: null,
  recargar: jest.fn(),
  detalle: null,
};
jest.mock('../hooks/useFormacionesAdmin', () => ({
  useFormacionesAdmin: () => ({ tarjetas: mockCentro.tarjetas, cargando: mockCentro.cargando, fallo: mockCentro.fallo, recargar: mockCentro.recargar }),
  useDetalleDeFormacion: () => ({ detalle: mockCentro.detalle, cargando: mockCentro.cargando, fallo: mockCentro.fallo, recargar: mockCentro.recargar }),
}));

import { ApiError } from '../../../services/http/apiClient';
import { guardarFormacion } from '../api/formacionesApi';
import { EditarFormacionSheet } from '../components/EditarFormacionSheet';
import { FiltroDeFormacion } from '../components/FiltroDeFormacion';
import { FormacionDetalleAdminScreen } from '../screens/FormacionDetalleAdminScreen';
import { FormacionesAdminScreen } from '../screens/FormacionesAdminScreen';
import type { DetalleDeFormacion, ResumenDeFormacion, TarjetaDeFormacion } from '../types/formaciones.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const guardar = guardarFormacion as jest.MockedFunction<typeof guardarFormacion>;

function resumen(parcial: Partial<ResumenDeFormacion> = {}): ResumenDeFormacion {
  return {
    codigo: 'DIPLOMADO',
    nombre: 'Diplomado Renaser',
    descripcion: 'Formación de 3 meses o de 1 año.',
    activa: true,
    duracionesDias: [90, 365],
    etiquetasDeDuracion: ['3 meses', '1 año'],
    version: 3,
    ...parcial,
  };
}
const tarjeta = (parcial: Partial<TarjetaDeFormacion> = {}): TarjetaDeFormacion => ({
  resumen: resumen(),
  aprendicesActivos: 12,
  personal: 3,
  grupos: 2,
  porAtender: 0,
  ...parcial,
});
const detalle = (parcial: Partial<DetalleDeFormacion> = {}): DetalleDeFormacion => ({
  resumen: resumen(),
  personas: { aprendices: 12, porEmpezar: 2, enCurso: 8, terminaron: 2, personal: 3 },
  grupos: { total: 2, conMentor: 1, sinMentor: 1, recepcion: 1 },
  porAtender: { gruposSinMentor: 1, aprendicesSinGrupo: 4, personalSinFormacion: 0 },
  ...parcial,
});

let raiz: ReactTestRenderer | null = null;
const montar = (elemento: React.ReactElement) => {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
};
const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => String(n.props.children));
const hay = (texto: string) => textos().some(t => t.includes(texto));
const boton = (etiqueta: string): ReactTestInstance =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const conEtiqueta = (etiqueta: string): ReactTestInstance | undefined =>
  raiz!.root.findAll(n => n.props.accessibilityLabel === etiqueta)[0];
const porRotuloCorto = (inicio: string): ReactTestInstance =>
  raiz!.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(inicio) && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  mockCentro.tarjetas = null;
  mockCentro.detalle = null;
  mockCentro.cargando = false;
  mockCentro.fallo = null;
  mockCentro.recargar = jest.fn();
  guardar.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Formaciones: la lista de las tres', () => {
  it('cada tarjeta dice nombre, duraciones, cifras y lo que hay por atender', () => {
    mockCentro.tarjetas = [
      tarjeta({ resumen: resumen({ codigo: 'ESCUELA', nombre: 'Escuela Renaser', duracionesDias: [90], etiquetasDeDuracion: ['3 meses'] }), aprendicesActivos: 1, grupos: 1, porAtender: 5 }),
      tarjeta({ resumen: resumen({ activa: false }) }),
    ];
    const onAbrir = jest.fn();
    montar(React.createElement(FormacionesAdminScreen, { onVolver: jest.fn(), onAbrir }));
    expect(textos()).toEqual(
      expect.arrayContaining(['Escuela Renaser', '3 meses', '1 aprendiz · 3 de personal · 1 grupo', '5 por atender', 'Diplomado Renaser', '3 meses · 1 año', 'No disponible']),
    );
    act(() => porRotuloCorto('Escuela Renaser').props.onPress());
    expect(onAbrir).toHaveBeenCalledWith('ESCUELA');
  });

  it('un fallo no se vuelve ceros: dice qué pasó y deja reintentar; sin permiso no ofrece reintentar', () => {
    mockCentro.fallo = { mensaje: 'No pudimos cargar las formaciones. Revisa tu conexión.', sinPermiso: false };
    montar(React.createElement(FormacionesAdminScreen, { onVolver: jest.fn(), onAbrir: jest.fn() }));
    expect(hay('No pudimos cargar las formaciones')).toBe(true);
    act(() => boton('Reintentar').props.onPress());
    expect(mockCentro.recargar).toHaveBeenCalledTimes(1);
    act(() => raiz?.unmount());

    mockCentro.fallo = { mensaje: 'No tienes permiso.', sinPermiso: true };
    montar(React.createElement(FormacionesAdminScreen, { onVolver: jest.fn(), onAbrir: jest.fn() }));
    expect(boton('Reintentar')).toBeUndefined();
  });
});

describe('Formaciones: el detalle de una', () => {
  it('muestra resumen, personas, grupos y por atender, y las listas se abren filtradas por esa formación', () => {
    mockCentro.detalle = detalle();
    const onVerPersonas = jest.fn();
    const onVerGrupos = jest.fn();
    montar(React.createElement(FormacionDetalleAdminScreen, { codigo: 'DIPLOMADO', onVolver: jest.fn(), onVerPersonas, onVerGrupos }));
    expect(textos()).toEqual(expect.arrayContaining(['Resumen', 'Personas', 'Grupos', 'Por atender', 'Disponible', '3 meses · 1 año']));
    expect(conEtiqueta('Aprendices: 12')).toBeDefined();
    expect(conEtiqueta('Aprendices sin grupo: 4')).toBeDefined();
    act(() => boton('Ver personas').props.onPress());
    act(() => boton('Ver grupos').props.onPress());
    expect(onVerPersonas).toHaveBeenCalledWith('DIPLOMADO');
    expect(onVerGrupos).toHaveBeenCalledWith('DIPLOMADO');
  });

  it('sin nada por atender lo dice con todas las letras', () => {
    mockCentro.detalle = detalle({ porAtender: { gruposSinMentor: 0, aprendicesSinGrupo: 0, personalSinFormacion: 0 } });
    montar(React.createElement(FormacionDetalleAdminScreen, { codigo: 'DIPLOMADO', onVolver: jest.fn(), onVerPersonas: jest.fn(), onVerGrupos: jest.fn() }));
    expect(textos()).toContain('Nada por atender en esta formación.');
  });
});

describe('Formaciones: editar', () => {
  const abrir = (alGuardar = jest.fn(), alCerrar = jest.fn()) => {
    montar(React.createElement(EditarFormacionSheet, { visible: true, resumen: resumen(), alCerrar, alGuardar }));
    return { alGuardar, alCerrar };
  };

  it('guarda con la versión que leyó y cierra', async () => {
    guardar.mockResolvedValueOnce(resumen({ version: 4 }));
    const { alGuardar, alCerrar } = abrir();
    await act(async () => {
      boton('Guardar').props.onPress();
    });
    expect(guardar).toHaveBeenCalledWith('DIPLOMADO', {
      nombre: 'Diplomado Renaser',
      descripcion: 'Formación de 3 meses o de 1 año.',
      activa: true,
      duracionesDias: [90, 365],
      version: 3,
    });
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('no deja guardar sin nombre ni sin ninguna duración, y dice qué falta', () => {
    abrir();
    const campo = raiz!.root.findAll(n => n.type === TextInput && n.props.accessibilityLabel === 'Nombre de la formación')[0];
    act(() => campo.props.onChangeText('ab'));
    expect(hay('El nombre necesita al menos 3 letras.')).toBe(true);
    expect(boton('Guardar').props.disabled ?? boton('Guardar').props.accessibilityState?.disabled).toBeTruthy();
    act(() => campo.props.onChangeText('Diplomado Plus'));
    act(() => boton('3 meses (90 días)').props.onPress());
    act(() => boton('1 año (365 días)').props.onPress());
    expect(hay('Elige al menos una duración.')).toBe(true);
  });

  it('si otra persona la cambió antes (409) lo dice y no cierra', async () => {
    guardar.mockRejectedValueOnce(new ApiError(409, 'versión vieja'));
    const { alGuardar, alCerrar } = abrir();
    await act(async () => {
      boton('Guardar').props.onPress();
    });
    expect(hay('Otra persona cambió esta formación')).toBe(true);
    expect(alGuardar).not.toHaveBeenCalled();
    expect(alCerrar).not.toHaveBeenCalled();
  });
});

describe('el filtro «Formación»', () => {
  it('ofrece Todas y las tres, marca la elegida y avisa el código (null = todas)', () => {
    const onCambiar = jest.fn();
    montar(React.createElement(FiltroDeFormacion, { valor: 'DIPLOMADO', onCambiar }));
    expect(textos()).toEqual(['Todas', 'Escuela', 'Diplomado', 'Certificación']);
    expect(boton('Diplomado').props.accessibilityState.selected).toBe(true);
    act(() => boton('Certificación').props.onPress());
    expect(onCambiar).toHaveBeenLastCalledWith('CERTIFICACION');
    act(() => boton('Todas las formaciones').props.onPress());
    expect(onCambiar).toHaveBeenLastCalledWith(null);
    act(() => boton('Diplomado').props.onPress());
    expect(onCambiar).toHaveBeenCalledTimes(2);
  });
});
