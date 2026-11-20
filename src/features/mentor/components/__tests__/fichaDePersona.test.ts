import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Pressable, Text } from 'react-native';

import type { ObligacionDeLaPersona, PilarDelHabito } from '../../../lider-mentores/types/cumplimientoDelLider.types';
import type { SemanaDelAprendiz } from '../../api/mentorApi';
import { etiquetas, hayTocable, montar, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';
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
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: () => true }));
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: jest.fn() }));

/* Cada sección del final se vuelve una marca que guarda con qué `cargar` se montó: importa el origen de la ficha y el orden. */
const mockPropsDe: Record<string, Array<Record<string, unknown>>> = {};
function mockMarcador(nombre: string) {
  return (props: Record<string, unknown>) => {
    (mockPropsDe[nombre] ??= []).push(props);
    return jest.requireActual<typeof import('react')>('react').createElement(jest.requireActual<typeof import('react-native')>('react-native').Text, null, `SECCION ${nombre}`);
  };
}
jest.mock('../../../objetivos/components/ObjetivosDeLaFicha', () => ({ ObjetivosDeLaFicha: mockMarcador('Objetivos') }));
jest.mock('../../../caja/components/ChipDeCaja', () => ({ ChipDeCaja: mockMarcador('caja') }));
jest.mock('../CodigoRenaserDelAlumno', () => ({ CodigoRenaserDelAlumno: mockMarcador('Código Renaser') }));
jest.mock('../../../diagnostico/components/SeccionDelDiagnosticoDeLaPersona', () => ({ SeccionDelDiagnosticoDeLaPersona: mockMarcador('Diagnóstico') }));
jest.mock('../../../ochenta-veinte/components/OchentaVeinteDeLaFicha', () => ({ OchentaVeinteDeLaFicha: mockMarcador('80/20 de SER') }));
jest.mock('../../../huecos/components/TiempoLibreDeLaSemana', () => ({ TiempoLibreDeLaSemana: mockMarcador('Tiempo libre') }));
jest.mock('../../../cierre/components/CierresDelDia', () => ({ CierresDelDia: mockMarcador('Cierres') }));
jest.mock('../HojaDeNotas', () => ({ HojaDeNotas: mockMarcador('HojaDeNotas') }));
jest.mock('../../../lider-mentores/components/EvidenciaDeObligacion', () => ({ EvidenciaDeObligacion: () => null }));
jest.mock('../../../pasos/components/LineaDeLaMedicion', () => ({ LineaDeLaMedicionCruda: () => null }));

const HOY = '2026-11-17';
const VIERNES = '2026-11-20';
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
    grupoId: null,
    personaId: 'a-1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    zona: 'America/Lima',
    desde: SABADO,
    hasta: VIERNES,
    semanaEnCurso: true,
    cerrada: false,
    primeraSemana: '2026-11-07',
    diaUno: '2026-11-10',
    color: 'ROJO',
    etiqueta: null,
    porcentaje: 40,
    dias: [{ fecha: HOY, diaDePrograma: 8, motivo: null, obligaciones: [obligacion('c1', 'Caminata de la mañana', 'COMPLETADO', 'CUERPO')], acciones: [] }],
    ...extra,
  }) as unknown as SemanaDelAprendiz;

/* ── Los hooks de datos, controlados desde la prueba; guardan con qué los llamó la ficha ── */
let mockEnCurso: SemanaDelAprendiz | null = null;
let mockMapaDeSemanas: Record<string, SemanaDelAprendiz> = {};
const mockUsarSemanas = jest.fn<(fuente: unknown, persona: unknown) => void>();
jest.mock('../../hooks/useSemanasDelAprendiz', () => ({
  useSemanasDelAprendiz: (fuente: unknown, persona: unknown) => {
    mockUsarSemanas(fuente, persona);
    return {
      semanaEnCurso: mockEnCurso,
      semanaDe: (v: string | null) => (v ? mockMapaDeSemanas[v] ?? null : null),
      estadoDe: (v: string) => (mockMapaDeSemanas[v] ? 'lista' : 'sin_pedir'),
      falloDe: () => null,
      falloDeLaPrimera: null,
      cargandoLaPrimera: false,
      pedirFecha: () => undefined,
      reintentar: () => undefined,
      reintentarLaPrimera: () => undefined,
    };
  },
}));
const mockUsarDias = jest.fn<(fuente: unknown, persona: unknown) => void>();
jest.mock('../../hooks/useDiasDelMes', () => ({
  useDiasDelMes: (fuente: unknown, persona: unknown) => {
    mockUsarDias(fuente, persona);
    return { asegurarMes: () => undefined, diaDe: () => null, diaUnoDeLosDias: null };
  },
}));
const mockUsarAvisos = jest.fn<(persona: string | null) => void>();
jest.mock('../../hooks/useAvisosDelAprendiz', () => ({
  useAvisosDelAprendiz: (persona: string | null) => {
    mockUsarAvisos(persona);
    return { motivoDelAviso: null };
  },
}));
const mockUsarNotas = jest.fn<(origen: unknown) => void>();
jest.mock('../../hooks/useNotasDelAprendiz', () => ({
  useNotasDelAprendiz: (origen: unknown) => {
    mockUsarNotas(origen);
    return { notas: [], hayNotas: false, cargando: false, fallo: null, guardando: false, falloAlGuardar: null, guardar: async () => true, corregir: async () => true };
  },
}));
const mockDescargar = jest.fn<(semanaHasta?: string | null) => Promise<void>>();
const mockUsarDescarga = jest.fn<(d: unknown) => void>();
jest.mock('../../../lider-mentores/hooks/useDescargarSemana', () => ({
  useDescargarSemana: (d: unknown) => {
    mockUsarDescarga(d);
    return { descargando: false, descargar: mockDescargar };
  },
}));

import { AlumnoScreen } from '../../screens/AlumnoScreen';
import { FichaDePersona, type PropsDeFichaDePersona } from '../FichaDePersona';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alumno = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-7', null);
const ficha = (props: Partial<PropsDeFichaDePersona> & Pick<PropsDeFichaDePersona, 'origen'>) =>
  React.createElement(FichaDePersona, { alumno, onVolver: () => undefined, ...props });
const ultimas = (nombre: string) => mockPropsDe[nombre]?.at(-1) as { cargar?: unknown; soloLectura?: boolean } | undefined;
const marcas = (r: Parameters<typeof todoElTexto>[0]) => todoElTexto(r);

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-17T15:00:00Z'));
  mockEnCurso = semana();
  mockMapaDeSemanas = {
    [VIERNES]: mockEnCurso,
    '2026-11-13': semana({ desde: '2026-11-07', hasta: '2026-11-13', semanaEnCurso: false, dias: [{ fecha: '2026-11-11', diaDePrograma: 2, motivo: null, obligaciones: [], acciones: [] }] } as never),
  };
  for (const clave of Object.keys(mockPropsDe)) delete mockPropsDe[clave];
  for (const m of [mockUsarSemanas, mockUsarDias, mockUsarAvisos, mockUsarNotas, mockDescargar, mockUsarDescarga]) m.mockReset();
  mockDescargar.mockResolvedValue();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('la ficha abierta por el líder', () => {
  const origen = { quien: 'lider', grupoId: null } as const;

  it('lee por sus funciones de carga (la puerta del líder, sin grupo), no por un grupo', async () => { // spec 056 FR-014, FR-017
    await montar(ficha({ origen }));
    expect(mockUsarSemanas).toHaveBeenCalledWith(expect.any(Function), 'a-1');
    expect(mockUsarDias).toHaveBeenCalledWith(expect.any(Function), 'a-1');
    for (const seccion of ['Código Renaser', 'Tiempo libre', 'Cierres', '80/20 de SER', 'Diagnóstico', 'Objetivos']) {
      expect(ultimas(seccion)?.cargar).toEqual(expect.any(Function));
    }
  });

  it('las notas se leen con la puerta del líder y la hoja es de solo lectura', async () => { // spec 056 FR-015
    await montar(ficha({ origen }));
    expect(mockUsarNotas).toHaveBeenCalledWith({ quien: 'lider', personaId: 'a-1' });
    expect(ultimas('HojaDeNotas')?.soloLectura).toBe(true);
  });

  it('no consulta los avisos de acompañamiento (son del mentor) ni dibuja la caja del mentor', async () => { // spec 056 FR-014
    const r = await montar(ficha({ origen }));
    expect(mockUsarAvisos).toHaveBeenCalledWith(null);
    expect(marcas(r)).not.toContain('SECCION caja');
  });

  it('los objetivos van debajo de los hábitos y antes de las demás secciones', async () => { // spec 056 FR-016
    const r = await montar(ficha({ origen }));
    const texto = marcas(r);
    expect(texto.indexOf('SECCION Objetivos')).toBeGreaterThan(texto.indexOf('Caminata de la mañana'));
    expect(texto.indexOf('SECCION Código Renaser')).toBeGreaterThan(texto.indexOf('SECCION Objetivos'));
  });

  it('desde un grupo, lo que ya existía sigue por la puerta del grupo y es otra función de carga que sin grupo', async () => { // spec 056 FR-017
    await montar(ficha({ origen: { quien: 'lider', grupoId: 'g-1' } }));
    const conGrupo = ultimas('Tiempo libre')?.cargar;
    await montar(ficha({ origen }));
    expect(ultimas('Tiempo libre')?.cargar).not.toBe(conGrupo);
  });
});

describe('la ficha abierta por el mentor (lo de siempre)', () => {
  const origen = { quien: 'mentor', grupoId: 'g-7' } as const;

  it('lee por sus funciones de carga con el grupo, marca los avisos como leídos y lleva la caja, y monta los objetivos', async () => { // spec 056 FR-014
    const r = await montar(ficha({ origen }));
    expect(mockUsarSemanas).toHaveBeenCalledWith(expect.any(Function), 'a-1');
    expect(mockUsarAvisos).toHaveBeenCalledWith('a-1');
    expect(mockUsarNotas).toHaveBeenCalledWith({ quien: 'mentor', grupoId: 'g-7', aprendizId: 'a-1' });
    expect(ultimas('HojaDeNotas')?.soloLectura).toBe(false);
    expect(marcas(r)).toContain('SECCION caja');
    expect(ultimas('Objetivos')?.cargar).toEqual(expect.any(Function)); // spec 057 FR-004: la ficha del mentor monta los objetivos
  });

  it('sin grupo no hay a quién preguntarle: ninguna función de carga ni notas', async () => { // spec 056 FR-014
    await montar(ficha({ origen: { quien: 'mentor', grupoId: null } }));
    expect(mockUsarSemanas).toHaveBeenCalledWith(null, 'a-1');
    expect(mockUsarAvisos).toHaveBeenCalledWith(null);
    expect(mockUsarNotas).toHaveBeenCalledWith(null);
    expect(ultimas('Diagnóstico')?.cargar).toBeNull();
    expect(ultimas('Objetivos')?.cargar).toBeNull();
  });
});

describe('las ranuras', () => {
  const origen = { quien: 'lider', grupoId: null } as const;
  const accion = React.createElement(Pressable, { accessibilityLabel: 'Alertar al mentor', onPress: () => undefined });

  it('`accionesDeCabecera` va entre el lápiz de notas y el chat', async () => { // spec 056 FR-023
    const r = await montar(ficha({ origen, accionesDeCabecera: accion }));
    const orden = etiquetas(r).filter(e => ['Notas sobre Ana Pérez', 'Alertar al mentor', 'Escribirle a Ana Pérez'].includes(e));
    expect(orden).toEqual(['Notas sobre Ana Pérez', 'Alertar al mentor', 'Escribirle a Ana Pérez']);
  });

  it('`despues` y `pie` van al final, después de las secciones y en ese orden', async () => { // spec 056 FR-024
    const r = await montar(ficha({ origen, despues: React.createElement(Text, null, 'DESPUES'), pie: React.createElement(Text, null, 'PIE') }));
    const texto = marcas(r);
    expect(texto.indexOf('DESPUES')).toBeGreaterThan(texto.indexOf('SECCION Diagnóstico'));
    expect(texto.indexOf('PIE')).toBeGreaterThan(texto.indexOf('DESPUES'));
  });

  it('sin ranuras no deja nada de más: la ficha termina en su última sección', async () => { // spec 056 FR-014
    const r = await montar(ficha({ origen }));
    expect(marcas(r)).not.toMatch(/DESPUES|PIE/);
    /* Lo único que queda después de la última sección es la hoja de notas, que es una hoja y no parte del scroll. */
    expect(marcas(r).split(' | ').slice(marcas(r).split(' | ').indexOf('SECCION Diagnóstico') + 1)).toEqual(['SECCION HojaDeNotas']);
  });

  it('el pie llega cuando la ficha ya cargó, no mientras se lee la primera semana', async () => { // spec 056 FR-014
    mockEnCurso = null;
    const r = await montar(ficha({ origen, pie: React.createElement(Text, null, 'PIE') }));
    expect(marcas(r)).not.toContain('PIE');
  });

  it('el pie en función recibe la semana a la vista: sin fecha en la que está en curso y el viernes de una anterior', async () => { // spec 056 FR-039
    const pie = jest.fn((contexto: { semanaHasta: string | null }) => React.createElement(Text, null, `PIE ${contexto.semanaHasta ?? 'en curso'}`));
    const r = await montar(ficha({ origen, pie }));
    expect(marcas(r)).toContain('PIE en curso');
    await tocar(r, 'Noviembre, ver el mes');
    await tocar(r, 'Miércoles 11 de noviembre');
    expect(marcas(r)).toContain('PIE 2026-11-13');
  });
});

describe('«Descargar semana» en la ficha del mentor (spec 056 FR-047)', () => {
  const alumnoDelGrupo = alumnoDesdeLaInfo({ usuarioId: 'a-1', nombre: 'Ana Pérez' }, 'g-7', null);

  it('el mentor la ve en los aprendices que acompaña y pide la semana en curso, sin fecha', async () => { // spec 056 FR-047
    const r = await montar(React.createElement(AlumnoScreen, { alumno: alumnoDelGrupo, grupoId: 'g-7', onVolver: () => undefined }));
    expect(hayTocable(r, 'Descargar semana')).toBe(true);
    expect(mockUsarDescarga).toHaveBeenCalledWith({ tipo: 'APRENDIZ', personaId: 'a-1' });
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledWith(null);
  });

  it('si está viendo una semana anterior, descarga esa', async () => { // spec 056 FR-047
    const r = await montar(React.createElement(AlumnoScreen, { alumno: alumnoDelGrupo, grupoId: 'g-7', onVolver: () => undefined }));
    await tocar(r, 'Noviembre, ver el mes');
    await tocar(r, 'Miércoles 11 de noviembre');
    await tocar(r, 'Descargar semana');
    expect(mockDescargar).toHaveBeenCalledWith('2026-11-13');
  });

  it('sin grupo no se ofrece: solo se descarga lo de quien acompaña hoy', async () => { // spec 056 FR-047
    const r = await montar(React.createElement(AlumnoScreen, { alumno, grupoId: null, onVolver: () => undefined }));
    expect(hayTocable(r, 'Descargar semana')).toBe(false);
  });
});
