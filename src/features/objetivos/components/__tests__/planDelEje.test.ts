import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La pantalla principal de Plan (2026-10-31, «en Plan replica este formato»): «Esta semana», «Acciones que mueven la meta»,
 * «Tu 80/20» y «Organizar mi semana ›», en sus estados: sin semana, sin acciones, con todo, el domingo y sin los tres objetivos de 90 días. Los hooks de
 * lectura se reemplazan; lo que se prueba es qué se dibuja y qué abre cada toque. El objetivo de 90 días y el selector de eje
 * son de `PlanScreen` (probados con `planRediseno` y `planSinMapa`).
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useFocusEffect: () => undefined }));
jest.mock('../../../mapa-renacimiento/hooks/useAccionesDelMapa', () => ({ useAccionesDelMapa: () => ({}) }));
// «Recordatorios de tus acciones ›» (fila + hoja) tiene su propia prueba; acá solo importa dónde y cuándo se dibuja.
const mockRecordatorios: { userId: string; rocas?: unknown }[] = [];
jest.mock('../RecordatoriosDeLasAcciones', () => ({
  RecordatoriosDeLasAcciones: (p: { userId: string; rocas?: unknown }) => {
    mockRecordatorios.push(p);
    return null;
  },
}));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));

type PropsDeHoja = { visible?: boolean; titulo?: string; children?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.children) : null) };
});
const mockModalesAbiertos: string[] = [];
jest.mock('../PlanSemanalModal', () => ({ PlanSemanalModal: (p: { visible: boolean }) => { if (p.visible) mockModalesAbiertos.push('asistente'); return null; } }));
jest.mock('../AgendarAccionesModal', () => ({ AgendarAccionesModal: (p: { visible: boolean }) => { if (p.visible) mockModalesAbiertos.push('agendar'); return null; } }));
jest.mock('../RevisionSemanalModal', () => ({ RevisionSemanalModal: (p: { visible: boolean }) => { if (p.visible) mockModalesAbiertos.push('revision'); return null; } }));

type Semanal = {
  estado: 'cargando' | 'bloqueada' | 'sin_planificar' | 'planificada' | 'cerrada';
  error: string | null;
  guardando: boolean;
  deEje: (eje: string) => { id: string; titulo: string; autoevaluacionFin: number | null } | null;
  planificar: jest.Mock;
  cerrar: jest.Mock;
};
let mockSemanal: Semanal;
let mockQueEmpieza: Semanal;
let mockLlamadas = 0;
jest.mock('../../hooks/useRocasSemanales', () => ({
  useRocasSemanales: () => (mockLlamadas++ % 2 === 0 ? mockSemanal : mockQueEmpieza),
}));
let mockDiaria: Record<string, unknown>;
jest.mock('../../hooks/useRocasDiarias', () => ({ useRocasDiarias: () => mockDiaria }));
let mockDiaDePrograma = 20;
jest.mock('../../utils/periodoDelPrograma', () => {
  const real = jest.requireActual<typeof import('../../utils/periodoDelPrograma')>('../../utils/periodoDelPrograma');
  return { ...real, semanaAPlanificar: () => (mockDiaDePrograma === -1 ? 4 : 3) };
});

import type { RocaDiariaApi } from '../../types/objetivos.types';
import { PlanDelEje } from '../PlanDelEje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let n = 0;
const accion = (extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi => {
  n += 1;
  return {
    id: `a${n}`, fecha: '2026-10-27', posicion: 1, titulo: `Acción ${n}`, descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
    eje: 'CUERPO', rocaSemanalId: 's1', horaInicio: '09:00:00', horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
    bloqueada: false, acciones: [], ...extra,
  };
};
const semanal = (estado: Semanal['estado'], titulo: string | null = null, extra: Partial<Semanal> = {}): Semanal => ({
  estado, error: null, guardando: false, planificar: jest.fn(), cerrar: jest.fn(),
  deEje: () => (titulo === null ? null : { id: 's1', titulo, autoevaluacionFin: null }),
  ...extra,
});
const diaria = (extra: Record<string, unknown> = {}) => ({
  hoy: [], manana: [], agendadas: [], hoyDelServidor: '2026-10-27', objetivo: { fecha: '2026-10-28', esManana: true, yaPlanificado: false },
  cargando: false, error: null, guardando: false, planificar: jest.fn(), recargar: jest.fn(), ...extra,
});

const alDefinirObjetivos = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar() {
  mockLlamadas = 0;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(PlanDelEje, { maestras: [], numeroSemana: 3, diaPrograma: mockDiaDePrograma, ejeAbierto: 'CUERPO', objetivoSugeridoDe: () => '', onDefinirObjetivos: alDefinirObjetivos }),
    );
  });
}
const textos = () =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const todo = () => textos().join(' | ');
const botones = (): ReactTestInstance[] =>
  raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View');
const botonCon = (texto: string) => botones().find(b => String(b.props.accessibilityLabel ?? '').includes(texto) || b.findAll(x => (x.type as unknown) === 'Text' && React.Children.toArray(x.props.children).join('').includes(texto)).length > 0);
const pulsar = (b: ReactTestInstance | undefined) => { if (!b) throw new Error('no hay ese botón'); act(() => b.props.onPress()); };

beforeEach(() => {
  mockDiaDePrograma = 20;
  mockModalesAbiertos.length = 0;
  mockRecordatorios.length = 0;
  mockNavigate.mockReset();
  alDefinirObjetivos.mockReset();
  mockSemanal = semanal('planificada', 'Caminar 5 días');
  mockQueEmpieza = semanal('cargando');
  mockDiaria = diaria();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('con todo: la semana, las acciones del eje, 80/20 y el botón', () => {
  beforeEach(() => {
    const hoy = [accion({ id: 'h1', titulo: 'Caminar 40 minutos', completada: true }), accion({ id: 'h2', titulo: 'Estirar', horaInicio: '18:30:00', bloqueada: true, posicion: 2, color: 'AMARILLA' })];
    const viene = [accion({ id: 'v1', titulo: 'Gimnasio', fecha: '2026-10-29', horaInicio: '07:00:00' }), accion({ id: 'o1', titulo: 'De otro eje', eje: 'TRABAJO' })];
    mockDiaria = diaria({ hoy, manana: [], agendadas: [...hoy, ...viene] });
    montar();
  });

  it('«Esta semana»: el objetivo semanal, «2 de 3» no, sino lo cumplido de hoy en adelante, y la barra', () => {
    const t = todo();
    expect(t).toContain('Esta semana · semana 3');
    expect(t).toContain('Caminar 5 días');
    expect(t).toContain('1 de 3');
    expect(t).toContain('acciones cumplidas, de hoy a fin de semana');
    expect(raiz!.root.findAll(x => x.props.accessibilityRole === 'progressbar').length).toBeGreaterThan(0);
  });

  it('«Acciones que mueven la meta»: solo las del eje, con «Mar 27 oct · 09:00» y su chevron', () => {
    const t = todo();
    expect(t).toContain('Acciones que mueven la meta');
    expect(t).toContain('Caminar 40 minutos');
    expect(t).toContain('Mar 27 oct · 09:00');
    expect(t).toContain('Jue 29 oct · 07:00');
    expect(t).not.toContain('De otro eje');
  });

  it('los recordatorios son UNA fila dentro de la tarjeta de acciones (con la hoja), no el bloque entero', () => {
    const t = todo();
    expect(mockRecordatorios.length).toBeGreaterThan(0);
    expect(mockRecordatorios[mockRecordatorios.length - 1].userId).toBe('u1');
    // El bloque viejo (rótulo «Recordatorios» y «Cómo suena» a la vista) ya no está en Plan.
    expect(t).not.toContain('Cómo suena');
    expect(t).not.toContain('Aviso antes de cada acción con hora');
  });

  it('tocar una de HOY lleva a Training con abrirAccionId; una que viene abre «Agendar»', () => {
    pulsar(botonCon('Caminar 40 minutos'));
    expect(mockNavigate).toHaveBeenCalledWith('Training', { abrirAccionId: 'h1' });
    expect(mockModalesAbiertos).toEqual([]);
    pulsar(botonCon('Gimnasio'));
    expect(mockModalesAbiertos).toContain('agendar');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('«Tu 80/20» abre la hoja con la regla de Pareto y las acciones de hoy con su estado', () => {
    expect(todo()).toContain('Prioriza lo que más acerca tu meta.');
    pulsar(botonCon('Tu 80/20'));
    const t = todo();
    expect(raiz!.root.findAll(x => x.props.accessibilityLabel === 'hoja Tu 80/20').length).toBeGreaterThan(0);
    expect(t).toContain('la acción verde va primero');
    expect(t).toContain('Se abre al completar la primera');
    expect(t).toContain('Verde');
    expect(t).toContain('Amarilla');
  });

  it('«Organizar mi semana ›» con el eje ya armado abre «Agendar»; sin objetivo en el eje abre el asistente', () => {
    pulsar(botonCon('Organizar mi semana'));
    expect(mockModalesAbiertos).toEqual(['agendar']);
  });

  it('«Cerrar este objetivo con mi revisión» abre la revisión de la semana', () => {
    pulsar(botonCon('Cerrar este objetivo con mi revisión'));
    expect(mockModalesAbiertos).toContain('revision');
  });
});

const semanalActual_sinPlan = () => { mockSemanal = semanal('sin_planificar'); };

describe('sin semana armada', () => {
  it('dice «Arma tu semana» con su botón, que abre el asistente', () => {
    mockSemanal = semanal('sin_planificar');
    montar();
    expect(todo()).toContain('Todavía no armaste esta semana');
    pulsar(botonCon('Arma tu semana'));
    expect(mockModalesAbiertos).toContain('asistente');
  });

  it('«Organizar mi semana ›» sin objetivo semanal en el eje también abre el asistente', () => {
    semanalActual_sinPlan();
    montar();
    pulsar(botonCon('Organizar mi semana'));
    expect(mockModalesAbiertos).toContain('asistente');
  });

  it('las acciones piden armar la semana primero', () => {
    mockSemanal = semanal('sin_planificar');
    montar();
    expect(todo()).toContain('Primero arma tu semana: de ahí salen tus acciones.');
    // Sin semana armada no hay recordatorios que ofrecer (como antes del cambio a la fila).
    expect(mockRecordatorios).toHaveLength(0);
  });

  it('sin los tres objetivos de 90 días (bloqueada): ofrece escribirlos, no armar ni nombrar el Mapa', () => {
    mockSemanal = semanal('bloqueada');
    montar();
    expect(todo()).toContain('Primero define tus tres objetivos de 90 días');
    expect(todo()).not.toContain('Mapa');
    expect(botonCon('Ir al Mapa')).toBeUndefined();
    pulsar(botonCon('Escribir mis objetivos'));
    expect(alDefinirObjetivos).toHaveBeenCalledTimes(1);
  });

  it('«Organizar mi semana» con la semana bloqueada también lleva a escribir los objetivos', () => {
    mockSemanal = semanal('bloqueada');
    montar();
    pulsar(botonCon('Organizar mi semana'));
    expect(alDefinirObjetivos).toHaveBeenCalledTimes(1);
    expect(mockModalesAbiertos).toEqual([]);
  });
});

describe('sin acciones', () => {
  it('con la semana armada: una línea y «Agendar mis acciones»', () => {
    montar();
    expect(todo()).toContain('Todavía no agendaste acciones de Cuerpo.');
    pulsar(botonCon('Agendar mis acciones'));
    expect(mockModalesAbiertos).toContain('agendar');
  });
});

describe('el domingo (se arma la semana que empieza)', () => {
  it('muestra la que empieza, con «Armar la semana que empieza»', () => {
    mockDiaDePrograma = -1;
    mockQueEmpieza = semanal('sin_planificar');
    montar();
    expect(todo()).toContain('La que empieza el lunes · semana 4');
    pulsar(botonCon('Armar la semana que empieza'));
    expect(mockModalesAbiertos).toContain('asistente');
  });
});

describe('errores de lectura', () => {
  it('se dicen en su tarjeta, sin tumbar la pantalla', () => {
    mockDiaria = diaria({ error: 'No pudimos cargar tus acciones del día.' });
    mockSemanal = semanal('planificada', 'Caminar 5 días', { error: 'No pudimos cargar tu plan de la semana.' });
    montar();
    expect(todo()).toContain('No pudimos cargar tus acciones del día.');
    expect(todo()).toContain('No pudimos cargar tu plan de la semana.');
  });
});
