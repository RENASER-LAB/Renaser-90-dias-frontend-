import { describe, expect, it } from '@jest/globals';

import {
  avisoDelEstado,
  fechaCorta,
  hayCifras,
  lineaDeAvance,
  lineaDeLasVerdes,
  lineaDeUnEje,
  lineaDeUnaAccion,
  lineaDeUnaSemana,
  lineaDelCodigoRenaser,
  lineaDelVeintePorCiento,
  nombreDelEje,
  paraLeer,
  rangoDelPeriodo,
  tituloDeLosPasos,
  tituloDelPeriodo,
} from '../textosDelOchentaVeinte';

/** Los textos de «Tu 80/20» (spec 031): tipo oración, tuteo de Perú, sin culpa y sin «0 de 0». */

describe('los títulos', () => {
  it('semana, mes y los próximos pasos', () => {
    expect(tituloDelPeriodo('SEMANA', 10)).toBe('Semana 10');
    expect(tituloDelPeriodo('MES', 3)).toBe('Mes 3');
    expect(tituloDeLosPasos('SEMANA')).toBe('Para la próxima semana');
    expect(tituloDeLosPasos('MES')).toBe('Para el próximo mes');
  });

  it('el rango en español de Perú, con o sin cambio de mes', () => {
    expect(rangoDelPeriodo('2026-10-12', '2026-10-18')).toBe('Del 12 al 18 de octubre');
    expect(rangoDelPeriodo('2026-10-26', '2026-11-01')).toBe('Del 26 de octubre al 1 de noviembre');
    expect(rangoDelPeriodo('2026-10-26', '2026-10-26')).toBe('El 26 de octubre');
    expect(rangoDelPeriodo('nada', '2026-10-26')).toBe('');
  });

  it('«generado el …» en la fecha del servidor, o nada si no se lee', () => {
    expect(fechaCorta('2026-11-02T13:15:00Z')).toBe('2 de noviembre');
    expect(fechaCorta(null)).toBeNull();
    expect(fechaCorta('ayer')).toBeNull();
  });
});

describe('las cifras', () => {
  it('el avance, con su porcentaje; nunca «0 de 0»', () => {
    expect(lineaDeAvance({ planificadas: 12, cumplidas: 9, porcentajeCumplidas: 75 })).toBe('9 de 12 acciones cumplidas · 75 %');
    expect(lineaDeAvance({ planificadas: 1, cumplidas: 1, porcentajeCumplidas: null })).toBe('1 de 1 acción cumplida');
    expect(lineaDeAvance({ planificadas: 0, cumplidas: 0, porcentajeCumplidas: null })).toBeNull();
    expect(hayCifras({ planificadas: 0 })).toBe(false);
    expect(hayCifras({ planificadas: 3 })).toBe(true);
  });

  it('las dos reglas del 20 %: las verdes y las de más impacto', () => {
    expect(lineaDeLasVerdes({ verdes: { planificadas: 5, cumplidas: 3, impactoCumplido: 25, porcentajeDelImpacto: 55 } })).toBe(
      'Acciones verdes: 3 de 5 cumplidas · el 55 % del impacto que cumpliste vino de ellas',
    );
    expect(lineaDeLasVerdes({ verdes: { planificadas: 0, cumplidas: 0, impactoCumplido: 0, porcentajeDelImpacto: null } })).toBeNull();
    expect(lineaDeLasVerdes({ verdes: null })).toBeNull();
    expect(lineaDelVeintePorCiento({ veintePorCiento: { acciones: 2, impacto: 17, porcentajeDelImpacto: 38 } })).toBe(
      'El 20 % que más movió: 2 acciones · el 38 % del impacto cumplido',
    );
    expect(lineaDelVeintePorCiento({ veintePorCiento: null })).toBeNull();
  });

  it('un eje, una acción y una semana', () => {
    expect(nombreDelEje('CUERPO')).toBe('Cuerpo');
    expect(nombreDelEje('LO-QUE-SEA')).toBe('Otro eje');
    expect(lineaDeUnEje({ eje: 'CUERPO', planificadas: 4, cumplidas: 3, impactoCumplido: 22, porcentajeDelImpacto: 49 })).toBe('Cuerpo · 3 de 4 · 49 % del impacto');
    expect(lineaDeUnaAccion({ eje: 'CUERPO', color: 'VERDE', impacto: 10, fecha: '2026-10-27', titulo: 'Entrenar' })).toBe('Entrenar · Cuerpo');
    expect(lineaDeUnaSemana({ numero: 9, planificadas: 10, cumplidas: 8, porcentajeCumplidas: 80, porcentajeDelImpactoDeLasVerdes: null })).toBe('Semana 9 · 8 de 10 · 80 %');
    expect(lineaDeUnaSemana({ numero: 9, planificadas: 0, cumplidas: 0, porcentajeCumplidas: null, porcentajeDelImpactoDeLasVerdes: null })).toBe('Semana 9 · sin acciones');
  });

  it('el Código Renaser solo cuenta, sin frases ni emociones', () => {
    const e = { respuestas: 12, dictadas: 3, energiaPromedio: 6.4, energiaMinima: 3, energiaMaxima: 9, manana: null, tarde: null, noche: null };
    expect(lineaDelCodigoRenaser(e)).toBe('Código Renaser: 12 respuestas · energía promedio 6.4');
    expect(lineaDelCodigoRenaser({ ...e, respuestas: 1, energiaPromedio: null })).toBe('Código Renaser: 1 respuesta');
  });

  it('la lectura de pantalla cambia el punto medio por un punto', () => {
    expect(paraLeer('9 de 12 acciones cumplidas · 75 %')).toBe('9 de 12 acciones cumplidas. 75 %');
  });
});

describe('lo que dice cada estado', () => {
  const base = { tipo: 'SEMANA' as const, falta: [], minimoDeAcciones: 5 };

  it('en curso, pendiente y sin análisis', () => {
    expect(avisoDelEstado({ ...base, estado: 'EN_CURSO' })).toBe('Estas son tus cifras al día. Tu análisis llega cuando cierre la semana.');
    expect(avisoDelEstado({ ...base, tipo: 'MES', estado: 'EN_CURSO' })).toBe('Estas son tus cifras al día. Tu análisis llega cuando cierre el mes.');
    expect(avisoDelEstado({ ...base, estado: 'PENDIENTE' })).toBe('Tu análisis estará listo en cuanto podamos generarlo.');
    expect(avisoDelEstado({ ...base, estado: 'SIN_ANALISIS' })).toBe('No pudimos generar el análisis de tu semana. Tus cifras de arriba siguen siendo las tuyas.');
  });

  it('listo no necesita una línea aparte', () => {
    expect(avisoDelEstado({ ...base, estado: 'LISTO' })).toBeNull();
  });

  it('sin datos dice qué falta, sin culpa', () => {
    expect(avisoDelEstado({ ...base, estado: 'SIN_DATOS', falta: ['ACCIONES'] })).toBe(
      'Todavía no hay suficiente para analizar tu semana. Con al menos 5 acciones planificadas analizamos la semana.',
    );
    expect(avisoDelEstado({ ...base, estado: 'SIN_DATOS', falta: ['DIAS'] })).toBe(
      'Todavía no hay suficiente para analizar tu semana. Reparte tus acciones en más días y analizamos la semana.',
    );
    expect(avisoDelEstado({ ...base, estado: 'SIN_DATOS', falta: ['ACCIONES', 'DIAS'] })).toContain('repartidas en varios días');
    expect(avisoDelEstado({ ...base, tipo: 'MES', estado: 'SIN_DATOS', falta: [] })).toContain('Cuando planifiques más acciones');
  });

  it('ningún texto culpa, diagnostica ni usa voseo', () => {
    const todos = [
      ...(['EN_CURSO', 'PENDIENTE', 'SIN_DATOS', 'SIN_ANALISIS'] as const).flatMap(estado =>
        (['SEMANA', 'MES'] as const).map(tipo => avisoDelEstado({ tipo, estado, falta: ['ACCIONES', 'DIAS'], minimoDeAcciones: 5 })),
      ),
    ].join(' ');
    expect(todos).not.toMatch(/fallaste|incumpl|culpa|deprim|ansied|tenés|podés|hacé/i);
  });
});
