/**
 * Decisión del dueño (2026-11-16): en el detalle de un evento con enlace, al lado de «Unirme» va un botón chico, solo ícono, que copia el
 * enlace. Lo ve cualquiera que vea el enlace; si el binario no puede copiar, no aparece; sin enlace, tampoco.
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
jest.mock('../../../../components/LogoDeMarca', () => ({ LogoDeMarca: () => null }));
jest.mock('../../../formaciones/components/RotuloDeFormacion', () => ({ RotuloDeFormacion: () => null }));
jest.mock('../asistencia/EspacioSobreFlotantes', () => ({ EspacioSobreFlotantes: () => null }));
jest.mock('../asistencia/HojaQuienRespondio', () => ({ HojaQuienRespondio: () => null }));
jest.mock('../asistencia/TarjetaDeAsistencia', () => ({ TarjetaDeAsistencia: () => null }));
jest.mock('../../hooks/useAhora', () => ({ useAhora: () => Date.parse('2026-11-06T15:00:00Z') }));
jest.mock('../../hooks/useAsistenciaDelEvento', () => ({ useAsistenciaDelEvento: () => ({ lista: null }) }));
jest.mock('../../hooks/useMeetDelEvento', () => ({
  useMeetDelEvento: () => ({ evento: null, lectura: 'lista', reintentando: false, fallo: false, reintentar: async () => true }),
}));
let mockSePuedeCopiar = true;
let mockCopiado = true;
const mockCopias: string[] = [];
jest.mock('../../../chat/utils/portapapeles', () => ({
  sePuedeCopiar: () => mockSePuedeCopiar,
  copiarAlPortapapeles: async (texto: string) => {
    mockCopias.push(texto);
    return mockCopiado;
  },
}));

import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { AVISO_ENLACE_COPIADO, DetalleDelEvento } from '../DetalleDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
  jest.useRealTimers();
});
beforeEach(() => {
  mockSePuedeCopiar = true;
  mockCopiado = true;
  mockCopias.length = 0;
});

const ENLACE = 'https://meet.google.com/abc-defg-hij';

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1', titulo: 'Clase en vivo', descripcion: null, portadaUrl: null, iniciaEn: '2026-11-12T01:00:00Z', duracionMinutos: 60,
    zona: 'America/Lima', tipoUbicacion: 'MEET', valorUbicacion: ENLACE, tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null, notificarAlCrear: false, recurrente: false, creadoPor: 'otra-persona', audiencia: 'ALL', rolesDestino: [], ...parcial,
  };
}

function detalle(e: Evento, onAviso?: (texto: string) => void) {
  const oc: Ocurrencia = { evento: e, inicioOcurrencia: e.iniciaEn, iniciaEn: e.iniciaEn, duracionMinutos: 60, titulo: e.titulo, asistencia: null };
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(DetalleDelEvento, {
        oc,
        puedeGestionar: false,
        enviando: false,
        onVolver: () => undefined,
        onResponder: () => undefined,
        onEditar: () => undefined,
        onCancelar: () => undefined,
        onAviso,
      }),
    );
  });
  montadas.push(r);
  return r;
}

const botones = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function');

describe('copiar el enlace del evento', () => {
  // spec 040 FR-039
  it('con enlace aparece el botón y copia esa URL; lo ve quien no creó el evento', async () => {
    const r = detalle(evento());
    const [boton] = botones(r, 'Copiar el enlace de Google Meet');
    expect(boton).toBeDefined();
    await act(async () => {
      boton!.props.onPress();
    });
    expect(mockCopias).toEqual([ENLACE]);
  });

  // spec 040 FR-039
  it('el nombre del servicio en la etiqueta sale del enlace (Zoom)', () => {
    const r = detalle(evento({ tipoUbicacion: 'ZOOM', valorUbicacion: 'https://us02web.zoom.us/j/123456' }));
    expect(botones(r, 'Copiar el enlace de Zoom').length).toBeGreaterThan(0);
  });

  // spec 040 FR-039
  it('tras copiar cambia a «Enlace copiado», avisa y vuelve a la etiqueta de copiar a los 2,5 s', async () => {
    jest.useFakeTimers();
    const avisos: string[] = [];
    const r = detalle(evento(), t => avisos.push(t));
    await act(async () => {
      botones(r, 'Copiar el enlace de Google Meet')[0]!.props.onPress();
    });
    expect(avisos).toEqual(['Enlace copiado. Pégalo en WhatsApp o donde quieras.']);
    expect(AVISO_ENLACE_COPIADO).toBe('Enlace copiado. Pégalo en WhatsApp o donde quieras.');
    expect(botones(r, 'Enlace copiado').length).toBeGreaterThan(0);
    expect(botones(r, 'Copiar el enlace de Google Meet')).toHaveLength(0);
    await act(async () => {
      jest.advanceTimersByTime(2600);
    });
    expect(botones(r, 'Copiar el enlace de Google Meet').length).toBeGreaterThan(0);
  });

  // spec 040 FR-039
  it('si no se pudo copiar, no dice «copiado»', async () => {
    mockCopiado = false;
    const avisos: string[] = [];
    const r = detalle(evento(), t => avisos.push(t));
    await act(async () => {
      botones(r, 'Copiar el enlace de Google Meet')[0]!.props.onPress();
    });
    expect(avisos).toEqual([]);
    expect(botones(r, 'Enlace copiado')).toHaveLength(0);
  });

  // spec 040 FR-039
  it('sin enlace no aparece', () => {
    const r = detalle(evento({ tipoUbicacion: 'ADDRESS', valorUbicacion: 'Av. Ejército 101' }));
    expect(r.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Copiar el enlace'))).toHaveLength(0);
  });

  // spec 040 FR-039
  it('si el binario no puede copiar, no aparece, pero «Unirme» sigue', () => {
    mockSePuedeCopiar = false;
    const r = detalle(evento());
    expect(r.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Copiar el enlace'))).toHaveLength(0);
    expect(botones(r, 'Unirme por Google Meet').length).toBeGreaterThan(0);
  });
});
