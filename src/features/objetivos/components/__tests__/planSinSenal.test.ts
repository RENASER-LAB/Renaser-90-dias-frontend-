import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Spec 048, #182: sin señal y sin lecturas guardadas, «Esta semana» y «Acciones que mueven la meta» dicen que no hay señal (color suave,
 * sin alerta) en vez de «No se pudo conectar con el servidor» en rojo, y no ofrecen «Arma tu semana» ni dicen «Primero arma tu semana»
 * cuando en realidad no se sabe qué hay. Un error de verdad (500) sigue en rojo. Los hooks de lectura se reemplazan.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: () => undefined }));
jest.mock('../RecordatoriosDeLasAcciones', () => ({ RecordatoriosDeLasAcciones: () => null }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../../ochenta-veinte/api/ochentaVeinteApi', () => ({ obtenerOchentaVeinteDeLaPersona: () => new Promise(() => undefined) }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({ HojaDesdeAbajo: () => null }));
jest.mock('../PlanSemanalModal', () => ({ PlanSemanalModal: () => null }));
jest.mock('../AgendarAccionesModal', () => ({ AgendarAccionesModal: () => null }));
jest.mock('../RevisionSemanalModal', () => ({ RevisionSemanalModal: () => null }));

type Semanal = {
  estado: 'cargando' | 'bloqueada' | 'sin_planificar' | 'planificada' | 'cerrada';
  error: string | null;
  guardando: boolean;
  deEje: (eje: string) => null;
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

import { TEXTO_SIN_SENAL_AL_CARGAR } from '../../../sinRed/utils/sinSenal';
import { light } from '../../../../theme/tokens';
import { PlanDelEje } from '../PlanDelEje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const semanal = (estado: Semanal['estado'], error: string | null): Semanal => ({
  estado, error, guardando: false, planificar: jest.fn(), cerrar: jest.fn(), deEje: () => null,
});
const diaria = (error: string | null) => ({
  hoy: [], manana: [], agendadas: [], hoyDelServidor: null, objetivo: { fecha: '2026-11-11', esManana: true, yaPlanificado: false },
  cargando: false, error, guardando: false, planificar: jest.fn(), recargar: jest.fn(),
});

let raiz: ReactTestRenderer | null = null;
function montar(maestras: unknown[] = [1, 2, 3]) {
  mockLlamadas = 0;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(PlanDelEje, { maestras: maestras as never, numeroSemana: 2, diaPrograma: 8, ejeAbierto: 'CUERPO', objetivoSugeridoDe: () => '' }),
    );
  });
}
const textosConColor = (): { texto: string; color: unknown; rol: unknown }[] =>
  raiz!.root
    .findAll((x: ReactTestInstance) => (x.type as unknown) === 'Text')
    .map(x => ({
      texto: React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''),
      color: StyleSheet.flatten(x.props.style)?.color,
      rol: x.props.accessibilityRole,
    }));
const todo = () => textosConColor().map(x => x.texto).join(' | ');

beforeEach(() => {
  mockSemanal = semanal('sin_planificar', null);
  mockQueEmpieza = semanal('cargando', null);
  mockDiaria = diaria(null);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Plan sin señal y sin lecturas guardadas (#182)', () => {
  it('«Esta semana» y «Acciones que mueven la meta» dicen que no hay señal, en el color suave y sin alerta, no en rojo', () => { // spec 048 FR-004
    mockSemanal = semanal('sin_planificar', TEXTO_SIN_SENAL_AL_CARGAR);
    mockDiaria = diaria(TEXTO_SIN_SENAL_AL_CARGAR);
    montar();
    const sinSenal = textosConColor().filter(x => x.texto === TEXTO_SIN_SENAL_AL_CARGAR);
    expect(sinSenal).toHaveLength(2);
    for (const x of sinSenal) {
      expect(x.color).toBe(light.textSoft);
      expect(x.rol).toBeUndefined();
    }
    expect(todo()).not.toContain('No se pudo conectar');
  });

  it('no ofrece «Arma tu semana» ni dice «Primero arma tu semana»: sin la lectura no se sabe si hay semana ni acciones', () => { // spec 048 FR-004
    mockSemanal = semanal('sin_planificar', TEXTO_SIN_SENAL_AL_CARGAR);
    mockDiaria = diaria(TEXTO_SIN_SENAL_AL_CARGAR);
    montar();
    const t = todo();
    expect(t).not.toContain('Todavía no armaste esta semana');
    expect(t).not.toContain('Arma tu semana');
    expect(t).not.toContain('Primero arma tu semana');
    expect(t).not.toContain('Todavía no agendaste');
  });

  it('con la semana bloqueada por falta de objetivos no repite «sin señal»: ya se dijo qué falta', () => { // spec 048 FR-004
    mockSemanal = semanal('bloqueada', TEXTO_SIN_SENAL_AL_CARGAR);
    mockDiaria = diaria(null);
    montar([]);
    const t = todo();
    expect(t).toContain('Primero define tus tres objetivos');
    expect(t).not.toContain(TEXTO_SIN_SENAL_AL_CARGAR);
  });

  it('un error de verdad sigue en rojo y como alerta', () => { // spec 048 FR-004
    mockSemanal = semanal('sin_planificar', 'No pudimos cargar tu plan de la semana.');
    mockDiaria = diaria('No pudimos cargar tus acciones del día.');
    montar();
    const errores = textosConColor().filter(x => x.texto.startsWith('No pudimos cargar'));
    expect(errores).toHaveLength(2);
    for (const x of errores) {
      expect(x.color).toBe(light.danger);
      expect(x.rol).toBe('alert');
    }
  });

  it('con las lecturas guardadas (sin error) todo sigue como siempre', () => { // spec 048 FR-004
    mockSemanal = semanal('sin_planificar', null);
    montar();
    const t = todo();
    expect(t).toContain('Todavía no armaste esta semana');
    expect(t).not.toContain(TEXTO_SIN_SENAL_AL_CARGAR);
  });
});
