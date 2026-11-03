/**
 * `usePrioridadPrincipal` (spec 026): la prioridad y la primera acción salen del DIAGNÓSTICO de la persona, no del Mapa. Sin
 * diagnóstico, con un servidor anterior (404) o sin red, no hay prioridad ni sugerencia y nada se ve como error.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { ResumenDeMiDiagnostico } from '../../../diagnostico/types/diagnostico.types';

const mockResumen = jest.fn<() => Promise<ResumenDeMiDiagnostico>>();
jest.mock('../../../diagnostico/api/diagnosticoApi', () => ({ obtenerResumenDeMiDiagnostico: () => mockResumen() }));
// `useFocusEffect` corre al montar (y, en la app, cada vez que la pestaña recupera el foco).
const mockFocos: (() => (() => void) | void)[] = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => (() => void) | void) => {
    const R = jest.requireActual<typeof import('react')>('react');
    R.useEffect(() => {
      mockFocos.push(efecto);
      return efecto();
    }, [efecto]);
  },
}));

import { usePrioridadPrincipal, type PrioridadYPrimeraAccion } from '../usePrioridadPrincipal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultima: PrioridadYPrimeraAccion;
function Sonda() {
  ultima = usePrioridadPrincipal();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

const resumen = (extra: Partial<ResumenDeMiDiagnostico> = {}): ResumenDeMiDiagnostico => ({
  completado: true, prioridad: 'TRABAJO', primeraAccion: 'El lunes revisaré mis ventas', objetivos: [], ...extra,
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockResumen.mockReset();
  mockFocos.length = 0;
});

describe('usePrioridadPrincipal', () => {
  it('con el diagnóstico terminado entrega la prioridad y la primera acción', async () => {
    mockResumen.mockResolvedValue(resumen());
    await montar();
    expect(ultima).toEqual({ ejePrincipal: 'TRABAJO', primeraAccion: 'El lunes revisaré mis ventas', cargando: false });
  });

  it('mientras llega está cargando y todavía no hay prioridad', async () => {
    let responder: (r: ResumenDeMiDiagnostico) => void = () => undefined;
    mockResumen.mockReturnValue(new Promise(r => { responder = r; }));
    await montar();
    expect(ultima).toEqual({ ejePrincipal: null, primeraAccion: null, cargando: true });
    await act(async () => responder(resumen({ prioridad: 'CUERPO', primeraAccion: null })));
    expect(ultima).toEqual({ ejePrincipal: 'CUERPO', primeraAccion: null, cargando: false });
  });

  it('sin diagnóstico terminado (`completado: false`) el orden es el de siempre y no hay sugerencia', async () => {
    mockResumen.mockResolvedValue(resumen({ completado: false, prioridad: null, primeraAccion: null }));
    await montar();
    expect(ultima).toEqual({ ejePrincipal: null, primeraAccion: null, cargando: false });
  });

  it('un servidor anterior (404) o sin red: sin prioridad, sin sugerencia y sin romper', async () => {
    mockResumen.mockRejectedValue(new Error('404'));
    await montar();
    expect(ultima).toEqual({ ejePrincipal: null, primeraAccion: null, cargando: false });
  });

  it('un fallo al volver al foco no borra lo que ya se había leído', async () => {
    mockResumen.mockResolvedValueOnce(resumen());
    await montar();
    mockResumen.mockRejectedValue(new Error('sin red'));
    await act(async () => {
      mockFocos[mockFocos.length - 1]();
    });
    expect(ultima.ejePrincipal).toBe('TRABAJO');
    expect(ultima.primeraAccion).toBe('El lunes revisaré mis ventas');
  });

  it('al volver al foco relee: la prioridad pudo nacer al terminar el diagnóstico en otra pestaña', async () => {
    mockResumen.mockResolvedValueOnce(resumen({ completado: false, prioridad: null, primeraAccion: null }));
    await montar();
    expect(ultima.ejePrincipal).toBeNull();
    mockResumen.mockResolvedValue(resumen({ prioridad: 'RELACIONES' }));
    await act(async () => {
      mockFocos[mockFocos.length - 1]();
    });
    expect(ultima.ejePrincipal).toBe('RELACIONES');
  });
});
