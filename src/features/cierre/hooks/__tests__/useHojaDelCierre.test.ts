/**
 * Lo que pasa DENTRO de la hoja «Cierra tu día» (spec 017): leer al abrir, ir armando las respuestas, guardar. Con la red
 * reemplazada por un doble que anota cada pedido, para poder decir EXACTAMENTE qué sale de la app.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLogro = jest.fn();
const mockSeleccion = jest.fn();
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => mockLogro() },
}));

/** Cada pedido que sale de la app, con su método y su cuerpo. */
const mockPedidos: { ruta: string; metodo: string; cuerpo?: unknown }[] = [];
let mockRespuesta: (ruta: string, metodo: string, cuerpo?: unknown) => unknown;
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async (ruta: string, opciones?: { method?: string; body?: unknown }) => {
    const metodo = opciones?.method ?? 'GET';
    mockPedidos.push({ ruta, metodo, cuerpo: opciones?.body });
    return mockRespuesta(ruta, metodo, opciones?.body);
  },
}));

import { ApiError } from '../../../../services/http/apiClient';
import { alCumplirUnHabito } from '../../../habits/eventos/habitoCumplido';
import { useHojaDelCierre } from '../useHojaDelCierre';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOY = '2026-10-29';
const DIA_ABIERTO = {
  fecha: HOY,
  estado: 'ABIERTO',
  puedeCerrar: true,
  cerradoEn: null,
  nota: null,
  semana: { cumplidas: 7, planificadas: 12 },
  acciones: [
    { id: 'a-1', titulo: 'Enviar la propuesta', horaInicio: '10:00:00', cumplida: true, cumplidaEn: '2026-10-29T15:20:00Z', cierre: null },
    { id: 'a-2', titulo: 'Revisar las facturas', horaInicio: '20:30:00', cumplida: false, cumplidaEn: null, cierre: null },
  ],
};
const DIA_CERRADO = {
  ...DIA_ABIERTO,
  estado: 'CERRADO',
  cerradoEn: '2026-10-29T03:02:00Z',
  acciones: [
    DIA_ABIERTO.acciones[0],
    { ...DIA_ABIERTO.acciones[1], cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó' } },
  ],
};

const alLeer = jest.fn();
const alGuardar = jest.fn();
const alSalirPorDiaCerrado = jest.fn();
let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useHojaDelCierre>;
type Props = { visible?: boolean; fecha?: string; hoyIso?: string };
function Sonda({ visible = true, fecha = HOY, hoyIso = HOY }: Props) {
  hook = useHojaDelCierre({ visible, fecha, hoyIso, alLeer, alGuardar, alSalirPorDiaCerrado });
  return React.createElement('Text', null, hook.fase);
}
const montar = (props: Props = {}) => act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, props)); });
const actualizar = (props: Props) => act(async () => { raiz!.update(React.createElement(Sonda, props)); });
const hacer = (f: () => void) => act(async () => f());
const responderChips = () =>
  hacer(() => {
    hook.elegirMotivo('a-2', 'SIN_TIEMPO');
    hook.elegirManana('a-2', 'OTRA_HORA');
  });

const cumplidos: unknown[] = [];
let dejarDeEscuchar: () => void;

beforeEach(() => {
  mockPedidos.length = 0;
  cumplidos.length = 0;
  mockLogro.mockClear();
  mockSeleccion.mockClear();
  alLeer.mockClear();
  alGuardar.mockClear();
  alSalirPorDiaCerrado.mockClear();
  mockRespuesta = (_ruta, metodo) => (metodo === 'PUT' ? { ...DIA_CERRADO } : { ...DIA_ABIERTO });
  dejarDeEscuchar = alCumplirUnHabito(c => cumplidos.push(c));
});
afterEach(() => {
  dejarDeEscuchar();
  act(() => raiz?.unmount());
  raiz = null;
});

describe('al abrir', () => {
  it('lee el día que se abrió (no «hoy» a ciegas) cada vez que se abre', async () => {
    await montar({ visible: false });
    expect(mockPedidos).toEqual([]);
    await actualizar({ visible: true });
    expect(mockPedidos.map(p => `${p.metodo} ${p.ruta}`)).toEqual([`GET /api/v1/rocks/day-closure?date=${HOY}`]);
    expect(hook.fase).toBe('formulario');
    expect(alLeer).toHaveBeenCalledTimes(1);
    await actualizar({ visible: false });
    await actualizar({ visible: true });
    expect(mockPedidos).toHaveLength(2);
  });

  it('un día que ya no se puede cerrar (el servidor dice puedeCerrar: false) cierra la hoja y avisa', async () => {
    mockRespuesta = () => ({ ...DIA_ABIERTO, puedeCerrar: false });
    await montar();
    expect(alSalirPorDiaCerrado).toHaveBeenCalledTimes(1);
    expect(alLeer).not.toHaveBeenCalled();
  });

  it('un fallo de lectura queda en `error` con «Reintentar»', async () => {
    mockRespuesta = () => {
      throw new ApiError(0, 'Sin conexión');
    };
    await montar();
    expect(hook.fase).toBe('error');
    expect(hook.errorDeLectura).toBe('Sin conexión');
    mockRespuesta = () => DIA_ABIERTO;
    await hacer(() => void hook.reintentar());
    expect(hook.fase).toBe('formulario');
  });

  it('abre con un borrador limpio, o con lo guardado si el día ya estaba cerrado', async () => {
    await montar();
    expect(hook.borrador.porAccion['a-2']).toEqual({ motivo: null, manana: null, nota: '' });
    await actualizar({ visible: false });
    mockRespuesta = () => DIA_CERRADO;
    await actualizar({ visible: true });
    expect(hook.borrador.porAccion['a-2']).toEqual({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó' });
  });
});

describe('las respuestas y el botón', () => {
  it('«Guardar mi cierre» se apaga hasta elegir los dos chips y dice qué falta', async () => {
    await montar();
    expect(hook.puedeGuardar).toBe(false);
    expect(hook.textoDeLoQueFalta).toBe('Elige qué pasó y qué harás mañana con «Revisar las facturas».');
    await hacer(() => hook.elegirMotivo('a-2', 'SIN_ENERGIA'));
    expect(hook.puedeGuardar).toBe(false);
    await hacer(() => hook.elegirManana('a-2', 'DEJARLA'));
    expect(hook.puedeGuardar).toBe(true);
    expect(hook.textoDeLoQueFalta).toBeNull();
  });

  it('guardar apagado no envía nada', async () => {
    await montar();
    let resultado: unknown;
    await act(async () => { resultado = await hook.guardar(); });
    expect(resultado).toEqual({ resultado: 'incompleto' });
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
  });
});

describe('guardar', () => {
  it('manda UN PUT con las respuestas de las pendientes y queda «guardado»', async () => {
    await montar();
    await responderChips();
    await hacer(() => hook.escribirNota('a-2', 'Se alargó la reunión'));
    let resultado: unknown;
    await act(async () => { resultado = await hook.guardar(); });
    expect(resultado).toEqual({ resultado: 'guardado' });
    const puts = mockPedidos.filter(p => p.metodo === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0].ruta).toBe('/api/v1/rocks/day-closure');
    expect(puts[0].cuerpo).toEqual({
      fecha: HOY,
      acciones: [{ id: 'a-2', motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó la reunión' }],
    });
    expect(hook.fase).toBe('guardado');
    expect(hook.vista?.estado).toBe('CERRADO');
    expect(alGuardar).toHaveBeenCalledTimes(1);
  });

  it('vibra con tacto.logro() UNA sola vez', async () => {
    await montar();
    await responderChips();
    await act(async () => { await hook.guardar(); });
    await act(async () => { await hook.guardar(); }); // ya guardado: no vuelve a enviar ni a vibrar
    expect(mockLogro).toHaveBeenCalledTimes(1);
  });

  it('GUARDAR NO COMPLETA LA ACCIÓN NI ANUNCIA PUNTOS: nada de /evidence, /complete ni habitoCumplido', async () => {
    await montar();
    await responderChips();
    await act(async () => { await hook.guardar(); });
    const rutas = mockPedidos.map(p => p.ruta);
    expect(rutas.every(r => r.startsWith('/api/v1/rocks/day-closure'))).toBe(true);
    expect(rutas.filter(r => /\/evidence|\/complete|habit-tracks/.test(r))).toEqual([]);
    expect(cumplidos).toEqual([]);
  });

  it('cambió el día con la hoja abierta: NO envía, avisa, y no reasigna el cierre al día nuevo', async () => {
    await montar({ fecha: HOY, hoyIso: HOY });
    await responderChips();
    await actualizar({ fecha: HOY, hoyIso: '2026-10-30' });
    let resultado: unknown;
    await act(async () => { resultado = await hook.guardar(); });
    expect(resultado).toEqual({ resultado: 'dia-cambio' });
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('un 409 por día cerrado se dice `dia-cerrado` (y no es un fallo de red)', async () => {
    await montar();
    await responderChips();
    mockRespuesta = (_r, metodo) => {
      if (metodo === 'PUT') throw new ApiError(409, 'Ese día ya cerró y no se puede cerrar tarde.');
      return DIA_ABIERTO;
    };
    let resultado: unknown;
    await act(async () => { resultado = await hook.guardar(); });
    expect(resultado).toEqual({ resultado: 'dia-cerrado' });
    expect(hook.fase).toBe('formulario');
    expect(mockLogro).not.toHaveBeenCalled();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('un fallo de red deja el formulario como estaba para reintentar, con el mensaje', async () => {
    await montar();
    await responderChips();
    mockRespuesta = (_r, metodo) => {
      if (metodo === 'PUT') throw new ApiError(0, 'Sin conexión');
      return DIA_ABIERTO;
    };
    let resultado: unknown;
    await act(async () => { resultado = await hook.guardar(); });
    expect(resultado).toEqual({ resultado: 'fallo', mensaje: 'Sin conexión' });
    expect(hook.fase).toBe('formulario');
    expect(hook.borrador.porAccion['a-2'].motivo).toBe('SIN_TIEMPO');
  });

  it('sin acciones (o todo cumplido) guarda de una vez, con la nota del día si la hay', async () => {
    mockRespuesta = (_r, metodo) => (metodo === 'PUT' ? { ...DIA_CERRADO, acciones: [] } : { ...DIA_ABIERTO, acciones: [] });
    await montar();
    expect(hook.puedeGuardar).toBe(true);
    await hacer(() => hook.escribirNotaDelDia('Un día tranquilo'));
    await act(async () => { await hook.guardar(); });
    expect(mockPedidos.find(p => p.metodo === 'PUT')?.cuerpo).toEqual({ fecha: HOY, acciones: [], nota: 'Un día tranquilo' });
  });
});
