import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * Desde la ficha de una persona, el líder le avisa a su mentor o le escribe a ella (spec 005, US3):
 *
 * - «Escribirle» abre el 1 a 1 y NO envía nada (FR-015).
 * - «Avisar a su mentor» deja la observación de siempre con la persona y la semana (FR-014), con el nombre al
 *   principio del mensaje del chat; no aparece si el grupo no tiene mentor.
 * - Al volver de escribir, la ficha sigue donde estaba: misma semana, sin releerse (ni otra consulta).
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
/* Spec 012: la ficha suma el Código Renaser de la persona (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
/* Spec 015: la ficha suma su tiempo libre de la semana (su propia lectura y su `Aparicion`); estas pruebas son de otra cosa. */
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: () => null }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../academy/components/LeccionVideoPlayer', () => ({ LeccionVideoPlayer: () => null }));
jest.mock('../../components/ReproductorDeAudio', () => ({ ReproductorDeAudio: () => null }));
/* Sin los 4 s de espera de la confirmación: acá importa QUÉ dice. */
jest.mock('../../../../components/ConfirmacionEnLinea', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ConfirmacionEnLinea: ({ texto }: { texto: string }) => R.createElement(Text, null, `AVISO: ${texto}`) };
});
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), seleccion: () => undefined } }));
const mockAvisar = jest.fn<(titulo: string, mensaje?: string) => void>();
jest.mock('../../../admin/utils/dialogo', () => ({ avisar: (t: string, m?: string) => mockAvisar(t, m) }));

const mockSemana = jest.fn<(grupoId: string, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerTablaDelLider: jest.fn(),
}));
const mockRegistrar = jest.fn<(mentorId: string, nueva: Record<string, unknown>) => Promise<unknown>>();
jest.mock('../../api/liderMentoresApi', () => ({
  registrarObservacion: (id: string, nueva: Record<string, unknown>) => mockRegistrar(id, nueva),
}));
const mockEscribirleA = jest.fn<(id: string, nombre: string) => Promise<void>>();
const mockEnviarPorChat = jest.fn<(id: string, texto: string) => Promise<string | null>>();
jest.mock('../../utils/irAlChat', () => ({
  escribirleA: (id: string, nombre: string) => mockEscribirleA(id, nombre),
  enviarPorChat: (id: string, texto: string) => mockEnviarPorChat(id, texto),
}));

import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function semana(cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  return {
    grupoId: 'g1',
    personaId: 'u1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    rol: 'TRAINEE',
    desde: '2026-10-12',
    hasta: '2026-10-18',
    zona: 'America/Lima',
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-08-29',
    mentor: { id: 'm1', nombre: 'Luisa' },
    resumen: null,
    color: 'AMARILLO',
    etiqueta: null,
    noSeMide: false,
    porcentaje: 74.5,
    dias: [],
    ...cambios,
  };
}

async function montar(datos: SemanaDePersona, personaId = 'u1'): Promise<ReactTestRenderer> {
  mockSemana.mockResolvedValue(datos);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(PersonaDelLiderScreen, {
        grupoId: 'g1',
        grupoNombre: 'Fénix',
        personaId,
        nombre: 'Ana Pérez',
        avatarUrl: null,
        onVolver: () => undefined,
      }),
    );
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

function tocables(r: ReactTestRenderer): ReactTestInstance[] {
  const todos = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
  return todos.filter(n => !todos.includes((n as unknown as { parent: never }).parent));
}

async function tocar(r: ReactTestRenderer, parte: string): Promise<void> {
  const nodo = tocables(r).find(n => (n.props.accessibilityLabel as string).includes(parte));
  if (!nodo) throw new Error(`No hay nada tocable que diga «${parte}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  await act(async () => {
    nodo.props.onPress();
  });
}

async function escribir(r: ReactTestRenderer, texto: string): Promise<void> {
  const campo = r.root.findAll(n => typeof n.props.onChangeText === 'function' && n.props.multiline === true)[0];
  await act(async () => {
    campo.props.onChangeText(texto);
  });
}

beforeEach(() => {
  mockSemana.mockReset();
  mockRegistrar.mockReset();
  mockEscribirleA.mockReset().mockResolvedValue(undefined);
  mockEnviarPorChat.mockReset();
  mockAvisar.mockReset();
  mockLogro.mockReset();
});

describe('«Escribirle»', () => {
  it('abre el 1 a 1 con la persona y no envía ni registra nada', async () => {
    const r = await montar(semana());
    await tocar(r, 'Escribirle a Ana Pérez');
    expect(mockEscribirleA).toHaveBeenCalledWith('u1', 'Ana Pérez');
    expect(mockEnviarPorChat).not.toHaveBeenCalled();
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('está aunque la semana no cargue: poder escribirle no depende de los datos', async () => {
    mockSemana.mockRejectedValue(new Error('caído'));
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(PersonaDelLiderScreen, {
          grupoId: 'g1', grupoNombre: 'Fénix', personaId: 'u1', nombre: 'Ana Pérez', avatarUrl: null, onVolver: () => undefined,
        }),
      );
    });
    expect(textos(r)).toContain('Reintentar');
    await tocar(r, 'Escribirle a Ana Pérez');
    expect(mockEscribirleA).toHaveBeenCalledWith('u1', 'Ana Pérez');
  });
});

describe('«Avisar a su mentor»', () => {
  it('no aparece si el grupo no tiene mentor', async () => {
    const r = await montar(semana({ mentor: null }));
    expect(tocables(r).some(n => (n.props.accessibilityLabel as string).includes('Avisar a su mentor'))).toBe(false);
    expect(textos(r)).toContain('Escribirle');
  });

  it('tampoco cuando la persona es el propio mentor del grupo: no se avisa a alguien sobre sí mismo', async () => {
    const r = await montar(semana({ personaId: 'm1', mentor: { id: 'm1', nombre: 'Luisa' } }), 'm1');
    expect(tocables(r).some(n => (n.props.accessibilityLabel as string).includes('Avisar a su mentor'))).toBe(false);
  });

  it('abre la observación al mentor, sobre la persona', async () => {
    const r = await montar(semana());
    await tocar(r, 'Avisar a su mentor sobre Ana Pérez');
    expect(textos(r)).toContain('Sobre Ana Pérez');
    expect(textos(r)).toContain('Reconocer');
    expect(textos(r)).toContain('Sugerir');
    expect(textos(r)).toContain('Alertar');
  });

  it('guarda con la persona y la semana, y manda por el chat un mensaje que empieza con su nombre', async () => {
    mockEnviarPorChat.mockResolvedValue('msg-1');
    mockRegistrar.mockResolvedValue({});
    const r = await montar(semana());
    await tocar(r, 'Avisar a su mentor sobre Ana Pérez');

    // Elige «Alertar», escribe y marca «Enviárselo también por el chat».
    const segmentado = r.root.findAll(n => typeof n.props.onCambiar === 'function')[0];
    await act(async () => {
      segmentado.props.onCambiar('ALERTA');
    });
    await escribir(r, 'Ana lleva tres días sin el ritual de la mañana.');
    await tocar(r, 'Enviárselo también por el chat');
    await tocar(r, 'Guardar');

    expect(mockEnviarPorChat).toHaveBeenCalledWith(
      'm1',
      'Ana Pérez · semana del lunes 12 al domingo 18 de octubre\nAna lleva tres días sin el ritual de la mañana.',
    );
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    const [mentorId, nueva] = mockRegistrar.mock.calls[0];
    expect(mentorId).toBe('m1');
    expect(nueva).toMatchObject({
      tipo: 'ALERTA',
      texto: 'Ana lleva tres días sin el ritual de la mañana.',
      mensajeId: 'msg-1',
      sobre: { personaId: 'u1', semanaDesde: '2026-10-12' },
    });
  });

  it('al guardar vuelve a la ficha en la misma ventana, con el aviso y sin volver a pedirla', async () => {
    mockRegistrar.mockResolvedValue({});
    const r = await montar(semana());
    expect(mockSemana).toHaveBeenCalledTimes(1);
    await tocar(r, 'Avisar a su mentor sobre Ana Pérez');
    await escribir(r, 'Buen trabajo esta semana.');
    await tocar(r, 'Guardar');
    expect(textos(r)).toContain('AVISO: Observación guardada.');
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Últimos 7 días');
    expect(mockSemana).toHaveBeenCalledTimes(1);
    expect(mockEnviarPorChat).not.toHaveBeenCalled();
  });

  it('si no se escribe nada, no guarda', async () => {
    const r = await montar(semana());
    await tocar(r, 'Avisar a su mentor sobre Ana Pérez');
    await tocar(r, 'Guardar');
    expect(mockRegistrar).not.toHaveBeenCalled();
  });
});
