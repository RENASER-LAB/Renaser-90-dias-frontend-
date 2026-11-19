import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { hayTocable, montar, tocables, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { PropsDeFichaDePersona } from '../../../mentor/components/FichaDePersona';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
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
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: jest.fn(), error: jest.fn(), seleccion: jest.fn() } }));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

/* La ficha compartida se prueba en la 055 y en la de A1: acá solo importa con qué origen se monta y qué botones le pone el líder. */
let ultimasProps: PropsDeFichaDePersona | null = null;
jest.mock('../../../mentor/components/FichaDePersona', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FichaDePersona: (props: PropsDeFichaDePersona) => {
      ultimasProps = props;
      const pie = typeof props.pie === 'function' ? props.pie({ semanaHasta: '2026-11-13' }) : props.pie;
      return R.createElement(View, { testID: 'ficha-de-persona' }, pie);
    },
  };
});
const mockDescargar = jest.fn<(semanaHasta?: string | null) => Promise<void>>();
const mockUsarDescarga = jest.fn<(d: unknown) => void>();
jest.mock('../../hooks/useDescargarSemana', () => ({
  useDescargarSemana: (d: unknown) => {
    mockUsarDescarga(d);
    return { descargando: false, descargar: mockDescargar };
  },
}));
const mockAvisar = jest.fn<(p: string, texto: string, clave: string) => Promise<void>>();
jest.mock('../../api/accionesDelLiderApi', () => ({ avisarAlMentor: (...a: [string, string, string]) => mockAvisar(...a), recordarConsulta: jest.fn() }));

import { FichaDelAprendizDelLider } from '../FichaDelAprendizDelLider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alVolver = jest.fn();
const ficha = (extra: object = {}) =>
  React.createElement(FichaDelAprendizDelLider, { personaId: 'p-1', nombre: 'E2E Aprendiz', grupoId: 'g-1', mentorNombre: 'E2E Mentor', onVolver: alVolver, ...extra } as never);

/** El botón de la hoja dice exactamente «Avisar»; el de la ficha, «Avisar a su mentor sobre …». */
const botonAvisar = (r: Awaited<ReturnType<typeof montar>>) => {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === 'Avisar');
  if (!nodo) throw new Error('No hay botón «Avisar» a la vista');
  return nodo;
};
const tocarAvisar = async (r: Awaited<ReturnType<typeof montar>>) => {
  await act(async () => botonAvisar(r).props.onPress());
};

function campo(r: Awaited<ReturnType<typeof montar>>) {
  return r.root.findAll(n => n.props.accessibilityLabel === 'Mensaje para su mentor' && typeof n.props.onChangeText === 'function')[0];
}

beforeEach(() => {
  ultimasProps = null;
  mockAvisar.mockReset().mockResolvedValue();
  mockDescargar.mockReset().mockResolvedValue();
  mockAlerta.mockReset();
});

describe('la ficha del aprendiz que abre el líder', () => {
  it('es la ficha de la 055 con origen líder, con el grupo desde el que se abrió', async () => { // spec 056 FR-014
    await montar(ficha());
    expect(ultimasProps?.origen).toEqual({ quien: 'lider', grupoId: 'g-1' });
    expect(ultimasProps?.alumno.participanteId).toBe('p-1');
    expect(ultimasProps?.alumno.nombre).toBe('E2E Aprendiz');
  });

  it('un aprendiz que no está en ningún grupo se abre igual, con origen líder y sin grupo', async () => { // spec 056 FR-017
    await montar(ficha({ grupoId: null, mentorNombre: null }));
    expect(ultimasProps?.origen).toEqual({ quien: 'lider', grupoId: null });
  });

  it('al pie tiene «Descargar semana» del documento del aprendiz, de la semana que se está viendo', async () => { // spec 056 FR-020
    const r = await montar(ficha());
    expect(mockUsarDescarga).toHaveBeenCalledWith({ tipo: 'APRENDIZ', personaId: 'p-1' });
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledWith('2026-11-13');
  });
});

describe('«Avisar a su mentor»', () => {
  it('sin mentor el botón no se muestra', async () => { // spec 056 FR-019
    const r = await montar(ficha({ mentorNombre: null }));
    expect(hayTocable(r, 'Avisar a su mentor')).toBe(false);
    expect(hayTocable(r, 'Descargar semana')).toBe(true);
  });

  it('abre una hoja con un mensaje sugerido que se puede editar, dirigida al mentor y sobre la persona', async () => { // spec 056 FR-019
    const r = await montar(ficha());
    await tocar(r, 'Avisar a su mentor');
    const texto = todoElTexto(r);
    expect(texto).toContain('HOJA: Avisar a E2E Mentor');
    expect(texto).toContain('Sobre E2E Aprendiz');
    expect(campo(r).props.value).toBe('E2E Aprendiz necesita tu apoyo esta semana. ¿Le escribes hoy?');
  });

  it('al enviar manda el texto (el editado) al servidor con una clave de operación, cierra la hoja y lo confirma', async () => { // spec 056 FR-019
    const r = await montar(ficha());
    await tocar(r, 'Avisar a su mentor');
    await act(async () => campo(r).props.onChangeText('Escríbele hoy, por favor.'));
    await tocarAvisar(r);
    expect(mockAvisar).toHaveBeenCalledTimes(1);
    expect(mockAvisar.mock.calls[0][0]).toBe('p-1');
    expect(mockAvisar.mock.calls[0][1]).toBe('Escríbele hoy, por favor.');
    expect(mockAvisar.mock.calls[0][2]).toMatch(/^avisar-/);
    expect(todoElTexto(r)).not.toContain('HOJA: Avisar a E2E Mentor');
    expect(todoElTexto(r)).toContain('Le avisaste a E2E Mentor.');
  });

  it('un toque, un pedido: dos toques seguidos mandan un solo aviso', async () => { // spec 056 FR-019
    let soltar!: () => void;
    mockAvisar.mockImplementation(() => new Promise<void>(res => { soltar = res; }));
    const r = await montar(ficha());
    await tocar(r, 'Avisar a su mentor');
    await act(async () => {
      botonAvisar(r).props.onPress();
      botonAvisar(r).props.onPress();
    });
    expect(mockAvisar).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si el servidor lo rechaza dice su motivo, la hoja sigue abierta con lo escrito y el reintento usa la misma clave', async () => { // spec 056 FR-019
    mockAvisar.mockRejectedValueOnce(new ApiError(409, 'Esta persona no tiene mentor.', { codigo: 'SIN_MENTOR', message: 'Esta persona no tiene mentor.' }));
    const r = await montar(ficha());
    await tocar(r, 'Avisar a su mentor');
    await tocarAvisar(r);
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo avisar', 'Esta persona no tiene mentor.');
    expect(todoElTexto(r)).toContain('HOJA: Avisar a E2E Mentor');
    expect(campo(r).props.value).toContain('necesita tu apoyo');
    await tocarAvisar(r);
    expect(mockAvisar).toHaveBeenCalledTimes(2);
    expect(mockAvisar.mock.calls[1][2]).toBe(mockAvisar.mock.calls[0][2]);
  });

  it('con el texto vacío no envía y dice qué falta', async () => { // spec 056 FR-019
    const r = await montar(ficha());
    await tocar(r, 'Avisar a su mentor');
    await act(async () => campo(r).props.onChangeText('   '));
    await tocarAvisar(r);
    expect(mockAvisar).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('Escribe lo que quieres decir.');
  });
});
