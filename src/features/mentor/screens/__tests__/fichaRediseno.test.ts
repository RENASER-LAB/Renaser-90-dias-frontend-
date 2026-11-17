import { readFileSync } from 'fs';
import { join } from 'path';

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { ScrollView } from 'react-native';
import { act } from 'react-test-renderer';

import { light } from '../../../../theme/tokens';
import type { ObligacionDeLaPersona, PilarDelHabito } from '../../../lider-mentores/types/cumplimientoDelLider.types';
import type { SemanaDelAprendiz } from '../../api/mentorApi';
import { altoDelToque, estiloDe, hayTocable, montar, porTestID, porTipo, tocable, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';
import { alumnoDesdeLaInfo } from '../../utils/alumnoDesdeLaInfo';

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
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));

/* Las secciones del final se prueban en sus propios archivos: acá solo se comprueba que están, y después de los hábitos. */
function mockMarcador(nombre: string) {
  const R = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return () => R.createElement(Text, null, `SECCION ${nombre}`);
}
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: mockMarcador('caja') }));
jest.mock('../../components/CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: mockMarcador('Código Renaser') }));
jest.mock('../../../diagnostico/components/SeccionDelDiagnosticoDeLaPersona', () => ({ SeccionDelDiagnosticoDeLaPersona: mockMarcador('Diagnóstico') }));
jest.mock('../../../ochenta-veinte/components/OchentaVeinteDeLaFicha', () => ({ OchentaVeinteDeLaFicha: mockMarcador('80/20 de SER') }));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: mockMarcador('Tiempo libre') }));
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: mockMarcador('Cierres') }));
jest.mock('../../components/HojaDeNotas', () => ({ HojaDeNotas: () => null }));
jest.mock('../../../lider-mentores/components/EvidenciaDeObligacion', () => ({ EvidenciaDeObligacion: () => null }));
jest.mock('../../../pasos/components/LineaDeLaMedicion', () => ({ LineaDeLaMedicionCruda: () => null }));

const HOY = '2026-11-17';
const VIERNES = '2026-11-20';
const DIA_UNO = '2026-11-10';
const SABADO = '2026-11-14';

const obligacion = (registroId: string, titulo: string, estado: string, pilar: PilarDelHabito): ObligacionDeLaPersona => ({
  registroId,
  titulo,
  estado,
  requiereEvidencia: false,
  entrega: null,
  entregadaEn: null,
  revision: null,
  evidenciaId: null,
  respuestaTexto: null,
  evidencias: [],
  publicacionId: null,
  pilar,
  medicion: null,
});

const semana = (extra: Partial<SemanaDelAprendiz> = {}): SemanaDelAprendiz =>
  ({
    grupoId: 'g-7',
    personaId: 'a-1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    zona: 'America/Lima',
    desde: SABADO,
    hasta: VIERNES,
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-11-07',
    diaUno: DIA_UNO,
    color: 'ROJO',
    etiqueta: null,
    porcentaje: 40,
    dias: [
      { fecha: '2026-11-16', diaDePrograma: 7, motivo: null, obligaciones: [obligacion('l1', 'Lectura del lunes', 'COMPLETADO', 'MENTE')], acciones: [] },
      {
        fecha: HOY,
        diaDePrograma: 8,
        motivo: null,
        obligaciones: [
          obligacion('c1', 'Caminata de la mañana', 'COMPLETADO', 'CUERPO'),
          obligacion('c2', 'Estiramientos', 'EXPIRADO', 'CUERPO'),
          obligacion('m1', 'Meditación guiada', 'PENDIENTE', 'MENTE'),
          obligacion('m2', 'Diario de gratitud', 'PENDIENTE', 'MENTE'),
          obligacion('e1', 'Oración', 'COMPLETADO', 'ESPIRITU'),
        ],
        acciones: [],
      },
    ],
    ...extra,
  }) as unknown as SemanaDelAprendiz;

/* ── Los hooks de datos, controlados desde la prueba ── */
let mockMapaDeSemanas: Record<string, SemanaDelAprendiz> = {};
let mockEnCurso: SemanaDelAprendiz | null = null;
let mockFalloDeLaPrimera: { tipo: string; mensaje: string } | null = null;
const mockPedirFecha = jest.fn<(f: string) => void>();
const mockUsarSemanas = jest.fn<(g: string | null, u: string | null, cb?: (m: string) => void) => void>();
jest.mock('../../hooks/useSemanasDelAprendiz', () => ({
  useSemanasDelAprendiz: (g: string | null, u: string | null, cb?: (m: string) => void) => {
    mockUsarSemanas(g, u, cb);
    return {
      semanaEnCurso: mockEnCurso,
      semanaDe: (v: string | null) => (v ? mockMapaDeSemanas[v] ?? null : null),
      estadoDe: (v: string) => (mockMapaDeSemanas[v] ? 'lista' : 'sin_pedir'),
      falloDe: () => null,
      falloDeLaPrimera: mockFalloDeLaPrimera,
      cargandoLaPrimera: false,
      pedirFecha: mockPedirFecha,
      reintentar: () => undefined,
      reintentarLaPrimera: () => undefined,
    };
  },
}));
let mockColoresPorDia: Record<string, 'VERDE' | 'AMARILLO' | 'ROJO'> = {};
jest.mock('../../hooks/useDiasDelMes', () => ({
  useDiasDelMes: () => ({ asegurarMes: () => undefined, diaDe: (f: string) => (mockColoresPorDia[f] ? { fecha: f, color: mockColoresPorDia[f] } : null), diaUnoDeLosDias: null }),
}));
let mockMotivoDelAviso: string | null = null;
jest.mock('../../hooks/useAvisosDelAprendiz', () => ({ useAvisosDelAprendiz: () => ({ motivoDelAviso: mockMotivoDelAviso }) }));
let mockHayNotas = false;
jest.mock('../../hooks/useNotasDelAprendiz', () => ({
  useNotasDelAprendiz: () => ({ notas: [], hayNotas: mockHayNotas, cargando: false, fallo: null, guardando: false, falloAlGuardar: null, guardar: async () => true, corregir: async () => true }),
}));

import { AlumnoScreen } from '../AlumnoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const volver = jest.fn();
const yaNoAcompana = jest.fn<(m: string) => void>();
const alumno = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-7', null);
const montarFicha = () => montar(React.createElement(AlumnoScreen, { alumno, grupoId: 'g-7', onVolver: volver, onYaNoAcompana: yaNoAcompana }));

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-17T15:00:00Z')); // martes 17 de noviembre, mediodía en Lima
  mockEnCurso = semana();
  mockMapaDeSemanas = { [VIERNES]: mockEnCurso, '2026-11-13': semana({ desde: '2026-11-07', hasta: '2026-11-13', semanaEnCurso: false, dias: [{ fecha: '2026-11-11', diaDePrograma: 2, motivo: null, obligaciones: [obligacion('o1', 'Hábito de la semana pasada', 'COMPLETADO', 'EMOCIONES')], acciones: [] }] } as never) };
  mockFalloDeLaPrimera = null;
  mockColoresPorDia = { '2026-11-14': 'ROJO', '2026-11-15': 'VERDE', '2026-11-16': 'VERDE', [HOY]: 'AMARILLO' };
  mockMotivoDelAviso = null;
  mockHayNotas = false;
  mockPedirFecha.mockReset();
  mockUsarSemanas.mockReset();
  mockAlerta.mockReset();
  volver.mockReset();
  yaNoAcompana.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('la ficha del aprendiz rediseñada', () => {
  it('arriba: foto con el borde de su color, nombre, «Día N · motivo», lápiz y chat', async () => { // spec 055 FR-010
    const r = await montarFicha();
    const texto = todoElTexto(r);
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('Día 8 · Cumplió 2 de 7 días');
    expect(estiloDe(porTestID(r, 'anillo-del-avatar')[0]).borderColor).toBe(light.danger);
    expect(hayTocable(r, 'Notas sobre Ana Pérez')).toBe(true);
    expect(hayTocable(r, 'Escribirle a Ana Pérez')).toBe(true);
  });

  it('si hay un aviso vigente, el motivo de la cabecera es ese aviso', async () => { // spec 055 FR-010
    mockMotivoDelAviso = 'no registra actividad hace 3 días';
    const r = await montarFicha();
    expect(todoElTexto(r)).toContain('Día 8 · no registra actividad hace 3 días');
  });

  it('la semana son 7 círculos de sábado a viernes, con el color de cada día y hoy elegido', async () => { // spec 055 FR-011, FR-012
    const r = await montarFicha();
    const dias = r.root.findAll(n => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function');
    const fechas = Array.from(new Set(dias.map(n => n.props.accessibilityLabel as string)));
    expect(fechas).toHaveLength(7);
    expect(fechas[0]).toMatch(/^Sábado 14 de noviembre/);
    expect(fechas[6]).toMatch(/^Viernes 20 de noviembre/);
    expect(estiloDe(porTestID(r, 'circulo-2026-11-14')[0]).backgroundColor).toBe(light.danger);
    expect(estiloDe(porTestID(r, 'circulo-2026-11-15')[0]).backgroundColor).toBe(light.success);
    expect(dias.find(n => (n.props.accessibilityLabel as string).startsWith('Martes 17'))?.props.accessibilityState.selected).toBe(true);
    /* Los días de adelante, fuera del programa, van sin color y no se eligen. */
    expect(dias.find(n => (n.props.accessibilityLabel as string).startsWith('Jueves 19'))?.props.accessibilityState.disabled).toBe(true);
    expect(estiloDe(porTestID(r, 'circulo-2026-11-19')[0]).backgroundColor).toBe('transparent');
  });

  it('tocar un día cambia los hábitos de abajo sin salir de la ficha, y pide esa semana', async () => { // spec 055 FR-013
    const r = await montarFicha();
    expect(todoElTexto(r)).toContain('Martes 17 de noviembre');
    await tocar(r, 'Lunes 16 de noviembre');
    expect(mockPedirFecha).toHaveBeenCalledWith('2026-11-16');
    expect(todoElTexto(r)).toContain('Lunes 16 de noviembre');
    expect(todoElTexto(r)).toContain('1 de 1');
    expect(volver).not.toHaveBeenCalled();
  });

  it('los hábitos van por pilar con «N de M»; abre el primero con pendientes o vencidos y los demás quedan cerrados con puntitos', async () => { // spec 055 FR-013
    const r = await montarFicha();
    const texto = todoElTexto(r);
    expect(texto).toContain('2 de 5'); // el día
    expect(texto).toContain('Caminata de la mañana'); // Cuerpo, abierto (tiene un vencido)
    expect(texto).toContain('Estiramientos');
    expect(texto).not.toContain('Meditación guiada'); // Mente, cerrado
    expect(texto).toContain('0 de 2');
    expect(texto).toContain('1 de 1'); // Espíritu, cerrado
    expect(porTestID(r, 'puntito-del-pilar')).toHaveLength(3); // 2 de Mente + 1 de Espíritu
    await tocar(r, 'Mente');
    expect(todoElTexto(r)).toContain('Meditación guiada');
  });

  it('cada hábito muestra su estado: cumplido, vencido o pendiente', async () => { // spec 055 FR-014
    const r = await montarFicha();
    await tocar(r, 'Mente');
    const ids = porTestID(r, /^estado-/).map(n => n.props.testID);
    expect(ids).toEqual(expect.arrayContaining(['estado-cumplido', 'estado-vencido', 'estado-pendiente']));
  });

  it('«<Mes> ⌄» despliega el mes en el mismo lugar con el color de cada día; no deja ir antes del Día 1 ni a días ni meses futuros', async () => { // spec 055 FR-015
    const r = await montarFicha();
    expect(porTestID(r, 'dia-2026-11-15')).toHaveLength(0);
    await tocar(r, 'Noviembre, ver el mes');
    expect(estiloDe(porTestID(r, 'dia-2026-11-15')[0]).backgroundColor).toBe(light.successWash);
    const enabled = (fecha: string) => !tocable(r, fechaEnPalabras(fecha)).props.accessibilityState.disabled;
    expect(enabled('2026-11-10')).toBe(true); // el Día 1
    expect(enabled('2026-11-09')).toBe(false); // antes del Día 1
    expect(enabled('2026-11-17')).toBe(true); // hoy
    expect(enabled('2026-11-18')).toBe(false); // futuro
    /* El Día 1 y hoy están en noviembre: no hay mes anterior ni siguiente. */
    expect(tocable(r, 'Mes anterior').props.accessibilityState.disabled).toBe(true);
    expect(tocable(r, 'Mes siguiente').props.accessibilityState.disabled).toBe(true);
  });

  it('elegir un día del mes cambia los hábitos a ese día; «Ver solo la semana» lo pliega', async () => { // spec 055 FR-015
    const r = await montarFicha();
    await tocar(r, 'Noviembre, ver el mes');
    await tocar(r, fechaEnPalabras('2026-11-11'));
    expect(mockPedirFecha).toHaveBeenCalledWith('2026-11-11');
    expect(todoElTexto(r)).toContain('Miércoles 11 de noviembre');
    await tocar(r, 'Ver solo la semana');
    expect(porTestID(r, 'dia-2026-11-15')).toHaveLength(0);
  });

  it('un aprendiz que todavía no empezó el programa lo dice y no ofrece hábitos ni días con color', async () => { // spec 055 FR-012, FR-017
    mockEnCurso = semana({ diaUno: null, color: 'SIN_DATOS', dias: [] } as never);
    mockMapaDeSemanas = { [VIERNES]: mockEnCurso };
    const r = await montarFicha();
    const texto = todoElTexto(r);
    expect(texto).toContain('Todavía no empieza su programa');
    expect(texto).toContain('todavía no empieza su programa.');
    expect(texto).not.toContain('Caminata de la mañana');
    expect(r.root.findAll(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityState?.disabled === false)).toHaveLength(0);
  });

  it('si la primera lectura falla, lo dice con su motivo y deja reintentar (sin hueco en blanco)', async () => { // spec 055 FR-016
    mockEnCurso = null;
    mockMapaDeSemanas = {};
    mockFalloDeLaPrimera = { tipo: 'sin_red', mensaje: 'Hace falta conexión para ver esta semana.' };
    const r = await montarFicha();
    expect(todoElTexto(r)).toContain('Hace falta conexión para ver esta semana.');
    expect(hayTocable(r, 'Reintentar')).toBe(true);
  });

  it('si el servidor dice que ya no lo acompaña, la ficha lo avisa con su motivo para volver a «Mis grupos»', async () => { // spec 055 FR-017
    await montarFicha();
    const avisar = mockUsarSemanas.mock.calls[0][2] as (m: string) => void;
    avisar('Ya no acompañas a este aprendiz.');
    expect(yaNoAcompana).toHaveBeenCalledWith('Ya no acompañas a este aprendiz.');
  });

  it('al final están los accesos de siempre, después de los hábitos', async () => { // spec 055 FR-018
    const r = await montarFicha();
    const texto = todoElTexto(r);
    const posicion = (s: string) => texto.indexOf(s);
    for (const seccion of ['Código Renaser', 'Diagnóstico', '80/20 de SER', 'Tiempo libre']) {
      expect(posicion(`SECCION ${seccion}`)).toBeGreaterThan(posicion('Caminata de la mañana'));
    }
  });

  it('un solo scroll, y cada toque mide al menos 48 de alto', async () => { // spec 055 FR-029
    const r = await montarFicha();
    expect(porTipo(r, ScrollView)).toHaveLength(1);
    for (const parte of ['Notas sobre', 'Escribirle a', 'Noviembre, ver el mes', 'Martes 17']) {
      expect(altoDelToque(tocable(r, parte))).toBeGreaterThanOrEqual(48);
    }
  });

  it('la ficha ya no trae el detalle día por día ni la lista larga de horarios', () => { // spec 055 FR-018
    const fuente = readFileSync(join(__dirname, '..', 'AlumnoScreen.tsx'), 'utf8');
    expect(fuente).not.toMatch(/RejillaSemanal|HabitosDelAlumno|useSemanaDelAlumno|Detalle de hábitos/);
  });
});

/** «Martes 17 de noviembre» para buscar un día del mes por su etiqueta. */
function fechaEnPalabras(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number);
  const nombre = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(Date.UTC(2026, m - 1, d)).getUTCDay()];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${d} de noviembre`;
}
