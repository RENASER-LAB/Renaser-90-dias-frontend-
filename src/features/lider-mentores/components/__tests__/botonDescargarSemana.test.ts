import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { altoDelToque, hayTocable, montar, tocar, tocable, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});

const mockDescargar = jest.fn<(semanaHasta?: string | null) => Promise<void>>();
let mockDescargando = false;
const mockUsar = jest.fn<(d: unknown) => void>();
jest.mock('../../hooks/useDescargarSemana', () => ({
  useDescargarSemana: (d: unknown) => {
    mockUsar(d);
    return { descargando: mockDescargando, descargar: mockDescargar };
  },
}));

import { BotonDescargarSemana } from '../BotonDescargarSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockDescargar.mockReset().mockResolvedValue();
  mockUsar.mockReset();
  mockDescargando = false;
});

describe('el botón «Descargar semana»', () => {
  it('es un botón visible de al menos 48 de alto que dice «Descargar semana»', async () => { // spec 056 FR-047, FR-044
    const r = await montar(React.createElement(BotonDescargarSemana, { documento: { tipo: 'APRENDIZ', personaId: 'p1' } }));
    expect(todoElTexto(r)).toContain('Descargar semana');
    expect(altoDelToque(tocable(r, 'Descargar semana'))).toBeGreaterThanOrEqual(48);
  });

  it('pide el documento de la persona y, al tocarlo, descarga la semana que se le pasó', async () => { // spec 056 FR-047
    const r = await montar(React.createElement(BotonDescargarSemana, { documento: { tipo: 'APRENDIZ', personaId: 'p1' }, semanaHasta: '2026-11-13' }));
    expect(mockUsar).toHaveBeenCalledWith({ tipo: 'APRENDIZ', personaId: 'p1' });
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledWith('2026-11-13');
  });

  it('sin semana elegida pide la que está en curso (sin fecha)', async () => { // spec 056 FR-039
    const r = await montar(React.createElement(BotonDescargarSemana, { documento: { tipo: 'APRENDIZ', personaId: 'p1' } }));
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledWith(null);
  });

  it('mientras el documento viaja queda apagado: no se puede tocar otra vez', async () => { // spec 056 FR-047
    mockDescargando = true;
    const r = await montar(React.createElement(BotonDescargarSemana, { documento: { tipo: 'APRENDIZ', personaId: 'p1' } }));
    expect(hayTocable(r, 'Descargar semana')).toBe(true);
    const nodo = tocable(r, 'Descargar semana');
    expect(nodo.props.disabled).toBe(true);
    expect(nodo.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});
