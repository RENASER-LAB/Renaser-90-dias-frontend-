import { describe, expect, it } from '@jest/globals';

import type { EntradaDelReporteApi, FichaApi, IndicadoresApi, PorResolverApi } from '../../api/liderMentoresSchemas';
import type { GrupoDelLider } from '../../types/gruposDelLider.types';
import type { AprendizDelSemaforo } from '../../../semaforo/types/semaforo.types';
import { consultasSinResponder, evaluacionCorta, subtituloDelMentor } from '../datosDelMentor';
import { haceCuantosDias, quienPregunta } from '../consultasDelLider';
import { estadoDelGrupo, filasDelGrupo } from '../grupoDelLider';
import { cohorteParaCrear, cuantosPorFiltro, estaLleno, estaSinMentor, filtroInicialDeGrupos, gruposDelFiltro, mentorConCupoLleno, nombreYaUsado } from '../gruposDelLider';
import { cuposLibresEnPalabras, filasPorResolver, ordenarPorUrgencia } from '../misMentores';
import { colorDeLaEntrada, lineaDeLaEntrada, resumenDelReporte } from '../reporteDelMes';

const grupo = (id: string, extra: Partial<GrupoDelLider> = {}): GrupoDelLider => ({
  id,
  nombre: `Grupo ${id}`,
  cohorteId: 'c-1',
  formacion: 'ESCUELA',
  mentorId: 'm-1',
  mentorNombre: 'Ana',
  aprendices: 5,
  cupo: 10,
  esRecepcion: false,
  enCurso: true,
  cohorteActiva: true,
  ...extra,
});

describe('los filtros de Grupos', () => {
  it('«Sin mentor» cuenta lo mismo que «Por resolver»: regulares en curso sin mentor, no la bienvenida ni los cerrados', () => { // spec 056 FR-006
    const grupos = [grupo('a', { mentorId: null }), grupo('b', { mentorId: null, esRecepcion: true }), grupo('c', { mentorId: null, enCurso: false }), grupo('d')];
    expect(grupos.filter(estaSinMentor).map(g => g.id)).toEqual(['a']);
    expect(cuantosPorFiltro(grupos)).toEqual({ sinMentor: 1, activos: 1, llenos: 0 });
  });

  it('«Llenos»: solo con tope y ocupación conocida que ya lo alcanzó; sin cifra o sin tope no se da por lleno', () => { // spec 056 FR-006
    expect(estaLleno(grupo('a', { aprendices: 10 }))).toBe(true);
    expect(estaLleno(grupo('a', { aprendices: 9 }))).toBe(false);
    expect(estaLleno(grupo('a', { aprendices: null }))).toBe(false);
    expect(estaLleno(grupo('a', { cupo: null, aprendices: 99 }))).toBe(false);
  });

  it('abre en «Sin mentor» si hay alguno y, si no, en «Activos»; cada lista va por nombre', () => { // spec 056 FR-006
    expect(filtroInicialDeGrupos([grupo('a', { mentorId: null }), grupo('b')])).toBe('sinMentor');
    expect(filtroInicialDeGrupos([grupo('b')])).toBe('activos');
    expect(gruposDelFiltro([grupo('z'), grupo('a')], 'activos').map(g => g.id)).toEqual(['a', 'z']);
  });

  it('un grupo nuevo nace en la generación activa con más grupos de sus formaciones; sin ninguna activa, no hay dónde crearlo', () => { // spec 056 FR-008
    const grupos = [grupo('a', { cohorteId: 'c-1' }), grupo('b', { cohorteId: 'c-2', formacion: 'DIPLOMADO' }), grupo('c', { cohorteId: 'c-2', formacion: 'DIPLOMADO' }), grupo('d', { cohorteId: 'c-3', cohorteActiva: false })];
    expect(cohorteParaCrear(grupos)).toEqual({ cohorteId: 'c-2', formacion: 'DIPLOMADO' });
    expect(cohorteParaCrear([grupo('x', { cohorteActiva: false })])).toBeNull();
  });

  it('un nombre repetido se reconoce sin mayúsculas, tildes ni espacios de más; uno vacío no cuenta como repetido', () => { // spec 056 FR-008
    expect(nombreYaUsado('  fénix ', [{ nombre: 'Fenix' }])).toBe(true);
    expect(nombreYaUsado('Otro', [{ nombre: 'Fenix' }])).toBe(false);
    expect(nombreYaUsado('   ', [{ nombre: '' }])).toBe(false);
  });

  it('un mentor sin grupo (0 de 0) no está lleno; uno con su cupo alcanzado, sí', () => { // spec 056 FR-008
    expect(mentorConCupoLleno({ acompanados: 0, maximo: 0 })).toBe(false);
    expect(mentorConCupoLleno({ acompanados: 10, maximo: 10 })).toBe(true);
    expect(mentorConCupoLleno(null)).toBe(false);
  });
});

const mentor = (id: string, nombre: string, extra: Record<string, unknown> = {}): IndicadoresApi =>
  ({
    userId: id,
    fullName: nombre,
    avatarUrl: null,
    groups: { source: 'OK', items: [{ id: 'g', name: 'g', trainees: 1, semaforo: null }] },
    traineeCount: 1,
    semaforo: { source: 'OK', summary: null },
    attention: { source: 'OK', open: 2, oldestOpenDays: 3, answered: 4, medianResponseHours: null },
    evaluation: { source: 'OK', month: '2026-11', percentage: 62.4, delivered: 1, expected: 4, traineesEvaluated: 2, state: 'CALCULADA' },
    cupo: { acompanados: 5, maximo: 10 },
    porColor: { rojo: 1, ambar: 0, verde: 0, sinDatos: 0 },
    ...extra,
  }) as unknown as IndicadoresApi;

describe('«Mis mentores»', () => {
  it('«Por resolver» dice una cifra corta por fila y no dibuja lo que no hay', () => { // spec 056 FR-002
    const p: PorResolverApi = { gruposSinMentor: 1, consultas: { cantidad: 2, diasDeLaMasVieja: 1 }, peorMentor: { id: 'm', nombre: 'Ana', evaluacion: 39.6 } };
    expect(filasPorResolver(p).map(f => [f.clave, f.texto, f.boton])).toEqual([
      ['grupos', '1 grupo sin mentor', 'Asignar'],
      ['consultas', '2 consultas · 1 día', 'Recordar'],
      ['peorMentor', 'Ana · 40 %', 'Ver'],
    ]);
    expect(filasPorResolver({ gruposSinMentor: 0, consultas: { cantidad: 0, diasDeLaMasVieja: null }, peorMentor: null })).toEqual([]);
    expect(filasPorResolver(null)).toEqual([]);
  });

  it('ordena por urgencia: más en rojo primero, después ámbar, quien no trae colores después y los suspendidos al final', () => { // spec 056 FR-003
    const lista = [
      mentor('s', 'Suspendido', { accountActive: false, porColor: { rojo: 9, ambar: 0, verde: 0, sinDatos: 0 } }),
      mentor('n', 'Sin colores', { porColor: null }),
      mentor('b', 'Beto', { porColor: { rojo: 1, ambar: 5, verde: 0, sinDatos: 0 } }),
      mentor('a', 'Ana', { porColor: { rojo: 1, ambar: 2, verde: 0, sinDatos: 0 } }),
      mentor('c', 'Carla', { porColor: { rojo: 4, ambar: 0, verde: 0, sinDatos: 0 } }),
    ];
    expect(ordenarPorUrgencia(lista).map(m => m.userId)).toEqual(['c', 'b', 'a', 'n', 's']);
  });

  it('suma los cupos libres de quienes tienen cupo y no se inventa si ninguno lo trae', () => { // spec 056 FR-003
    expect(cuposLibresEnPalabras([mentor('a', 'A'), mentor('b', 'B', { cupo: { acompanados: 9, maximo: 10 } })])).toBe('6 cupos libres');
    expect(cuposLibresEnPalabras([mentor('a', 'A', { cupo: null })])).toBeNull();
  });
});

describe('la ficha de un mentor', () => {
  it('«Como mentor» dice cada cosa en una cifra corta y lo que no se pudo leer, «No se pudo leer»', () => { // spec 056 FR-024
    const m = mentor('m', 'M');
    expect(evaluacionCorta(m)).toBe('62 %');
    expect(consultasSinResponder(m)).toBe('2 · 3 días');
    const caido = mentor('m', 'M', { evaluation: { source: 'UNAVAILABLE', month: null, percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null }, attention: { source: 'UNAVAILABLE', open: null, oldestOpenDays: null, answered: null, medianResponseHours: null } });
    expect(evaluacionCorta(caido)).toBe('No se pudo leer');
    expect(consultasSinResponder(caido)).toBe('No se pudo leer');
  });

  it('sin consultas y el subtítulo con su nivel y desde cuándo', () => { // spec 056 FR-024
    expect(consultasSinResponder(mentor('m', 'M', { attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null } }))).toBe('Ninguna');
    expect(subtituloDelMentor({ profile: { level: 'N1', operationalStatus: null, since: null } } as unknown as Pick<FichaApi, 'profile'>)).toBe('Mentor N1');
    expect(subtituloDelMentor({ profile: null } as unknown as Pick<FichaApi, 'profile'>)).toBe('Mentor');
  });
});

describe('Consultas', () => {
  it('«hace N días» en días completos, «hoy» el mismo día y nada si la fecha no se lee', () => { // spec 056 FR-028
    const ahora = Date.parse('2026-11-18T15:00:00Z');
    expect(haceCuantosDias('2026-11-13T14:00:00Z', ahora)).toBe('hace 5 días');
    expect(haceCuantosDias('2026-11-17T10:00:00Z', ahora)).toBe('hace 1 día');
    expect(haceCuantosDias('2026-11-18T09:00:00Z', ahora)).toBe('hoy');
    expect(haceCuantosDias('no es fecha', ahora)).toBeNull();
  });

  it('dice quién pregunta y a qué mentor le toca, y lo que no se sabe no se inventa', () => { // spec 056 FR-028
    expect(quienPregunta('Ana López', 'E2E Mentor')).toBe('Ana López → su mentor E2E Mentor');
    expect(quienPregunta(null, null)).toBe('Un aprendiz → su mentor');
  });
});

describe('el grupo para el líder', () => {
  const persona = (id: string, nombre: string, color: AprendizDelSemaforo['color'], porcentaje: number | null, extra: Partial<AprendizDelSemaforo> = {}): AprendizDelSemaforo =>
    ({ aprendizId: id, nombre, avatarUrl: null, porcentaje, color, etiqueta: null, diasConDatos: null, dias: [], ...extra }) as AprendizDelSemaforo;

  it('ordena como la 055 y arma la línea con el motivo y el porcentaje; quien no se mide va sin color', () => { // spec 056 FR-012
    const filas = filasDelGrupo([persona('v', 'Verde', 'VERDE', 90), persona('s', 'Sin', 'SIN_DATOS', null), persona('r', 'Rojo', 'ROJO', 10), persona('m', 'Mentor', 'SIN_DATOS', 50, { noSeMide: true })]);
    expect(filas.map(f => f.persona.aprendizId)).toEqual(['r', 'v', 'm', 's']);
    expect(filas[0].persona.aprendizId).toBe('r');
    expect(filas[0].estado).toBe('rojo');
    expect(filas.find(f => f.persona.aprendizId === 'm')?.linea).toBe('No se mide en el semáforo · 50 %');
    expect(filas.find(f => f.persona.aprendizId === 'm')?.estado).toBe('sinDatos');
    expect(filas.find(f => f.persona.aprendizId === 'v')?.linea).toBe('Al día · 90 %');
  });

  it('la cabecera dice el estado con la frase corta, y «sin datos» si no hay promedio', () => { // spec 056 FR-011
    expect(estadoDelGrupo({ colorDelPromedio: 'ROJO', promedio: 0 })).toEqual({ estado: 'rojo', frase: 'Grupo en rojo · 0 % en 7 días' });
    expect(estadoDelGrupo({ colorDelPromedio: 'VERDE', promedio: 91.4 })).toEqual({ estado: 'verde', frase: 'Grupo en verde · 91 % en 7 días' });
    expect(estadoDelGrupo({ colorDelPromedio: null, promedio: null })).toEqual({ estado: 'sinDatos', frase: 'Grupo sin datos' });
    expect(estadoDelGrupo(null)).toEqual({ estado: 'sinDatos', frase: 'Grupo sin datos' });
  });
});

describe('el reporte del mes', () => {
  const entrada = (pct: number | null, extra: Record<string, unknown> = {}): EntradaDelReporteApi =>
    ({
      mentor: {
        ...mentor('m', 'M', { evaluation: { source: 'OK', month: 'x', percentage: pct, delivered: 1, expected: 2, traineesEvaluated: 1, state: pct === null ? 'SIN_MUESTRA' : 'CALCULADA' }, ...extra }),
      },
      observations: { source: 'OK', recognitions: 0, suggestions: 0, alerts: 0, total: 0 },
    }) as unknown as EntradaDelReporteApi;

  it('el promedio es de quienes tienen evaluación y cuenta cuántos están debajo del 60 %', () => { // spec 056 FR-031
    expect(resumenDelReporte({ ranked: [entrada(80), entrada(40), entrada(null)] })).toEqual({ promedio: 60, conEvaluacion: 2, debajo: 1 });
    expect(resumenDelReporte({ ranked: [] })).toEqual({ promedio: null, conEvaluacion: 0, debajo: 0 });
  });

  it('el borde de cada mentor es el de su semáforo y, sin él, neutro; la línea junta su nota y sus consultas', () => { // spec 056 FR-031
    expect(colorDeLaEntrada(entrada(80, { semaforo: { source: 'OK', summary: { color: 'VERDE' } } }))).toBe('VERDE');
    expect(colorDeLaEntrada(entrada(80, { semaforo: { source: 'UNAVAILABLE', summary: null } }))).toBe('SIN_DATOS');
    expect(lineaDeLaEntrada(entrada(62.4))).toBe('62 % · 4 consultas respondidas · 2 sin responder');
  });
});
