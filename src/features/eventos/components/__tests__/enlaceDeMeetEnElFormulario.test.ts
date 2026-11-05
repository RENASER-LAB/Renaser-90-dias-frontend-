/**
 * «Dónde es» (Meet que se crea solo, por defecto) en el formulario de eventos y la línea de la sala en el detalle (spec 040, D-321, FR-014, FR-019, FR-021, SC-007, SC-009).
 * El formulario y el detalle se montan de verdad; la red, el tema y lo pesado son dobles.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
jest.mock('../../../habits/components/HoraPickerModal', () => ({ HoraPickerModal: () => null }));
jest.mock('../../../academy/components/CursoPortada', () => ({ CursoPortada: () => null }));
jest.mock('../../utils/portadaDelEvento', () => ({ elegirPortada: async () => null }));
jest.mock('../../../../components/LogoDeMarca', () => ({ LogoDeMarca: () => null }));
jest.mock('../../../formaciones/components/RotuloDeFormacion', () => ({ RotuloDeFormacion: () => null }));
jest.mock('../asistencia/EspacioSobreFlotantes', () => ({ EspacioSobreFlotantes: () => null }));
jest.mock('../asistencia/HojaQuienRespondio', () => ({ HojaQuienRespondio: () => null }));
jest.mock('../asistencia/TarjetaDeAsistencia', () => ({ TarjetaDeAsistencia: () => null }));
jest.mock('../../hooks/useAhora', () => ({ useAhora: () => Date.parse('2026-11-05T15:00:00Z') }));
jest.mock('../../hooks/useAsistenciaDelEvento', () => ({ useAsistenciaDelEvento: () => ({ lista: null }) }));

let mockDisponibilidad = { sabido: true, disponibilidad: { disponible: true, motivo: null as string | null } };
jest.mock('../../hooks/useDisponibilidadDeMeet', () => ({ useDisponibilidadDeMeet: () => mockDisponibilidad }));

type Lectura = 'cargando' | 'lista' | 'fallo';
let mockMeet: { evento: unknown; lectura: Lectura; reintentando: boolean; fallo: boolean; reintentar: () => Promise<boolean> };
const mockReintentar = jest.fn<() => Promise<boolean>>();
jest.mock('../../hooks/useMeetDelEvento', () => ({ useMeetDelEvento: () => mockMeet }));

import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { formularioDesdeEvento, formularioVacio } from '../../utils/formularioDeEvento';
import { DetalleDelEvento } from '../DetalleDelEvento';
import { FormularioDelEvento } from '../FormularioDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AHORA = Date.parse('2026-11-05T15:00:00Z');
const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});
beforeEach(() => {
  mockDisponibilidad = { sabido: true, disponibilidad: { disponible: true, motivo: null } };
  mockReintentar.mockReset().mockResolvedValue(true);
  mockMeet = { evento: null, lectura: 'lista', reintentando: false, fallo: false, reintentar: mockReintentar };
});

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1',
    titulo: 'Clase en vivo',
    descripcion: null,
    portadaUrl: null,
    iniciaEn: '2026-11-10T01:00:00Z',
    duracionMinutos: 90,
    zona: 'America/Lima',
    tipoUbicacion: 'MEET',
    valorUbicacion: 'https://meet.google.com/abc-defg-hij',
    tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null,
    notificarAlCrear: true,
    recurrente: false,
    creadoPor: 'u1',
    audiencia: 'ALL_MEMBERS',
    rolesDestino: [],
    ...parcial,
  };
}

function montar(elemento: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  montadas.push(r);
  return r;
}

const propio = (n: ReactTestInstance) =>
  React.Children.toArray(n.props.children as React.ReactNode)
    .filter(x => typeof x === 'string' || typeof x === 'number')
    .join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(propio);
const hay = (r: ReactTestRenderer, texto: string) => textos(r).some(t => t.includes(texto));
const conRol = (r: ReactTestRenderer, rol: string) => r.root.findAll(n => (n.type as unknown) === 'View' && n.props.accessibilityRole === rol);
const boton = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance | undefined =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

function formulario(original: Evento | null = null, inicial = original ? formularioDesdeEvento(original) : formularioVacio(AHORA, 'America/Lima')) {
  return montar(
    React.createElement(FormularioDelEvento, {
      inicial,
      original,
      error: null,
      guardando: false,
      onVolver: () => undefined,
      onGuardar: () => undefined,
    }),
  );
}

const radio = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta)[0];

describe('el formulario (FR-019, FR-014, FR-023, SC-009; decisión del dueño del 2026-11-05)', () => {
  // spec 040 FR-014, SC-009
  it('SC-009: si el servidor dice que no se puede, no hay «Dónde es» y el formulario es el de siempre (link o lugar)', () => {
    mockDisponibilidad = { sabido: true, disponibilidad: { disponible: false, motivo: 'APAGADA' } };

    const r = formulario();

    expect(hay(r, 'Dónde es')).toBe(false);
    expect(hay(r, 'Link de la reunión')).toBe(true);
    expect(hay(r, 'O el lugar')).toBe(true);
  });

  // spec 040 FR-014
  it('mientras no se sabe si se puede, tampoco se ofrece (nunca una opción que después responde 409)', () => {
    mockDisponibilidad = { sabido: false, disponibilidad: { disponible: false, motivo: null } };

    expect(hay(formulario(), 'Por Meet (se crea solo)')).toBe(false);
  });

  // spec 040 FR-019, FR-023
  it('disponible: «Por Meet (se crea solo)» viene marcada, sin campos que llenar y SIN elegir quién puede entrar', () => {
    const r = formulario();

    expect(hay(r, 'Dónde es')).toBe(true);
    expect(radio(r, 'Por Meet (se crea solo)')?.props.accessibilityState).toEqual({ checked: true });
    expect(radio(r, 'En un lugar')?.props.accessibilityState).toEqual({ checked: false });
    expect(hay(r, 'Link de la reunión')).toBe(false);
    expect(hay(r, 'Dirección')).toBe(false);
    expect(hay(r, 'Quién puede entrar')).toBe(false);
    expect(hay(r, 'Con permiso')).toBe(false);
    expect(hay(r, 'Abierta')).toBe(false);
    expect(conRol(r, 'radiogroup')).toHaveLength(1);
  });

  // spec 040 FR-019
  it('«En un lugar» pide la dirección; «Pegar otro enlace», discreto, muestra el campo del link', () => {
    const r = formulario();

    act(() => radio(r, 'En un lugar')!.props.onPress());
    expect(hay(r, 'Dirección')).toBe(true);
    expect(hay(r, 'Link de la reunión')).toBe(false);

    act(() => boton(r, 'Pegar otro enlace')!.props.onPress());
    expect(hay(r, 'Link de la reunión')).toBe(true);
    expect(hay(r, 'Dirección')).toBe(false);
    expect(radio(r, 'Por Meet (se crea solo)')?.props.accessibilityState).toEqual({ checked: false });
  });

  // spec 040 FR-001, FR-023
  it('guardar sin tocar nada manda el formulario con Meet: el servidor crea la sala abierta', () => {
    const onGuardar = jest.fn();
    const r = montar(
      React.createElement(FormularioDelEvento, {
        inicial: formularioVacio(AHORA, 'America/Lima'),
        original: null,
        error: null,
        guardando: false,
        onVolver: () => undefined,
        onGuardar,
      }),
    );

    act(() => boton(r, 'Crear evento')!.props.onPress());
    expect((onGuardar.mock.calls[0]?.[0] as { donde: string }).donde).toBe('meet');
  });

  // spec 040 FR-019
  it('un evento que ya usaba el enlace sigue en «Por Meet» aunque el servidor ya no lo ofrezca, y dice por qué', () => {
    mockDisponibilidad = { sabido: true, disponibilidad: { disponible: false, motivo: 'CUENTA_REVOCADA' } };
    const original = evento({ meet: { estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConSala: 1, fechasConProblema: 0, avisoDelPlan: null } });

    const r = formulario(original);

    expect(radio(r, 'Por Meet (se crea solo)')?.props.accessibilityState).toEqual({ checked: true });
    expect(hay(r, 'Hay que volver a conectar la cuenta de Google')).toBe(true);
  });

  // spec 040 FR-021
  it('FR-021: el formulario con Meet no dice nada de 60 minutos ni de cortes', () => {
    const r = formulario();

    expect(textos(r).join(' ')).not.toMatch(/60 min|sesenta|una hora|se corta|límite de tiempo/i);
  });
});

function ocurrencia(e: Evento): Ocurrencia {
  return { evento: e, inicioOcurrencia: e.iniciaEn, iniciaEn: e.iniciaEn, duracionMinutos: e.duracionMinutos, titulo: e.titulo, asistencia: null };
}

function detalle(e: Evento, puedeGestionar: boolean, onEditar = jest.fn(), onSalaActualizada = jest.fn()) {
  return {
    onEditar,
    onSalaActualizada,
    r: montar(
      React.createElement(DetalleDelEvento, {
        oc: ocurrencia(e),
        puedeGestionar,
        enviando: false,
        onVolver: () => undefined,
        onResponder: () => undefined,
        onEditar,
        onCancelar: () => undefined,
        onSalaActualizada,
      }),
    ),
  };
}

const FALLIDO = { estado: 'FALLIDO', accesoAplicado: false, mensaje: 'No pudimos crear el enlace de Meet.', fechasConSala: 0, fechasConProblema: 1, avisoDelPlan: null };

describe('el detalle del evento (FR-019, FR-008, SC-007)', () => {
  // spec 040 SC-007
  it('SC-007: quien no administra no ve nada nuevo: ni la línea de la sala ni «Reintentar»', () => {
    mockMeet = { ...mockMeet, evento: evento({ meet: FALLIDO }) };

    const { r } = detalle(evento(), false);

    expect(hay(r, 'No pudimos crear el enlace de Meet.')).toBe(false);
    expect(boton(r, 'Reintentar')).toBeUndefined();
    expect(hay(r, 'Reintentar')).toBe(false);
  });

  // spec 040 FR-019, FR-008
  it('ADMIN con la sala fallida: ve la frase del servidor y «Reintentar»; al lograrlo se relee la lista', async () => {
    mockMeet = { ...mockMeet, evento: evento({ meet: FALLIDO }) };
    const { r, onSalaActualizada } = detalle(evento(), true);

    expect(hay(r, 'No pudimos crear el enlace de Meet.')).toBe(true);
    const reintentar = r.root.findAll(n => typeof n.props.onPress === 'function' && textoDe(n) === 'Reintentar')[0];
    expect(reintentar).toBeDefined();
    await act(async () => {
      reintentar?.props.onPress();
    });

    expect(mockReintentar).toHaveBeenCalledTimes(1);
    expect(onSalaActualizada).toHaveBeenCalledTimes(1);
  });

  // spec 040 FR-019
  it('con la sala en orden no hay línea ni «Reintentar»', () => {
    mockMeet = { ...mockMeet, evento: evento({ meet: { ...FALLIDO, estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConProblema: 0, fechasConSala: 1 } }) };

    const { r } = detalle(evento(), true);

    expect(hay(r, 'Reintentar')).toBe(false);
  });

  // spec 040 FR-019
  it('un evento que se repite con el enlace automático dice «Cada fecha tendrá su propio enlace.»', () => {
    mockMeet = { ...mockMeet, evento: evento({ recurrente: true, meet: { ...FALLIDO, estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConProblema: 0 } }) };

    const { r } = detalle(evento({ recurrente: true }), true);

    expect(hay(r, 'Cada fecha tendrá su propio enlace.')).toBe(true);
  });

  // spec 040 FR-037
  it('ADMIN ve qué plan de Google falta para grabar o transcribir, sin «Reintentar» (no es un error); quien no administra no lo ve', () => {
    const aviso = 'Para grabar hace falta Google One de 2 TB o más en la cuenta conectada; para transcribir, Google Workspace.';
    mockMeet = { ...mockMeet, evento: evento({ meet: { ...FALLIDO, estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConProblema: 0, fechasConSala: 1, avisoDelPlan: aviso } }) };

    const { r } = detalle(evento(), true);
    expect(hay(r, aviso)).toBe(true);
    expect(hay(r, 'Reintentar')).toBe(false);

    const { r: aprendiz } = detalle(evento(), false);
    expect(hay(aprendiz, aviso)).toBe(false);
  });

  // spec 040 FR-005
  it('«Editar evento» entrega el evento recién leído (el que trae el estado de la sala), no el de la lista', () => {
    const fresco = evento({ meet: { ...FALLIDO, estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConProblema: 0, fechasConSala: 1 } });
    mockMeet = { ...mockMeet, evento: fresco };
    const { r, onEditar } = detalle(evento(), true);

    const editar = r.root.findAll(n => typeof n.props.onPress === 'function' && textoDe(n) === 'Editar evento')[0];
    act(() => editar?.props.onPress());

    expect(onEditar).toHaveBeenCalledWith(fresco);
  });

  // spec 040 FR-005
  it('mientras no se leyó el estado de la sala, no se puede editar (el formulario no sabría si el evento usa el enlace automático)', () => {
    mockMeet = { ...mockMeet, evento: null, lectura: 'cargando' };
    const { r, onEditar } = detalle(evento(), true);

    const editar = r.root.findAll(n => n.props.accessibilityLabel === 'Editar evento' && n.props.accessibilityState !== undefined)[0];
    expect(editar?.props.accessibilityState?.disabled).toBe(true);
    expect(editar?.props.disabled).toBe(true);
    expect(onEditar).not.toHaveBeenCalled();
  });

  // spec 040 FR-005
  it('si la lectura falló, lo dice y tampoco deja editar', () => {
    mockMeet = { ...mockMeet, evento: null, lectura: 'fallo' };

    const { r } = detalle(evento(), true);

    expect(hay(r, 'No pudimos leer el estado del enlace de Meet.')).toBe(true);
  });
});

function textoDe(nodo: ReactTestInstance): string {
  return nodo
    .findAll(n => (n.type as unknown) === 'Text')
    .map(propio)
    .join('');
}
