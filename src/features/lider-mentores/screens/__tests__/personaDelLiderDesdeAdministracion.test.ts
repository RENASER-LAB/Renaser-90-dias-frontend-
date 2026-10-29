import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * La vista de una persona cuando la abre Administración o Alquimista (2026-10-27): es la del líder, con dos props
 * opcionales que solo cambian lo que dice la pantalla.
 *
 * - `avisoSiNoSeAbre`: si el servidor no abre a la persona (404: grupo sin mentor, programa sin empezar), se dice por
 *   qué en lugar del «todavía no está disponible» genérico. Los otros fallos siguen como siempre.
 * - `alAbrirFicha`: un botón «Ver su ficha».
 * - Sin ninguna de las dos, la pantalla es la del líder. «Escribirle» y «Avisar a su mentor» no dependen del rol: el
 *   servidor deja registrar la observación a MENTOR_LEAD, ADMIN y ALCHEMIST.
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
jest.mock('../../../../components/ConfirmacionEnLinea', () => ({ ConfirmacionEnLinea: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => undefined, seleccion: () => undefined } }));
jest.mock('../../../admin/utils/dialogo', () => ({ avisar: jest.fn() }));
jest.mock('../../utils/irAlChat', () => ({ escribirleA: jest.fn(), enviarPorChat: jest.fn() }));
jest.mock('../../api/liderMentoresApi', () => ({ registrarObservacion: jest.fn() }));

const mockSemana = jest.fn<(grupoId: string, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerTablaDelLider: jest.fn(),
}));

import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AVISO = 'No se pueden mostrar sus días desde acá: su grupo todavía no tiene mentor.';

function semana(): SemanaDePersona {
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
  };
}

async function montar(extra: { avisoSiNoSeAbre?: string; alAbrirFicha?: () => void } = {}): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(PersonaDelLiderScreen, {
        grupoId: 'g1',
        grupoNombre: 'Fénix',
        personaId: 'u1',
        nombre: 'Ana Pérez',
        avatarUrl: null,
        onVolver: () => undefined,
        ...extra,
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

function hay(r: ReactTestRenderer, parte: string): boolean {
  return tocables(r).some(n => (n.props.accessibilityLabel as string).includes(parte));
}

beforeEach(() => {
  mockSemana.mockReset();
});

describe('cuando el servidor no abre a la persona (404)', () => {
  it('Administración lee por qué, no el «todavía no está disponible» que promete que aparecerá solo', async () => {
    mockSemana.mockRejectedValue(new ApiError(404, 'Grupo no encontrado'));
    const r = await montar({ avisoSiNoSeAbre: AVISO });

    expect(textos(r)).toContain(AVISO);
    expect(textos(r)).not.toContain('todavía no está disponible');
    // Escribirle sigue ahí, y el botón de volver del marco: no se queda sin salida.
    expect(hay(r, 'Escribirle a Ana Pérez')).toBe(true);
  });

  it('un fallo de red sigue siendo un fallo de red, con «Reintentar» (el aviso es solo del 404)', async () => {
    mockSemana.mockRejectedValue(new ApiError(0, 'sin red'));
    const r = await montar({ avisoSiNoSeAbre: AVISO });

    expect(textos(r)).not.toContain(AVISO);
    expect(textos(r)).toContain('No pudimos conectar');
    expect(textos(r)).toContain('Reintentar');
  });

  it('sin el aviso (el líder), el 404 dice lo de siempre', async () => {
    mockSemana.mockRejectedValue(new ApiError(404, 'Grupo no encontrado'));
    const r = await montar();

    expect(textos(r)).toContain('todavía no está disponible');
  });
});

describe('«Ver su ficha»', () => {
  it('aparece solo cuando quien la abre tiene otra vista de la persona, y la abre', async () => {
    mockSemana.mockResolvedValue(semana());
    const abrir = jest.fn();
    const r = await montar({ alAbrirFicha: abrir });

    const boton = tocables(r).find(n => (n.props.accessibilityLabel as string) === 'Ver la ficha de Ana Pérez');
    expect(boton).toBeDefined();
    await act(async () => {
      boton!.props.onPress();
    });
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('el recorrido del líder no cambia: no hay botón a ninguna ficha', async () => {
    mockSemana.mockResolvedValue(semana());
    const r = await montar();

    expect(hay(r, 'Ver la ficha')).toBe(false);
    expect(textos(r)).not.toContain('Ver su ficha');
    // Y lo suyo sigue igual.
    expect(hay(r, 'Escribirle a Ana Pérez')).toBe(true);
    expect(hay(r, 'Avisar a su mentor sobre Ana Pérez')).toBe(true);
  });

  it('«Avisar a su mentor» está también con la ficha de administración: el servidor deja a ADMIN y ALCHEMIST', async () => {
    mockSemana.mockResolvedValue(semana());
    const r = await montar({ alAbrirFicha: () => undefined });

    expect(hay(r, 'Avisar a su mentor sobre Ana Pérez')).toBe(true);
  });
});
