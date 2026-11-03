/**
 * La ficha de Administración dice «Aceptada el …» en la zona del teléfono, no en UTC (issue #108, E2E final del 2026-11-02).
 *
 * `fechaCorta` partía el texto ISO del instante, así que quedaba en UTC: a las 21:30 de Lima del 2 de noviembre (`2026-11-03T02:30:00Z`) la ficha decía
 * «Aceptada el 3 de noviembre» (entre las 19:00 y las 24:00 de Lima salía el día siguiente). Jest corre con `TZ = America/Lima` (`jest.config.js`).
 *
 * Contra el código anterior falla: daba «3 de noviembre» para el instante de las 21:30 de Lima.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockApiFetch = jest.fn<(ruta: string, opciones?: { body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => {
  const real = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
  return { ...real, apiFetch: (ruta: string, opciones?: { body?: unknown }) => mockApiFetch(ruta, opciones) };
});

import { crearCohorte } from '../../api/adminApi';
import { AceptacionDeLaPersona } from '../../components/AceptacionDeLaPersona';
import { textoDeLaAceptada } from '../aceptarSolicitud';
import { fechaCorta } from '../fechas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 21:30 del lunes 2 de noviembre de 2026 en Lima (UTC−5) = 02:30 UTC del martes 3. */
const A_LAS_2130_DE_LIMA = '2026-11-03T02:30:00Z';
const ACEPTACION = { formations: ['ESCUELA'], durationDays: 90, role: 'TRAINEE', customRoleId: null, customRoleName: null, withDiagnosis: false };

describe('fechaCorta de un instante', () => {
  it('a las 21:30 de Lima sigue siendo el 2 de noviembre (el 3 es el día de UTC)', () => {
    expect(fechaCorta(A_LAS_2130_DE_LIMA)).toBe('2 de noviembre');
  });

  it('el límite: a las 18:59 de Lima es el mismo día y a las 19:00 ya es el día siguiente en UTC pero NO en Lima', () => {
    expect(fechaCorta('2026-11-02T23:59:00Z')).toBe('2 de noviembre'); // 18:59 en Lima
    expect(fechaCorta('2026-11-03T00:00:00Z')).toBe('2 de noviembre'); // 19:00 en Lima: el bug lo daba como el 3
    expect(fechaCorta('2026-11-03T04:59:59Z')).toBe('2 de noviembre'); // 23:59:59 en Lima
    expect(fechaCorta('2026-11-03T05:00:00Z')).toBe('3 de noviembre'); // 00:00 en Lima
  });

  it('con un desfase en el texto también (`-05:00`) y con espacio en vez de «T»', () => {
    expect(fechaCorta('2026-11-02T21:30:00-05:00')).toBe('2 de noviembre');
    expect(fechaCorta('2026-11-03T02:30:00.123456Z')).toBe('2 de noviembre');
  });

  it('cruza de mes y de año', () => {
    expect(fechaCorta('2027-01-01T03:00:00Z')).toBe('31 de diciembre');
    expect(fechaCorta('2026-12-01T02:00:00Z')).toBe('30 de noviembre');
  });
});

describe('una fecha de calendario no se corre', () => {
  it('«2026-11-03» es el 3, con Lima y con cualquier zona (no pasa por Date)', () => {
    expect(fechaCorta('2026-11-03')).toBe('3 de noviembre');
    expect(fechaCorta('2026-12-01')).toBe('1 de diciembre');
  });

  it('sin dato o con basura, «—»', () => {
    expect(fechaCorta(null)).toBe('—');
    expect(fechaCorta('ayer')).toBe('—');
  });
});

describe('«Aceptada por … el …»', () => {
  it('textoDeLaAceptada (la lista de «Aceptadas» y la ficha) dice el día de Lima', () => {
    expect(textoDeLaAceptada('Ana', A_LAS_2130_DE_LIMA, ACEPTACION).titulo).toBe('Aceptada por Ana el 2 de noviembre');
  });

  it('la ficha de Administración dibuja «Aceptada por Luis el 2 de noviembre» para una aceptación de las 21:30', () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(React.createElement(AceptacionDeLaPersona, { aceptacion: ACEPTACION, aceptadaPor: 'Luis', aceptadaEn: A_LAS_2130_DE_LIMA }));
    });
    const textos = r.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));
    expect(textos).toContain('Aceptada por Luis el 2 de noviembre');
    expect(textos.join(' ')).not.toContain('3 de noviembre');
  });
});

describe('«hoy» que propone el alta de una cohorte', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(A_LAS_2130_DE_LIMA) });
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ id: 'c-1', name: 'Nueva', startDate: '2026-11-02', endDate: null, active: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('con el reloj a las 21:30 de Lima, la fecha de inicio por defecto es el 2 de noviembre (no el 3 de UTC)', async () => {
    await crearCohorte('Nueva').catch(() => undefined);
    const cuerpo = mockApiFetch.mock.calls[0][1]!.body as { startDate: string };
    expect(cuerpo.startDate).toBe('2026-11-02');
  });

  it('una fecha elegida a mano se manda tal cual', async () => {
    await crearCohorte('Nueva', '2026-12-05').catch(() => undefined);
    expect((mockApiFetch.mock.calls[0][1]!.body as { startDate: string }).startDate).toBe('2026-12-05');
  });
});
