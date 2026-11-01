import { describe, expect, it } from '@jest/globals';

import { leerVistaDelPeriodo } from '../ochentaVeinteSchemas';

/**
 * Lo que responde `GET /api/v1/analisis-80-20` (spec 031): se valida **tolerante por partes**. Una acción, una semana o el resumen del
 * Código Renaser que no se entienden se pierden ELLOS y no la lectura; lo único indispensable es el periodo. Un estado desconocido
 * nunca inventa un análisis.
 */

const CIFRAS = {
  desde: '2026-10-26',
  hasta: '2026-11-01',
  planificadas: 12,
  cumplidas: 9,
  diasConAcciones: 5,
  porVenir: 0,
  impactoPlanificado: 60,
  impactoCumplido: 45,
  porcentajeCumplidas: 75,
  verdes: { planificadas: 5, cumplidas: 3, impactoCumplido: 25, porcentajeDelImpacto: 55 },
  veintePorCiento: { acciones: 2, impacto: 17, porcentajeDelImpacto: 38 },
  porEje: [{ eje: 'CUERPO', planificadas: 4, cumplidas: 3, impactoCumplido: 22, porcentajeDelImpacto: 49 }],
  lasQueMasMovieron: [{ eje: 'CUERPO', color: 'VERDE', impacto: 10, fecha: '2026-10-27', titulo: 'Entrenar' }],
  lasQueSeFueron: [{ eje: 'TRABAJO', color: 'VERDE', impacto: 9, fecha: '2026-10-29', titulo: 'Cerrar la propuesta' }],
  cumplioLoQueMenosMovia: true,
  cierre: { diasCerrados: 4, diasSinCerrar: 1, motivos: [{ clave: 'SIN_TIEMPO', veces: 3 }], planes: [{ clave: 'OTRA_HORA', veces: 2 }] },
};

const ANALISIS = {
  loQueMasMovio: 'Entrenar y cerrar la propuesta movieron tu semana.',
  loQueSeTeFue: 'Se quedó sin hacer la llamada del miércoles.',
  comoEstuviste: 'Tu energía se mantuvo estable.',
  proximosPasos: ['Agenda la llamada temprano.', 'Entrena dos veces.'],
};

function vista(extra: Record<string, unknown> = {}) {
  return {
    tipo: 'SEMANA',
    numero: 10,
    inicio: '2026-10-26',
    fin: '2026-11-01',
    cerrado: true,
    anterior: '2026-10-19',
    siguiente: null,
    cifras: CIFRAS,
    semanas: [],
    estado: 'LISTO',
    falta: [],
    minimoDeAcciones: 5,
    codigoRenaser: { respuestas: 12, dictadas: 3, energiaPromedio: 6.4, energiaMinima: 3, energiaMaxima: 9, porMomento: { manana: 7.1, tarde: 6, noche: null } },
    analisis: ANALISIS,
    generadoEn: '2026-11-02T13:15:00Z',
    ...extra,
  };
}

describe('leerVistaDelPeriodo: una lectura completa', () => {
  it('lee las cifras, las dos reglas del 20 % y el análisis en este orden', () => {
    const v = leerVistaDelPeriodo(vista(), 'test');
    expect(v.tipo).toBe('SEMANA');
    expect(v.numero).toBe(10);
    expect(v.estado).toBe('LISTO');
    expect(v.cifras.verdes).toEqual({ planificadas: 5, cumplidas: 3, impactoCumplido: 25, porcentajeDelImpacto: 55 });
    expect(v.cifras.veintePorCiento).toEqual({ acciones: 2, impacto: 17, porcentajeDelImpacto: 38 });
    expect(v.cifras.lasQueMasMovieron[0].titulo).toBe('Entrenar');
    expect(v.cifras.cierre?.motivos).toEqual([{ clave: 'SIN_TIEMPO', veces: 3 }]);
    expect(v.analisis?.proximosPasos).toEqual(['Agenda la llamada temprano.', 'Entrena dos veces.']);
    expect(v.generadoEn).toBe('2026-11-02T13:15:00Z');
    expect(v.codigoRenaser).toMatchObject({ respuestas: 12, dictadas: 3, energiaPromedio: 6.4, manana: 7.1, tarde: 6, noche: null });
  });

  it('un campo nuevo que esta versión no conoce no rompe nada', () => {
    const v = leerVistaDelPeriodo(vista({ campoNuevo: { a: 1 } }), 'test');
    expect(v.estado).toBe('LISTO');
  });
});

describe('leerVistaDelPeriodo: tolerante por partes', () => {
  it('una acción rota se pierde ELLA y no la lectura', () => {
    const v = leerVistaDelPeriodo(
      vista({ cifras: { ...CIFRAS, lasQueMasMovieron: [{ eje: 'CUERPO' }, { eje: 'CUERPO', color: 'VERDE', impacto: 8, fecha: '2026-10-27', titulo: 'Caminar' }] } }),
      'test',
    );
    expect(v.cifras.lasQueMasMovieron.map(a => a.titulo)).toEqual(['Caminar']);
  });

  it('una semana rota y un resumen del Código Renaser roto se pierden solos', () => {
    const v = leerVistaDelPeriodo(vista({ tipo: 'MES', semanas: [{ numero: 'x' }, { numero: 9, planificadas: 10, cumplidas: 8, porcentajeCumplidas: 80, porcentajeDelImpactoDeLasVerdes: 60 }], codigoRenaser: 'roto' }), 'test');
    expect(v.semanas).toEqual([{ numero: 9, planificadas: 10, cumplidas: 8, porcentajeCumplidas: 80, porcentajeDelImpactoDeLasVerdes: 60 }]);
    expect(v.codigoRenaser).toBeNull();
  });

  it('sin las reglas ni el cierre (periodo con pocas cumplidas) las cifras quedan en null', () => {
    const v = leerVistaDelPeriodo(vista({ estado: 'EN_CURSO', cerrado: false, analisis: null, cifras: { ...CIFRAS, verdes: null, veintePorCiento: null, cierre: null } }), 'test');
    expect(v.cifras.verdes).toBeNull();
    expect(v.cifras.veintePorCiento).toBeNull();
    expect(v.cifras.cierre).toBeNull();
  });

  it('sin el periodo (tipo, inicio o fin) la respuesta no sirve', () => {
    expect(() => leerVistaDelPeriodo({ ...vista(), inicio: 'ayer' }, 'test')).toThrow('Respuesta inesperada');
    expect(() => leerVistaDelPeriodo({ ...vista(), tipo: 'AÑO' }, 'test')).toThrow('Respuesta inesperada');
    expect(() => leerVistaDelPeriodo(null, 'test')).toThrow('Respuesta inesperada');
  });
});

describe('leerVistaDelPeriodo: nunca inventa un análisis', () => {
  it('«LISTO» sin texto legible se lee como pendiente', () => {
    const v = leerVistaDelPeriodo(vista({ analisis: { ...ANALISIS, proximosPasos: [] } }), 'test');
    expect(v.estado).toBe('PENDIENTE');
    expect(v.analisis).toBeNull();
    expect(v.generadoEn).toBeNull();
  });

  it('un estado desconocido es «pendiente» si el periodo cerró y «en curso» si no', () => {
    expect(leerVistaDelPeriodo(vista({ estado: 'NUEVO', analisis: null }), 'test').estado).toBe('PENDIENTE');
    expect(leerVistaDelPeriodo(vista({ estado: 'NUEVO', cerrado: false, analisis: null }), 'test').estado).toBe('EN_CURSO');
  });

  it('el texto solo se conserva con el estado LISTO: nunca junto a «llega pronto»', () => {
    const v = leerVistaDelPeriodo(vista({ estado: 'PENDIENTE' }), 'test');
    expect(v.analisis).toBeNull();
  });

  it('lo que falta en «sin datos» se lee con los dos motivos que se conocen', () => {
    const v = leerVistaDelPeriodo(vista({ estado: 'SIN_DATOS', analisis: null, falta: ['ACCIONES', 'DIAS', 'OTRO'] }), 'test');
    expect(v.estado).toBe('SIN_DATOS');
    expect(v.falta).toEqual(['ACCIONES', 'DIAS']);
    expect(v.minimoDeAcciones).toBe(5);
  });
});
