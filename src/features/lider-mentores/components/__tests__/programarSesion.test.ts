import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { SIN_OPCIONES } from '../../../eventos/api/audienciaSchemas';
import type { OpcionesDeAudiencia } from '../../../eventos/types/audiencia.types';
import type { AudienciaDelFormulario } from '../../../eventos/utils/audienciaDelFormulario';
import { formularioVacio, type FormularioDeEvento } from '../../../eventos/utils/formularioDeEvento';
import { montar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';

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
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'lider-1', role: 'MENTOR_LEAD' } }) }));

let mockOpciones: { sabido: boolean; opciones: OpcionesDeAudiencia } = { sabido: true, opciones: SIN_OPCIONES };
jest.mock('../../../eventos/hooks/useOpcionesDeAudiencia', () => ({ useOpcionesDeAudiencia: () => mockOpciones }));
const mockCrear = jest.fn<(cuerpo: Record<string, unknown>, formation?: string | null) => Promise<{ id: string; iniciaEn?: string; zona?: string | null }>>();
jest.mock('../../../eventos/api/eventosApi', () => ({ crearEvento: (...a: [Record<string, unknown>, string | null | undefined]) => mockCrear(...a) }));
jest.mock('../../../eventos/utils/portadaDelEvento', () => ({ subirPortada: jest.fn(), elegirPortada: async () => null }));

/* El formulario se prueba en su propio archivo (eventos): acá se comprueba lo que la hoja le pasa y lo que hace con lo que devuelve. */
type PropsDelFormulario = {
  inicial: FormularioDeEvento;
  error: string | null;
  guardando: boolean;
  audienciaPrevia?: Partial<AudienciaDelFormulario>;
  sinCabecera?: boolean;
  onGuardar: (form: FormularioDeEvento, portada: null, audiencia: AudienciaDelFormulario | null) => void;
};
let formulario: PropsDelFormulario | null = null;
jest.mock('../../../eventos/components/FormularioDelEvento', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FormularioDelEvento: (p: PropsDelFormulario) => {
      formulario = p;
      return R.createElement(Text, null, `FORMULARIO${p.error ? ` · ${p.error}` : ''}`);
    },
  };
});

import { HojaProgramarSesion } from '../HojaProgramarSesion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const delLider: OpcionesDeAudiencia = { ...SIN_OPCIONES, puedeCrear: true, partes: ['PERSON', 'GROUP', 'MENTORS'], tiposDeEvento: ['SESION_PERSONALIZADA'], todos: false };
const MENTOR = { id: 'm-1', nombre: 'E2E Mentor' };
const alCerrar = jest.fn();
const alProgramar = jest.fn();
const hoja = (extra: object = {}) => React.createElement(HojaProgramarSesion, { visible: true, alCerrar, mentor: MENTOR, onProgramada: alProgramar, ...extra } as never);

/** Un formulario válido: lejos en el futuro (la regla «más adelante que ahora» no depende del reloj de quien corre la prueba), con Meet automático. */
const form = (): FormularioDeEvento => ({ ...formularioVacio(Date.now(), 'America/Lima'), titulo: 'Sesión personalizada · E2E Mentor', fecha: '2099-01-01', tipoEvento: 'SESION_PERSONALIZADA' });
const audienciaConElMentor = (): AudienciaDelFormulario => ({
  todos: false,
  personas: [{ id: 'm-1', nombre: 'E2E Mentor', fotoUrl: null, rol: 'Mentor', grupo: null }],
  misAlumnos: false,
  mentores: false,
  grupos: [],
  colores: [],
  personal: [],
  todoElPersonal: false,
  recalcular: false,
});

beforeEach(() => {
  mockOpciones = { sabido: true, opciones: delLider };
  formulario = null;
  mockCrear.mockReset().mockResolvedValue({ id: 'e-1' });
  alCerrar.mockReset();
  alProgramar.mockReset();
});

describe('«Programar sesión» desde la ficha de un mentor', () => {
  it('abre el formulario de Eventos con ese mentor ya elegido como audiencia y sin su cabecera propia', async () => { // spec 056 FR-033
    const r = await montar(hoja());
    expect(todoElTexto(r)).toContain('HOJA: Programar sesión');
    expect(todoElTexto(r)).toContain('FORMULARIO');
    expect(formulario?.audienciaPrevia?.personas).toEqual([{ id: 'm-1', nombre: 'E2E Mentor', fotoUrl: null, rol: 'Mentor', grupo: null }]);
    expect(formulario?.sinCabecera).toBe(true);
  });

  it('espera a saber qué puede elegir esta cuenta antes de armar el formulario (la audiencia previa se toma al montarse)', async () => { // spec 056 FR-033
    mockOpciones = { sabido: false, opciones: SIN_OPCIONES };
    const r = await montar(hoja());
    expect(formulario).toBeNull();
    expect(todoElTexto(r)).toContain('Preparando la sesión');
  });

  it('si el servidor no deja crear sesiones a esta cuenta lo dice en una línea', async () => { // spec 056 FR-042
    mockOpciones = { sabido: true, opciones: { ...delLider, puedeCrear: false, partes: [] } };
    const r = await montar(hoja());
    expect(formulario).toBeNull();
    expect(todoElTexto(r)).toContain('Tu cuenta no puede programar sesiones.');
  });

  it('al guardar crea la sesión como cualquier sesión de Eventos, avisa que quedó programada y cierra la hoja', async () => { // spec 056 FR-034
    await montar(hoja());
    await act(async () => formulario!.onGuardar(form(), null, audienciaConElMentor()));
    expect(mockCrear).toHaveBeenCalledTimes(1);
    const cuerpo = mockCrear.mock.calls[0][0];
    expect(cuerpo.title ?? cuerpo.titulo).toBeTruthy();
    expect(alProgramar).toHaveBeenCalledTimes(1);
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('le dice a quien abrió la hoja cuándo quedó la sesión: lo que confirmó el servidor, y si no lo trae, lo que se mandó', async () => { // spec 056 FR-034
    mockCrear.mockResolvedValueOnce({ id: 'e-1', iniciaEn: '2099-01-01T20:00:00.000Z', zona: 'America/Lima' });
    await montar(hoja());
    await act(async () => formulario!.onGuardar(form(), null, audienciaConElMentor()));
    expect(alProgramar).toHaveBeenLastCalledWith({ iniciaEn: '2099-01-01T20:00:00.000Z', zona: 'America/Lima' });

    alProgramar.mockReset();
    mockCrear.mockResolvedValueOnce({ id: 'e-2' });
    await act(async () => formulario!.onGuardar(form(), null, audienciaConElMentor()));
    const mandado = mockCrear.mock.calls[1][0];
    expect(alProgramar).toHaveBeenLastCalledWith({ iniciaEn: mandado.startsAt, zona: mandado.timezone });
  });

  it('un toque, un pedido: dos guardados seguidos crean una sola sesión', async () => { // spec 056 FR-034
    let soltar!: () => void;
    mockCrear.mockImplementation(() => new Promise(res => { soltar = () => res({ id: 'e-1' }); }));
    await montar(hoja());
    await act(async () => {
      formulario!.onGuardar(form(), null, audienciaConElMentor());
      formulario!.onGuardar(form(), null, audienciaConElMentor());
    });
    expect(mockCrear).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('sin elegir a nadie no se crea nada y el formulario dice qué falta', async () => { // spec 056 FR-033
    const r = await montar(hoja());
    await act(async () => formulario!.onGuardar(form(), null, { ...audienciaConElMentor(), personas: [] }));
    expect(mockCrear).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('Elige para quién es el evento.');
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it('si el servidor lo rechaza, la hoja sigue abierta y dice el motivo', async () => { // spec 056 FR-042
    mockCrear.mockRejectedValueOnce(new ApiError(403, 'No puedes invitar a esa persona.', { codigo: 'FUERA_DE_TU_ALCANCE' }));
    const r = await montar(hoja());
    await act(async () => formulario!.onGuardar(form(), null, audienciaConElMentor()));
    expect(todoElTexto(r)).toContain('Hay personas que no puedes invitar.');
    expect(alCerrar).not.toHaveBeenCalled();
    expect(alProgramar).not.toHaveBeenCalled();
  });
});
