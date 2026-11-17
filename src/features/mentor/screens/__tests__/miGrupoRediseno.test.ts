import { readFileSync } from 'fs';
import { join } from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { light } from '../../../../theme/tokens';
import type { AprendizDelSemaforo } from '../../../semaforo/types/semaforo.types';
import { altoDelToque, estiloDe, montar, porTestID, tocable, tocar, textos, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';
import type { VistaCelula } from '../../hooks/useCelulaQueAcompano';
import { conEstado } from '../../reglas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../components/Aparicion', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Aparicion: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});
jest.mock('../../components/HojaDeMiEvaluacion', () => ({ HojaDeMiEvaluacion: () => null }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));

const mockIrAPestana = jest.fn<(p: string, params?: object) => boolean>().mockReturnValue(true);
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: (p: string, params?: object) => mockIrAPestana(p, params) }));
const mockAbrirChat = jest.fn<(id: string) => Promise<{ id: string }>>();
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: (id: string) => mockAbrirChat(id) }));

const fila = (id: string, nombre: string, color: AprendizDelSemaforo['color'], porcentaje: number | null): AprendizDelSemaforo => ({
  aprendizId: id,
  nombre,
  avatarUrl: null,
  porcentaje,
  color,
  etiqueta: null,
  diasConDatos: null,
  dias: [],
});
let mockAprendices: AprendizDelSemaforo[] = [];
let mockAvisos: Array<{ id: number; body: string; createdAt: string; readAt: null; route: string }> = [];
jest.mock('../../../semaforo/hooks/useLecturaPorSemana', () => ({
  useSemaforoDelGrupo: () => ({ datos: { aprendices: mockAprendices, resumen: { total: mockAprendices.length } }, cargando: false, fallo: null, posicion: { modo: 'vigente' }, recargar: () => undefined }),
}));
jest.mock('../../hooks/useAvisosDeAcompanamiento', () => ({ useAvisosDeAcompanamiento: () => ({ avisos: mockAvisos, disponible: mockAvisos.length > 0, marcarLeido: () => undefined }) }));
jest.mock('../../hooks/useEvaluacionPropia', () => ({
  useEvaluacionPropia: () => ({ evaluacion: { porcentaje: 72, estado: 'CALCULADA', entregadas: 1, esperadas: 2, alumnosEvaluados: 3, verificadas: 0 }, disponible: true }),
}));

import { MiCelulaScreen } from '../MiCelulaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alumnoDe = (id: string, nombre: string) =>
  conEstado({ participanteId: id, nombre, diaPrograma: null, ultimaActividadEn: null, habitosProgramados: null, habitosCumplidos: null, evidenciasPendientes: null });
const alumnos = [alumnoDe('u-ana', 'Ana'), alumnoDe('u-beto', 'Beto'), alumnoDe('u-carla', 'Carla'), alumnoDe('u-zoe', 'Zoe')];
const vista = {
  todos: alumnos,
  resumen: { total: alumnos.length },
  celula: { id: 'g-1', nombre: 'Fénix', cobertura: 'con_mentor', cohorteId: 'c-1' },
  grupos: [{ id: 'g-1', nombre: 'Fénix' }],
} as unknown as VistaCelula;

const abrirAlumno = jest.fn<(a: unknown) => void>();
const props = () => ({ onSalir: () => undefined, onAbrirAlumno: abrirAlumno, vista, cargando: false, fallo: null, detalle: null, recargar: () => undefined });

beforeEach(() => {
  mockAprendices = [
    fila('u-zoe', 'Zoe', 'SIN_DATOS', null),
    fila('u-ana', 'Ana', 'VERDE', 92),
    fila('u-beto', 'Beto', 'ROJO', 20),
    fila('u-carla', 'Carla', 'AMARILLO', 65),
  ];
  mockAvisos = [];
  abrirAlumno.mockReset();
  mockAbrirChat.mockReset().mockResolvedValue({ id: 'conv-1' });
  mockIrAPestana.mockClear();
});

describe('«Mi grupo» rediseñado', () => {
  it('muestra a TODOS en una tarjeta: rojo, ámbar, verde y sin datos, con el color en el borde de la foto', async () => { // spec 055 FR-004, FR-005
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const orden = r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Abrir la ficha de') && typeof n.props.onPress === 'function');
    expect(Array.from(new Set(orden.map(n => n.props.accessibilityLabel)))).toEqual([
      'Abrir la ficha de Beto',
      'Abrir la ficha de Carla',
      'Abrir la ficha de Ana',
      'Abrir la ficha de Zoe',
    ]);
    const anillos = porTestID(r, 'anillo-del-avatar').map(n => estiloDe(n).borderColor);
    expect(anillos).toEqual([light.danger, light.gold, light.success, light.divider]);
  });

  it('el nombre va en el color de texto normal, no coloreado', async () => { // spec 055 FR-005
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const nombre = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.children === 'Beto')[0];
    expect(estiloDe(nombre).color).toBe(light.text);
  });

  it('debajo del nombre, una línea gris con el aviso vigente o, si no hay, el estado de la semana', async () => { // spec 055 FR-006
    mockAvisos = [{ id: 1, body: 'no registra actividad hace 12 días', createdAt: '2026-11-13T10:00:00Z', readAt: null, route: '/mentor/groups/g-1/learners/u-beto' }];
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const lineas = textos(r);
    expect(lineas).toContain('12 días sin actividad');
    expect(lineas).toContain('Al día');
    expect(lineas).toContain('Todavía sin datos');
  });

  it('el ícono de chat abre la conversación con ESA persona, una sola vez aunque se toque dos veces', async () => { // spec 055 FR-007, SC-002
    let resolver!: (v: { id: string }) => void;
    mockAbrirChat.mockImplementation(() => new Promise(r => (resolver = r)));
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const chat = tocable(r, 'Escribirle a Beto');
    await act(async () => {
      chat.props.onPress();
      chat.props.onPress();
    });
    expect(mockAbrirChat).toHaveBeenCalledTimes(1);
    expect(mockAbrirChat).toHaveBeenCalledWith('u-beto');
    await act(async () => resolver({ id: 'conv-9' }));
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: 'conv-9', abrirChatTitulo: 'Beto' });
  });

  it('tocar el resto de la fila abre la ficha de esa persona; el chat no la abre', async () => { // spec 055 FR-007
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    await tocar(r, 'Abrir la ficha de Carla');
    expect(abrirAlumno).toHaveBeenCalledTimes(1);
    expect((abrirAlumno.mock.calls[0][0] as { participanteId: string }).participanteId).toBe('u-carla');
    expect(mockAbrirChat).not.toHaveBeenCalled();
  });

  it('no hay lista de avisos arriba, ni conteos por color, ni insignia del rol; abajo, el enlace a «Mi evaluación · N %»', async () => { // spec 055 FR-008
    mockAvisos = [{ id: 1, body: 'aviso que antes iba arriba', createdAt: '2026-11-13T10:00:00Z', readAt: null, route: '/mentor/groups/g-1/learners/u-beto' }];
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const texto = todoElTexto(r);
    expect(texto).not.toMatch(/mockAvisos? sin leer|Necesitan tu ayuda|MENTOR|GUÍA/i);
    expect(texto).not.toMatch(/\b\d+ (en rojo|en verde|en amarillo|al día)\b/i);
    expect(texto).toContain('Mi evaluación · 72 %');
    expect(texto).toContain('4 aprendices');
  });

  it('los rojos de un grupo van todos arriba y caben en la primera pantalla de un teléfono de 1080 × 2400 (hasta 6 en rojo)', async () => { // spec 055 SC-001
    mockAprendices = [
      ...['Ana', 'Beto', 'Carla', 'Dani', 'Eva', 'Fito'].map((n, i) => fila(`u-${n}`, n, 'ROJO', 10 + i)),
      fila('u-gus', 'Gus', 'VERDE', 95),
      fila('u-zoe', 'Zoe', 'SIN_DATOS', null),
    ];
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    const etiquetas = Array.from(new Set(r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Abrir la ficha de')).map(n => n.props.accessibilityLabel as string)));
    expect(etiquetas.slice(0, 6)).toEqual(['Ana', 'Beto', 'Carla', 'Dani', 'Eva', 'Fito'].map(n => `Abrir la ficha de ${n}`));
    /* Alto de las seis filas (mínimo de cada una) más la barra y el título: 1080 × 2400 a ~2,6 de densidad son ~920 dp de alto. */
    const filas = r.root.findAll(n => typeof n.type === 'string' && estiloDe(n).minHeight === 64);
    expect(filas.length).toBeGreaterThanOrEqual(6);
    expect(6 * 64 + 56 /* barra */ + 70 /* título */).toBeLessThan(920);
  });

  it('cada toque mide al menos 48 de alto', async () => { // spec 055 FR-029
    const r = await montar(React.createElement(MiCelulaScreen, props()));
    for (const etiqueta of ['Abrir la ficha de Beto', 'Escribirle a Beto', 'Mi evaluación']) {
      expect(altoDelToque(tocable(r, etiqueta))).toBeGreaterThanOrEqual(48);
    }
  });

  it('la pantalla ya no usa lo que se quitó (mockAvisos arriba, conteos, insignia) y usa lo reutilizado', () => { // spec 055 FR-008
    const fuente = readFileSync(join(__dirname, '..', 'MiCelulaScreen.tsx'), 'utf8');
    expect(fuente).not.toMatch(/tituloDeAvisos|insigniaDeQuienAcompana|SeccionSemaforoDelGrupo|CantidadesPorColor/);
    expect(fuente).toMatch(/useSemaforoDelGrupo/);
    expect(fuente).toMatch(/FilaDeAprendiz/);
  });
});
