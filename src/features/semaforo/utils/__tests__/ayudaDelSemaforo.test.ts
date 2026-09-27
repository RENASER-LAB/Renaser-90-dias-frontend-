import { describe, expect, it } from '@jest/globals';

import type { AprendizDelSemaforo, GrupoDelResumen, ResumenPorColor } from '../../types/semaforo.types';
import {
  PALABRA_SIN_ACTIVIDAD,
  aQuienAtenderHoy,
  cuantosNecesitanAyuda,
  gruposConAyuda,
  lineaDeAyudaDelGrupo,
  necesitaAyuda,
  notaDelCierreSemanal,
  palabraParaQuienAcompana,
  partirPorAyuda,
  textoNecesitanAyuda,
} from '../ayudaDelSemaforo';

/** Retroalimentación del 26/09: S-1 (mentor), S-4 (¿A quién atiendo hoy?), S-6 (nota) y A-2. */

const resumen = (r: Partial<ResumenPorColor>): ResumenPorColor => ({
  verde: 0, amarillo: 0, rojo: 0, sinDatos: 0, total: 0, ...r,
});

const aprendiz = (a: Partial<AprendizDelSemaforo> & { aprendizId: string }): AprendizDelSemaforo => ({
  nombre: a.aprendizId, avatarUrl: null, porcentaje: null, color: 'SIN_DATOS', etiqueta: null,
  diasConDatos: null, dias: [], ...a,
});

describe('las palabras para quien acompaña (A-2)', () => {
  it('«Sin datos» pasa a «Todavía sin actividad para medir», aunque el servidor mande «Sin datos»', () => {
    expect(palabraParaQuienAcompana('SIN_DATOS', 'Sin datos')).toBe(PALABRA_SIN_ACTIVIDAD);
    expect(PALABRA_SIN_ACTIVIDAD).toBe('Todavía sin actividad para medir');
  });

  it('las palabras de los tres colores NO cambian (decisión del dueño)', () => {
    expect(palabraParaQuienAcompana('VERDE', null)).toBe('Al día');
    expect(palabraParaQuienAcompana('AMARILLO', null)).toBe('Requiere atención');
    expect(palabraParaQuienAcompana('ROJO', null)).toBe('Con problemas');
    expect(palabraParaQuienAcompana('ROJO', 'Con problemas')).toBe('Con problemas');
  });
});

describe('quién necesita ayuda (S-1)', () => {
  it('rojo y amarillo sí; verde y sin datos no', () => {
    expect(necesitaAyuda('ROJO')).toBe(true);
    expect(necesitaAyuda('AMARILLO')).toBe(true);
    expect(necesitaAyuda('VERDE')).toBe(false);
    expect(necesitaAyuda('SIN_DATOS')).toBe(false);
  });

  it('cuenta con las cifras del servidor, y sin resumen dice «no sé» (null), no cero', () => {
    expect(cuantosNecesitanAyuda(resumen({ rojo: 1, amarillo: 2, verde: 5, total: 8 }))).toBe(3);
    expect(cuantosNecesitanAyuda(null)).toBeNull();
  });

  it('«1 necesita tu ayuda» y «N necesitan tu ayuda»', () => {
    expect(textoNecesitanAyuda(1)).toBe('1 necesita tu ayuda');
    expect(textoNecesitanAyuda(3)).toBe('3 necesitan tu ayuda');
  });

  it('la línea de la tarjeta nunca dice «sin avance registrado»', () => {
    expect(lineaDeAyudaDelGrupo(resumen({ rojo: 1, verde: 4, total: 5 }))).toBe('1 necesita tu ayuda esta semana');
    expect(lineaDeAyudaDelGrupo(resumen({ verde: 5, total: 5 }))).toBe('Nadie necesita ayuda esta semana');
    expect(lineaDeAyudaDelGrupo(resumen({ sinDatos: 4, total: 4 }))).toBe(
      '4 aprendices · todavía sin actividad para medir',
    );
    for (const r of [resumen({ sinDatos: 4, total: 4 }), resumen({ verde: 1, total: 1 })]) {
      expect(lineaDeAyudaDelGrupo(r)).not.toMatch(/sin avance/i);
    }
  });

  it('parte la tabla en «necesitan ayuda» y «el resto», conservando el orden del servidor', () => {
    const tabla = [
      aprendiz({ aprendizId: 'r', color: 'ROJO' }),
      aprendiz({ aprendizId: 'a', color: 'AMARILLO' }),
      aprendiz({ aprendizId: 's', color: 'SIN_DATOS' }),
      aprendiz({ aprendizId: 'v', color: 'VERDE' }),
    ];
    const { necesitan, resto } = partirPorAyuda(tabla);
    expect(necesitan.map(a => a.aprendizId)).toEqual(['r', 'a']);
    expect(resto.map(a => a.aprendizId)).toEqual(['s', 'v']);
  });
});

describe('¿A quién atiendo hoy? (S-4)', () => {
  const grupo = (id: string, r: ResumenPorColor | null): GrupoDelResumen => ({
    grupoId: id, grupoNombre: id, mentorNombre: null, resumen: r, promedio: null,
    colorDelPromedio: null, etiquetaDelPromedio: null,
  });

  it('solo pide la tabla de los grupos con alguien en rojo o amarillo (incluidos los sin mentor)', () => {
    const grupos = [
      grupo('bien', resumen({ verde: 3, total: 3 })),
      grupo('rojo', resumen({ rojo: 1, total: 1 })),
      grupo('amarillo-sin-mentor', resumen({ amarillo: 2, total: 2 })),
      grupo('sin-resumen', null),
    ];
    expect(gruposConAyuda(grupos).map(g => g.grupoId)).toEqual(['rojo', 'amarillo-sin-mentor']);
  });

  it('primero los rojos, después el porcentaje más bajo, después el nombre; sin verdes ni sin datos', () => {
    const lista = aQuienAtenderHoy([
      {
        grupoId: 'g1', grupoNombre: 'Fénix',
        aprendices: [
          aprendiz({ aprendizId: 'ana', nombre: 'Ana', color: 'AMARILLO', porcentaje: 70 }),
          aprendiz({ aprendizId: 'beto', nombre: 'Beto', color: 'VERDE', porcentaje: 90 }),
          aprendiz({ aprendizId: 'caro', nombre: 'Caro', color: 'SIN_DATOS' }),
        ],
      },
      {
        grupoId: 'g2', grupoNombre: 'Bienvenida',
        aprendices: [
          aprendiz({ aprendizId: 'dani', nombre: 'Dani', color: 'ROJO', porcentaje: 40 }),
          aprendiz({ aprendizId: 'eva', nombre: 'Eva', color: 'AMARILLO', porcentaje: 61 }),
          aprendiz({ aprendizId: 'fito', nombre: 'Fito', color: 'ROJO', porcentaje: 20 }),
        ],
      },
    ]);
    expect(lista.map(p => p.aprendizId)).toEqual(['fito', 'dani', 'eva', 'ana']);
    expect(lista[0].grupoNombre).toBe('Bienvenida');
    expect(lista.find(p => p.aprendizId === 'ana')?.grupoId).toBe('g1');
  });

  it('una persona que está en dos grupos aparece una sola vez', () => {
    const ana = aprendiz({ aprendizId: 'ana', nombre: 'Ana', color: 'ROJO', porcentaje: 30 });
    const lista = aQuienAtenderHoy([
      { grupoId: 'g1', grupoNombre: 'Estable', aprendices: [ana] },
      { grupoId: 'g2', grupoNombre: 'Bienvenida', aprendices: [ana] },
    ]);
    expect(lista).toHaveLength(1);
  });
});

describe('la nota del cierre semanal (S-6)', () => {
  it('usa la última semana cerrada que mandó el servidor', () => {
    expect(
      notaDelCierreSemanal({ desde: '2026-09-19', hasta: '2026-09-25' }, '2026-09-25', 'propia'),
    ).toBe('La semana del sábado 19 al viernes 25 de septiembre ya cerró; lo que completes después no la cambia.');
  });

  it('para el mentor o administración habla de la otra persona', () => {
    expect(notaDelCierreSemanal({ desde: '2026-09-19', hasta: '2026-09-25' }, null, 'otra')).toBe(
      'La semana del sábado 19 al viernes 25 de septiembre ya cerró; lo que complete después no la cambia.',
    );
  });

  it('sin semanas cerradas, la deduce del final de la ventana vigente (nunca del reloj del teléfono)', () => {
    // Ventana vigente hasta el martes 29: el viernes más reciente que no pasa de esa fecha es el 25.
    expect(notaDelCierreSemanal(null, '2026-09-29', 'propia')).toBe(
      'La semana del sábado 19 al viernes 25 de septiembre ya cerró; lo que completes después no la cambia.',
    );
    // Un sábado la ventana termina el viernes de ayer: ESA semana es la que acaba de cerrar.
    expect(notaDelCierreSemanal(null, '2026-10-02', 'propia')).toBe(
      'La semana del sábado 26 de septiembre al viernes 2 de octubre ya cerró; lo que completes después no la cambia.',
    );
  });

  it('sin nada de dónde sacarla, no inventa una fecha', () => {
    expect(notaDelCierreSemanal(null, null, 'propia')).toBeNull();
  });
});
