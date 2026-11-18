import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { hayTocable, montar, tocables, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { WireTicketMentor } from '../../../tickets/types/tickets.types';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, subtitulo, children }: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, { testID: 'hoja' }, R.createElement(Text, null, `HOJA: ${titulo}`), subtitulo ? R.createElement(Text, null, subtitulo) : null, children) : null,
  };
});
jest.mock('../../../../components/ConfirmacionEnLinea', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ConfirmacionEnLinea: ({ texto }: { texto: string }) => R.createElement(Text, null, texto) };
});
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

const mockRecargar = jest.fn();
let mockBandeja: Record<string, unknown>;
jest.mock('../../../tickets/hooks/useBandejaDeTickets', () => ({ useBandejaDeTickets: () => mockBandeja }));
const mockPaginaDePersonas = jest.fn<() => Promise<{ items: Array<{ personaId: string; nombre: string; mentorNombre: string | null }>; hayMas: boolean }>>();
jest.mock('../../api/aprendicesDelLiderApi', () => ({ obtenerAprendicesDelLider: () => mockPaginaDePersonas() }));
const mockRecordar = jest.fn<(id: string, clave: string) => Promise<void>>();
jest.mock('../../api/accionesDelLiderApi', () => ({ recordarConsulta: (...a: [string, string]) => mockRecordar(...a), avisarAlMentor: jest.fn() }));
const mockResponder = jest.fn<(id: string, texto: string) => Promise<unknown>>();
jest.mock('../../../tickets/api/ticketsApi', () => ({ responderTicketMentor: (...a: [string, string]) => mockResponder(...a) }));

import { ConsultasDelLiderScreen } from '../ConsultasDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000 - 60_000).toISOString();
const ticket = (id: string, persona: string, descripcion: string, dias: number, extra: Partial<WireTicketMentor> = {}): WireTicketMentor => ({
  id,
  traineeProfileId: persona,
  blockDescription: descripcion,
  attemptedSolutions: 'x',
  smartGoalImpact: 'y',
  status: 'OPEN',
  mentorAnswer: null,
  answeredAt: null,
  savedToLibrary: false,
  createdAt: hace(dias),
  ...extra,
});
const bandejaCon = (tickets: WireTicketMentor[], extra: Record<string, unknown> = {}) => ({
  tickets,
  resumen: { total: tickets.length, sinResponder: tickets.filter(t => t.status === 'OPEN').length, respondidos: tickets.filter(t => t.status === 'ANSWERED').length },
  cargando: false,
  cargandoMas: false,
  hayMas: false,
  fallo: null,
  detalle: null,
  recargar: mockRecargar,
  verMas: jest.fn(),
  ...extra,
});

const alVolver = jest.fn();
const pantalla = () => React.createElement(ConsultasDelLiderScreen, { onVolver: alVolver } as never);
const campo = (r: Awaited<ReturnType<typeof montar>>) => r.root.findAll(n => n.props.accessibilityLabel === 'Tu respuesta' && typeof n.props.onChangeText === 'function')[0];
const exacto = (r: Awaited<ReturnType<typeof montar>>, etiqueta: string) => {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay «${etiqueta}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  return nodo;
};

beforeEach(() => {
  mockBandeja = bandejaCon([
    ticket('t-1', 'p-1', 'Bloqueo de prueba E2E', 5),
    ticket('t-2', 'p-2', 'Bloqueo del grupo Fénix', 5),
    ticket('t-3', 'p-3', 'No logro madrugar', 2, { status: 'ANSWERED', mentorAnswer: 'Acuéstate a las diez.', answeredAt: hace(1), respondidoPor: { id: 'l-1', nombre: 'Laura Líder' } }),
  ]);
  mockPaginaDePersonas.mockReset().mockResolvedValue({
    items: [
      { personaId: 'p-1', nombre: 'E2E Aprendiz', mentorNombre: 'E2E Mentor' },
      { personaId: 'p-2', nombre: 'Ana López', mentorNombre: 'E2E Mentor' },
      { personaId: 'p-3', nombre: 'Beto Pérez', mentorNombre: 'Ricardo Palomino' },
    ],
    hayMas: false,
  });
  mockRecordar.mockReset().mockResolvedValue();
  mockResponder.mockReset().mockResolvedValue({ id: 't-1' });
  mockRecargar.mockReset();
  mockAlerta.mockReset();
});

describe('Consultas del líder: la bandeja', () => {
  it('tiene «Sin responder» y «Respondidas» con su cantidad y abre en «Sin responder»', async () => { // spec 056 FR-028
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Sin responder · 2');
    expect(texto).toContain('Respondidas · 1');
    expect(texto).toContain('Bloqueo de prueba E2E');
    expect(texto).not.toContain('No logro madrugar');
  });

  it('cada consulta dice quién pregunta, a qué mentor le toca y hace cuántos días', async () => { // spec 056 FR-028
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('E2E Aprendiz → su mentor E2E Mentor');
    expect(texto).toContain('Ana López → su mentor E2E Mentor');
    expect(texto).toContain('hace 5 días');
  });

  it('mientras no se sabe quién es, dice «Un aprendiz» y no un identificador', async () => { // spec 056 FR-028
    mockPaginaDePersonas.mockRejectedValue(new Error('sin red'));
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Un aprendiz → su mentor');
    expect(texto).not.toContain('p-1');
  });

  it('«Respondidas» muestra la respuesta y quién la dio, sin botones', async () => { // spec 056 FR-030
    const r = await montar(pantalla());
    await tocar(r, 'Respondidas');
    const texto = todoElTexto(r);
    expect(texto).toContain('No logro madrugar');
    expect(texto).toContain('Acuéstate a las diez.');
    expect(texto).toContain('Respondió Laura Líder');
    expect(hayTocable(r, 'Recordar al mentor')).toBe(false);
    expect(hayTocable(r, 'Responder yo')).toBe(false);
  });

  it('una pestaña sin consultas lo dice en una línea', async () => { // spec 056 FR-028
    mockBandeja = bandejaCon([]);
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('No hay consultas sin responder.');
  });

  it('con más páginas por leer, las cifras llevan «+» y hay «Ver más»', async () => { // spec 056 FR-028
    mockBandeja = bandejaCon([ticket('t-1', 'p-1', 'Bloqueo', 1)], { hayMas: true });
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Sin responder · 1+');
    expect(hayTocable(r, 'Ver más consultas')).toBe(true);
  });
});

describe('Consultas del líder: Recordar al mentor', () => {
  it('manda el recordatorio de esa consulta con una clave de operación y lo confirma', async () => { // spec 056 FR-029
    const r = await montar(pantalla());
    await tocar(r, 'Recordar al mentor la consulta de E2E Aprendiz');
    expect(mockRecordar).toHaveBeenCalledTimes(1);
    expect(mockRecordar.mock.calls[0][0]).toBe('t-1');
    expect(mockRecordar.mock.calls[0][1]).toMatch(/^recordar-/);
    expect(todoElTexto(r)).toContain('Le recordaste a E2E Mentor.');
  });

  it('un toque, un pedido: dos toques seguidos mandan un solo recordatorio', async () => { // spec 056 FR-029
    let soltar!: () => void;
    mockRecordar.mockImplementation(() => new Promise<void>(res => { soltar = res; }));
    const r = await montar(pantalla());
    await act(async () => {
      exacto(r, 'Recordar al mentor la consulta de E2E Aprendiz').props.onPress();
      exacto(r, 'Recordar al mentor la consulta de E2E Aprendiz').props.onPress();
    });
    expect(mockRecordar).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si el servidor lo rechaza dice su motivo y el reintento usa la misma clave', async () => { // spec 056 FR-029
    mockRecordar.mockRejectedValueOnce(new ApiError(409, 'Esta consulta todavía no tiene mentor.', { codigo: 'SIN_MENTOR' }));
    const r = await montar(pantalla());
    await tocar(r, 'Recordar al mentor la consulta de E2E Aprendiz');
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo recordar', 'Esta consulta todavía no tiene mentor.');
    await tocar(r, 'Recordar al mentor la consulta de E2E Aprendiz');
    expect(mockRecordar.mock.calls[1][1]).toBe(mockRecordar.mock.calls[0][1]);
  });
});

describe('Consultas del líder: Responder yo', () => {
  it('abre una hoja para la consulta con quién pregunta; al enviar responde, cierra, relee la bandeja y lo confirma', async () => { // spec 056 FR-030
    const r = await montar(pantalla());
    await tocar(r, 'Responder yo la consulta de E2E Aprendiz');
    expect(todoElTexto(r)).toContain('HOJA: Responder la consulta');
    expect(todoElTexto(r)).toContain('E2E Aprendiz → su mentor E2E Mentor');
    await act(async () => campo(r).props.onChangeText('Prueba con 15 minutos de sol al despertar.'));
    await act(async () => exacto(r, 'Responder').props.onPress());
    expect(mockResponder).toHaveBeenCalledWith('t-1', 'Prueba con 15 minutos de sol al despertar.');
    expect(mockRecargar).toHaveBeenCalledTimes(1);
    expect(todoElTexto(r)).not.toContain('HOJA: Responder la consulta');
    expect(todoElTexto(r)).toContain('Respondiste la consulta.');
  });

  it('con el texto vacío no envía y dice qué falta', async () => { // spec 056 FR-030
    const r = await montar(pantalla());
    await tocar(r, 'Responder yo la consulta de E2E Aprendiz');
    await act(async () => exacto(r, 'Responder').props.onPress());
    expect(mockResponder).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('Escribe lo que quieres decir.');
  });

  it('si el servidor lo rechaza dice su motivo y la hoja conserva lo escrito', async () => { // spec 056 FR-030
    mockResponder.mockRejectedValueOnce(new ApiError(403, 'Esta consulta no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    const r = await montar(pantalla());
    await tocar(r, 'Responder yo la consulta de E2E Aprendiz');
    await act(async () => campo(r).props.onChangeText('Mi respuesta'));
    await act(async () => exacto(r, 'Responder').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo responder', 'Esta consulta no es de tus formaciones.');
    expect(todoElTexto(r)).toContain('HOJA: Responder la consulta');
    expect(campo(r).props.value).toBe('Mi respuesta');
    expect(mockRecargar).not.toHaveBeenCalled();
  });

  it('cada botón de la consulta mide 44 o más de alto', async () => { // spec 056 FR-044
    const r = await montar(pantalla());
    expect(hayTocable(r, 'Recordar al mentor')).toBe(true);
    expect(hayTocable(r, 'Responder yo')).toBe(true);
  });
});

describe('Consultas del líder: cuando no carga', () => {
  it('dice por qué, con su motivo si el servidor lo dio', async () => { // spec 056 FR-042
    mockBandeja = bandejaCon([], { fallo: 'sin_permiso', detalle: 'Tu cuenta no ve esta bandeja.' });
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Tu cuenta no ve esta bandeja.');
  });
});
