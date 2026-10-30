import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { ObligacionDeLaPersona, SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * La ficha de una persona abre con dos respuestas (spec 018, US2): «¿Programó?» y «¿Subió evidencias?», en dos
 * tarjetas iguales arriba de sus días. Contra un servidor anterior la primera no existe y la ficha es la de antes; y la
 * ficha ya no repite en párrafos lo que se ve (spec 018, US3).
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
jest.mock('../../../mentor/components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: () => null }));
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
}));

import { PersonaDelLiderScreen } from '../PersonaDelLiderScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function obligacion(entrega: 'ENTREGADA' | 'SIN_ENTREGA', cambios: Partial<ObligacionDeLaPersona> = {}): ObligacionDeLaPersona {
  return {
    registroId: Math.random().toString(36),
    titulo: 'Ritual de la mañana',
    estado: 'COMPLETADO',
    requiereEvidencia: true,
    entrega,
    entregadaEn: null,
    revision: null,
    evidenciaId: null,
    respuestaTexto: null,
    evidencias: [],
    publicacionId: null,
    ...cambios,
  };
}

function semana(cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  return {
    grupoId: 'g1',
    personaId: 'u1',
    nombre: 'Ana Torres',
    avatarUrl: null,
    rol: 'TRAINEE',
    desde: '2026-10-12',
    hasta: '2026-10-18',
    zona: 'America/Lima',
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-08-29',
    mentor: { id: 'm1', nombre: 'Luisa' },
    resumen: { obligaciones: 5, cumplidas: 3, conEntrega: 3, pendientes: 1, sinCumplir: 1 },
    color: 'ROJO',
    etiqueta: 'Con problemas',
    noSeMide: false,
    porcentaje: 38,
    dias: [
      {
        fecha: '2026-10-17',
        diaDePrograma: 49,
        motivo: null,
        obligaciones: [obligacion('ENTREGADA'), obligacion('ENTREGADA'), obligacion('SIN_ENTREGA'), obligacion('SIN_ENTREGA', { requiereEvidencia: false })],
        acciones: [],
      },
    ],
    programacion: { habitosConHora: 5, habitosTotal: 17, accionesConHora: 0, accionesTotal: 2, programo: false },
    ...cambios,
  };
}

async function montar(datos: SemanaDePersona): Promise<ReactTestRenderer> {
  mockSemana.mockResolvedValue(datos);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(PersonaDelLiderScreen, {
        grupoId: 'g1',
        grupoNombre: 'Grupo Octubre',
        personaId: 'u1',
        nombre: 'Ana Torres',
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

function dichos(r: ReactTestRenderer): string[] {
  return r.root
    .findAll(n => n.props.accessible === true && typeof n.props.accessibilityLabel === 'string')
    .map(n => n.props.accessibilityLabel as string);
}

beforeEach(() => {
  mockSemana.mockReset();
});

describe('las dos respuestas de arriba', () => {
  it('«¿Programó?» dice Sí o No con sus hábitos con hora y sus acciones agendadas; «¿Subió evidencias?» dice «2 de 3»', async () => {
    const t = textos(await montar(semana()));
    expect(t).toContain('¿Programó?');
    expect(t).toContain('No');
    expect(t).toContain('5 de 17 hábitos con su hora · 0 de 2 acciones agendadas');
    expect(t).toContain('¿Subió evidencias?');
    expect(t).toContain('2 de 3');
    expect(t).toContain('Estos 7 días');
  });

  it('con «Sí» lo dice, y las dos tarjetas se leen completas para quien no las ve', async () => {
    const r = await montar(semana({ programacion: { habitosConHora: 12, habitosTotal: 17, accionesConHora: 2, accionesTotal: 2, programo: true } }));
    expect(textos(r)).toContain('Sí');
    expect(dichos(r)).toContain('¿Programó? Sí. 12 de 17 hábitos con su hora · 2 de 2 acciones agendadas.');
    expect(dichos(r)).toContain('¿Subió evidencias? 2 de 3. Estos 7 días.');
  });

  it('van ARRIBA de los días: antes de la navegación de la semana y de la primera fecha', async () => {
    const t = textos(await montar(semana()));
    expect(t.indexOf('¿Programó?')).toBeLessThan(t.indexOf('Últimos 7 días'));
    expect(t.indexOf('¿Subió evidencias?')).toBeLessThan(t.indexOf('Sábado 17'));
  });

  it('contra un servidor anterior (sin `programacion`) no hay tarjeta de «¿Programó?» y la ficha es la de siempre', async () => {
    const t = textos(await montar(semana({ programacion: null })));
    expect(t).not.toContain('¿Programó?');
    expect(t).toContain('¿Subió evidencias?');
    expect(t).toContain('Ritual de la mañana');
  });

  it('sin ninguna de las dos no deja un hueco ni un «0 de 0»', async () => {
    const t = textos(await montar(semana({ programacion: null, dias: [] })));
    expect(t).not.toContain('¿Programó?');
    expect(t).not.toContain('¿Subió evidencias?');
    expect(t).not.toContain('0 de 0');
  });

  it('mientras la semana carga no hay tarjetas inventadas', async () => {
    mockSemana.mockReturnValue(new Promise(() => undefined));
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(PersonaDelLiderScreen, {
          grupoId: 'g1',
          grupoNombre: 'Grupo Octubre',
          personaId: 'u1',
          nombre: 'Ana Torres',
          avatarUrl: null,
          onVolver: () => undefined,
        }),
      );
    });
    expect(textos(r)).not.toContain('¿Programó?');
    expect(textos(r)).toContain('Cargando la semana…');
  });
});

describe('menos texto en la ficha', () => {
  it('ya no explica qué hace «Avisar a su mentor»: el botón lo dice, y sigue ahí', async () => {
    const r = await montar(semana());
    expect(textos(r)).toContain('Avisar a su mentor');
    expect(textos(r)).not.toContain('una observación sobre');
  });

  it('el resumen de la semana no repite la evidencia: esa cifra es la de la tarjeta', async () => {
    const t = textos(await montar(semana()));
    expect(t).toContain('3 cumplidos · 1 sin cumplir · 1 pendientes');
    expect(t).not.toContain('con evidencia');
  });

  it('quien no se mide dice su rol y «No se mide en el semáforo» una vez, sin el párrafo de que no hay días', async () => {
    const t = textos(
      await montar(semana({ rol: 'MENTOR', noSeMide: true, color: 'SIN_DATOS', dias: [], resumen: null, porcentaje: 88.2, mentor: null })),
    );
    expect(t).toContain('Mentor · No se mide en el semáforo');
    expect(t).not.toContain('lleva su propio programa');
    expect(t).not.toContain('No hay nada que mostrar');
  });
});
