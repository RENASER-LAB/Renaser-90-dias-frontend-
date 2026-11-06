/**
 * Spec 047 (decisión P4-B del dueño): «Esta sesión se graba y se transcribe.» en el detalle del evento, para todo el que lo ve, solo si el
 * servidor lo afirma (`recordingNotice`). Nunca se muestra la transcripción.
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
let mockFresco: unknown = null;
const mockLecturas: Array<{ id: string; activo: boolean }> = [];
jest.mock('../../hooks/useMeetDelEvento', () => ({
  useMeetDelEvento: (id: string, activo: boolean) => {
    mockLecturas.push({ id, activo });
    return { evento: activo ? mockFresco : null, lectura: 'lista', reintentando: false, fallo: false, reintentar: async () => true };
  },
}));

import { aEvento } from '../../api/eventosSchemas';
import type { Evento, Ocurrencia } from '../../types/eventos.types';
import { AVISO_DE_GRABACION, DetalleDelEvento } from '../DetalleDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});
beforeEach(() => {
  mockFresco = null;
  mockLecturas.length = 0;
});

const propio = (n: ReactTestInstance) =>
  React.Children.toArray(n.props.children as React.ReactNode)
    .filter(x => typeof x === 'string' || typeof x === 'number')
    .join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(propio);
const hay = (r: ReactTestRenderer, texto: string) => textos(r).some(t => t.includes(texto));

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1', titulo: 'Clase en vivo', descripcion: null, portadaUrl: null, iniciaEn: '2026-11-12T01:00:00Z', duracionMinutos: 60,
    zona: 'America/Lima', tipoUbicacion: 'MEET', valorUbicacion: 'https://meet.google.com/abc-defg-hij', tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null, notificarAlCrear: false, recurrente: false, creadoPor: 'admin', audiencia: 'ALL', rolesDestino: [], ...parcial,
  };
}

function detalle(e: Evento, puedeGestionar = false) {
  const oc: Ocurrencia = { evento: e, inicioOcurrencia: e.iniciaEn, iniciaEn: e.iniciaEn, duracionMinutos: 60, titulo: e.titulo, asistencia: null };
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(DetalleDelEvento, {
        oc,
        puedeGestionar,
        enviando: false,
        onVolver: () => undefined,
        onResponder: () => undefined,
        onEditar: () => undefined,
        onCancelar: () => undefined,
      }),
    );
  });
  montadas.push(r);
  return r;
}

describe('el aviso de grabación en el detalle del evento', () => {
  // spec 047 FR-018
  it('el aprendiz ve «Esta sesión se graba y se transcribe.» cuando el servidor lo afirma, y el evento por Meet se lee fresco', () => {
    mockFresco = evento({ seGrabaYTranscribe: true });
    const r = detalle(evento());

    expect(AVISO_DE_GRABACION).toBe('Esta sesión se graba y se transcribe.');
    expect(hay(r, AVISO_DE_GRABACION)).toBe(true);
    expect(mockLecturas.at(-1)).toEqual({ id: 'e1', activo: true });
  });

  // spec 047 FR-018
  it('sin la confirmación del servidor (o con un servidor anterior) no aparece', () => {
    mockFresco = evento();
    expect(hay(detalle(evento()), AVISO_DE_GRABACION)).toBe(false);
  });

  // spec 047 FR-018
  it('un evento que no es por Meet no se lee fresco ni dice nada de grabación', () => {
    mockFresco = evento({ seGrabaYTranscribe: true });
    const r = detalle(evento({ tipoUbicacion: 'ADDRESS', valorUbicacion: 'Av. Ejército 101' }));
    expect(hay(r, AVISO_DE_GRABACION)).toBe(false);
    expect(mockLecturas.at(-1)?.activo).toBe(false);
  });

  // spec 047 FR-018
  it('el esquema lee `recordingNotice` tolerante: solo `true` cuenta', () => {
    const base = {
      id: 'e1', title: 'Clase', startsAt: '2026-11-12T01:00:00Z', locationType: 'MEET', locationValue: 'https://meet.google.com/abc-defg-hij',
    } as Parameters<typeof aEvento>[0];
    expect(aEvento({ ...base, recordingNotice: true } as Parameters<typeof aEvento>[0]).seGrabaYTranscribe).toBe(true);
    expect(aEvento({ ...base, recordingNotice: 'si' } as Parameters<typeof aEvento>[0]).seGrabaYTranscribe).toBeUndefined();
    expect(aEvento(base).seGrabaYTranscribe).toBeUndefined();
  });
});
