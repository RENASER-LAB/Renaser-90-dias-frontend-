import { describe, expect, it } from '@jest/globals';

import { aResumenPorGrupos, aSemaforoDelGrupo, semaforoSchemas, validarRespuesta } from '../semaforoSchemas';

/**
 * La tabla de un grupo (§4.3, mentor y administración) y el resumen por grupos (§4.4, líder,
 * administración y alquimista) contra el contrato `docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md` del
 * backend. Los dos primeros ejemplos están copiados TAL CUAL del documento —con sus `"…"`—: si el
 * contrato cambia y la app no, esto es lo primero que tiene que romperse.
 *
 * Lo que se fija, además de "se puede leer":
 * - el orden de las filas es el del servidor: la app no reordena;
 * - nunca verde ni un 0 % por falta de datos (la misma regla del detalle, reutilizada);
 * - el resumen por grupos no deja pasar un nombre de aprendiz aunque el cable lo trajera (RL-07);
 * - un campo nuevo no tumba nada; lo imprescindible que falta se dice con un error claro.
 */

const ORIGEN_GRUPO = 'GET /api/v1/mentor/groups/{g}/semaforo';
const ORIGEN_GRUPOS = 'GET /api/v1/semaforo/groups';

function leerGrupo(crudo: unknown) {
  return aSemaforoDelGrupo(validarRespuesta(semaforoSchemas.grupo, crudo, ORIGEN_GRUPO));
}

function leerGrupos(crudo: unknown) {
  return aResumenPorGrupos(validarRespuesta(semaforoSchemas.grupos, crudo, ORIGEN_GRUPOS));
}

/** §4.3, copiado del contrato. */
const TABLA_DEL_CONTRATO = {
  grupoId: '…', grupoNombre: 'Grupo Fénix',
  desde: '2026-09-18', hasta: '2026-09-24', cerrada: false,
  resumen: { verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 },
  aprendices: [
    { aprendizId: '…', nombre: 'Ana Pérez', avatarUrl: null,
      porcentaje: 78.3, color: 'AMARILLO', etiqueta: 'Requiere atención', diasConDatos: 6,
      dias: [ { fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO' } ] },
  ],
};

/** §4.4, copiado del contrato. */
const RESUMEN_DEL_CONTRATO = {
  desde: '2026-09-18', hasta: '2026-09-24', cerrada: false,
  totales: { verde: 40, amarillo: 12, rojo: 8, sinDatos: 2, total: 62 },
  grupos: [
    { grupoId: '…', grupoNombre: 'Grupo Fénix', mentorNombre: 'Luisa Ramírez',
      resumen: { verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 },
      promedio: 76.4, color: 'AMARILLO', etiqueta: 'Requiere atención' },
  ],
};

/**
 * Una fila como la arma HOY el backend (`TablaDelSemaforoResponse.AprendizResponse`): quien no se
 * mide llega con `SIN_DATOS`, porcentaje `null`, 0 días con datos y SIN días; y cada día trae su
 * `etiqueta` (aditivo).
 */
function filaDelBackend(aprendizId: string, nombre: string, color: string, porcentaje: number | null) {
  return {
    aprendizId, nombre, avatarUrl: null, porcentaje, color,
    etiqueta: { VERDE: 'Al día', AMARILLO: 'Requiere atención', ROJO: 'Con problemas', SIN_DATOS: 'Sin datos' }[color],
    diasConDatos: porcentaje === null ? 0 : 7,
    dias: porcentaje === null ? [] : [
      { fecha: '2026-09-18', estado: 'MEDIDO', porcentaje, color, etiqueta: 'x' },
    ],
  };
}

describe('la tabla de un grupo (§4.3): el ejemplo del contrato', () => {
  it('se lee entera, sin perder nada', () => {
    expect(leerGrupo(TABLA_DEL_CONTRATO)).toEqual({
      grupoId: '…',
      grupoNombre: 'Grupo Fénix',
      desde: '2026-09-18',
      hasta: '2026-09-24',
      cerrada: false,
      resumen: { verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 },
      aprendices: [
        {
          aprendizId: '…',
          nombre: 'Ana Pérez',
          avatarUrl: null,
          porcentaje: 78.3,
          color: 'AMARILLO',
          etiqueta: 'Requiere atención',
          diasConDatos: 6,
          /* Los días cortos no traen conteos: quedan en null, no en 0 de 0. */
          dias: [{ fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO', habitos: null, objetivos: null }],
        },
      ],
    });
  });

  it('la administración recibe el mismo formato y se lee con el mismo esquema', () => {
    const tabla = aSemaforoDelGrupo(
      validarRespuesta(semaforoSchemas.grupo, TABLA_DEL_CONTRATO, 'GET /api/v1/admin/semaforo/groups/{g}'),
    );
    expect(tabla.aprendices[0].nombre).toBe('Ana Pérez');
  });
});

describe('el orden de las filas es el del servidor', () => {
  /* Rojo, amarillo, sin datos, verde; por nombre dentro de cada color (§4.3). */
  it('se conserva tal cual llega', () => {
    const tabla = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      aprendices: [
        filaDelBackend('u-4', 'Zoe Rojas', 'ROJO', 41.2),
        filaDelBackend('u-2', 'Ana Pérez', 'AMARILLO', 78.3),
        filaDelBackend('u-3', 'Beto Soto', 'SIN_DATOS', null),
        filaDelBackend('u-1', 'Carla Díaz', 'VERDE', 91.0),
      ],
    });
    expect(tabla.aprendices.map(a => [a.nombre, a.color])).toEqual([
      ['Zoe Rojas', 'ROJO'],
      ['Ana Pérez', 'AMARILLO'],
      ['Beto Soto', 'SIN_DATOS'],
      ['Carla Díaz', 'VERDE'],
    ]);
  });

  /* Si el dueño cambia el criterio en el backend, llega a todos sin reinstalar: la app no se
     actualiza por aire, así que no puede imponer su propio orden. */
  it('la app no reordena, aunque el orden no sea el del contrato', () => {
    const tabla = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      aprendices: [
        filaDelBackend('u-1', 'Carla Díaz', 'VERDE', 91.0),
        filaDelBackend('u-4', 'Zoe Rojas', 'ROJO', 41.2),
      ],
    });
    expect(tabla.aprendices.map(a => a.aprendizId)).toEqual(['u-1', 'u-4']);
  });
});

describe('nunca verde ni 0 % por falta de datos', () => {
  it('quien no se mide (así lo manda hoy el backend): sin datos, sin número, sin días', () => {
    const [fila] = leerGrupo({ ...TABLA_DEL_CONTRATO, aprendices: [filaDelBackend('u-3', 'Beto Soto', 'SIN_DATOS', null)] })
      .aprendices;
    expect(fila).toEqual({
      aprendizId: 'u-3',
      nombre: 'Beto Soto',
      avatarUrl: null,
      porcentaje: null,
      color: 'SIN_DATOS',
      etiqueta: 'Sin datos',
      diasConDatos: 0,
      dias: [],
    });
  });

  it('verde sin porcentaje se lee «Sin datos», no «Al día»', () => {
    const [fila] = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      aprendices: [{ ...TABLA_DEL_CONTRATO.aprendices[0], porcentaje: null, color: 'VERDE', etiqueta: 'Al día' }],
    }).aprendices;
    expect(fila).toMatchObject({ porcentaje: null, color: 'SIN_DATOS', etiqueta: null });
  });

  it('un color que la app no conoce no lleva número', () => {
    const [fila] = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      aprendices: [{ ...TABLA_DEL_CONTRATO.aprendices[0], color: 'NARANJA', etiqueta: 'Casi' }],
    }).aprendices;
    expect(fila).toMatchObject({ porcentaje: null, color: 'SIN_DATOS', etiqueta: null });
  });

  it('los días se normalizan como en el detalle y se ordenan por fecha', () => {
    const [fila] = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      aprendices: [
        {
          ...TABLA_DEL_CONTRATO.aprendices[0],
          dias: [
            { fecha: '2026-09-20', estado: 'PAUSADO', porcentaje: 0, color: 'ROJO', etiqueta: 'Con problemas' },
            { fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO', etiqueta: 'Requiere atención' },
            { fecha: '2026-09-19', estado: 'FERIADO', porcentaje: 90, color: 'VERDE' },
          ],
        },
      ],
    }).aprendices;
    expect(fila.dias.map(d => [d.fecha, d.estado, d.porcentaje, d.color])).toEqual([
      ['2026-09-18', 'MEDIDO', 75, 'AMARILLO'],
      ['2026-09-19', 'DESCONOCIDO', null, 'SIN_DATOS'],
      ['2026-09-20', 'PAUSADO', null, 'SIN_DATOS'],
    ]);
  });
});

describe('nulos y campos que faltan', () => {
  it('lo opcional ausente toma valores seguros', () => {
    const tabla = leerGrupo({ desde: '2026-09-12', hasta: '2026-09-18' });
    expect(tabla).toEqual({
      grupoId: null,
      grupoNombre: null,
      desde: '2026-09-12',
      hasta: '2026-09-18',
      cerrada: false,
      resumen: null,
      aprendices: [],
    });
  });

  it('una fila con solo su id no inventa nombre ni números', () => {
    const [fila] = leerGrupo({ desde: '2026-09-12', hasta: '2026-09-18', cerrada: true, aprendices: [{ aprendizId: 'u-9' }] })
      .aprendices;
    expect(fila).toEqual({
      aprendizId: 'u-9',
      nombre: null,
      avatarUrl: null,
      porcentaje: null,
      color: 'SIN_DATOS',
      etiqueta: null,
      diasConDatos: null,
      dias: [],
    });
  });

  it('`null` explícito en todo lo opcional', () => {
    const tabla = leerGrupo({
      grupoId: null, grupoNombre: null, desde: '2026-09-12', hasta: '2026-09-18', cerrada: null,
      resumen: null, aprendices: null,
    });
    expect(tabla).toMatchObject({ cerrada: false, resumen: null, aprendices: [] });
  });

  it('campos desconocidos en todos los niveles', () => {
    const tabla = leerGrupo({
      ...TABLA_DEL_CONTRATO,
      versionFormula: 2,
      resumen: { ...TABLA_DEL_CONTRATO.resumen, pausados: 1 },
      aprendices: [{ ...TABLA_DEL_CONTRATO.aprendices[0], tendencia: 'SUBE', dias: [{ ...TABLA_DEL_CONTRATO.aprendices[0].dias[0], nota: 'x' }] }],
    });
    expect(tabla.aprendices[0].porcentaje).toBe(78.3);
    expect(tabla.resumen).toEqual({ verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 });
  });
});

describe('lo imprescindible que falta se dice con un error claro', () => {
  it('sin fechas no se sabe qué días se miran', () => {
    expect(() => leerGrupo({ ...TABLA_DEL_CONTRATO, desde: undefined })).toThrow(/semaforo — desde/);
  });

  it('una fila sin id', () => {
    expect(() => leerGrupo({ ...TABLA_DEL_CONTRATO, aprendices: [{ nombre: 'Ana' }] })).toThrow(/aprendices\.0\.aprendizId/);
  });

  it('un resumen con una cifra de menos no se completa con un cero', () => {
    const { total: _total, ...sinTotal } = TABLA_DEL_CONTRATO.resumen;
    expect(() => leerGrupo({ ...TABLA_DEL_CONTRATO, resumen: sinTotal })).toThrow(/resumen\.total/);
  });

  it('una respuesta que no es un objeto', () => {
    expect(() => leerGrupo('<html>502</html>')).toThrow(/Respuesta inesperada de GET \/api\/v1\/mentor/);
  });
});

describe('el resumen por grupos (§4.4)', () => {
  it('el ejemplo del contrato se lee entero', () => {
    expect(leerGrupos(RESUMEN_DEL_CONTRATO)).toEqual({
      desde: '2026-09-18',
      hasta: '2026-09-24',
      cerrada: false,
      totales: { verde: 40, amarillo: 12, rojo: 8, sinDatos: 2, total: 62 },
      grupos: [
        {
          grupoId: '…',
          grupoNombre: 'Grupo Fénix',
          mentorNombre: 'Luisa Ramírez',
          resumen: { verde: 5, amarillo: 2, rojo: 1, sinDatos: 0, total: 8 },
          promedio: 76.4,
          colorDelPromedio: 'AMARILLO',
          etiquetaDelPromedio: 'Requiere atención',
        },
      ],
    });
  });

  it('un grupo sin nadie con datos tiene promedio `null`, nunca 0', () => {
    const [grupo] = leerGrupos({
      ...RESUMEN_DEL_CONTRATO,
      grupos: [{ ...RESUMEN_DEL_CONTRATO.grupos[0], promedio: null, resumen: { verde: 0, amarillo: 0, rojo: 0, sinDatos: 8, total: 8 } }],
    }).grupos;
    expect(grupo.promedio).toBeNull();
  });

  /* El color del promedio sigue la regla de todo promedio: sin número no hay color, y un color que
     no se entiende no lleva número. */
  it('con color pero sin promedio se lee «Sin datos», nunca «Al día»', () => {
    const [grupo] = leerGrupos({
      ...RESUMEN_DEL_CONTRATO,
      grupos: [{ ...RESUMEN_DEL_CONTRATO.grupos[0], promedio: null, color: 'VERDE', etiqueta: 'Al día' }],
    }).grupos;
    expect(grupo.colorDelPromedio).toBe('SIN_DATOS');
    expect(grupo.etiquetaDelPromedio).toBeNull();
    expect(grupo.promedio).toBeNull();
  });

  it('un color del promedio que la app no conoce no lleva número', () => {
    const [grupo] = leerGrupos({
      ...RESUMEN_DEL_CONTRATO,
      grupos: [{ ...RESUMEN_DEL_CONTRATO.grupos[0], color: 'AZUL', etiqueta: 'Otra cosa' }],
    }).grupos;
    expect(grupo.colorDelPromedio).toBe('SIN_DATOS');
    expect(grupo.promedio).toBeNull();
  });

  it('un backend que todavía no manda el color deja el promedio neutro, con su número', () => {
    const { color: _color, etiqueta: _etiqueta, ...sinColor } = RESUMEN_DEL_CONTRATO.grupos[0];
    const [grupo] = leerGrupos({ ...RESUMEN_DEL_CONTRATO, grupos: [sinColor] }).grupos;
    expect(grupo.colorDelPromedio).toBeNull();
    expect(grupo.etiquetaDelPromedio).toBeNull();
    expect(grupo.promedio).toBe(76.4);
  });

  it('los grupos quedan en el orden del servidor', () => {
    const grupos = leerGrupos({
      ...RESUMEN_DEL_CONTRATO,
      grupos: [
        { ...RESUMEN_DEL_CONTRATO.grupos[0], grupoId: 'g-3', grupoNombre: 'Grupo Tierra' },
        { ...RESUMEN_DEL_CONTRATO.grupos[0], grupoId: 'g-1', grupoNombre: 'Grupo Agua' },
      ],
    }).grupos;
    expect(grupos.map(g => g.grupoId)).toEqual(['g-3', 'g-1']);
  });

  /* RL-07: el líder ve cantidades, no personas. Si por un error el servidor mandara nombres, la
     normalización copia campo por campo y no los deja llegar a ninguna pantalla. */
  it('un nombre de aprendiz que viniera de más no pasa', () => {
    const resumen = leerGrupos({
      ...RESUMEN_DEL_CONTRATO,
      aprendices: [{ nombre: 'Ana Pérez' }],
      grupos: [{ ...RESUMEN_DEL_CONTRATO.grupos[0], aprendices: [{ aprendizId: 'u-1', nombre: 'Ana Pérez' }] }],
    });
    expect(JSON.stringify(resumen)).not.toContain('Ana Pérez');
    expect(Object.keys(resumen.grupos[0]).sort()).toEqual([
      'colorDelPromedio', 'etiquetaDelPromedio', 'grupoId', 'grupoNombre', 'mentorNombre', 'promedio', 'resumen',
    ]);
  });

  it('nulos: sin totales, sin grupos, sin mentor', () => {
    const resumen = leerGrupos({ desde: '2026-09-12', hasta: '2026-09-18', cerrada: true, totales: null, grupos: [{ grupoId: 'g-1' }] });
    expect(resumen).toEqual({
      desde: '2026-09-12',
      hasta: '2026-09-18',
      cerrada: true,
      totales: null,
      grupos: [
        {
          grupoId: 'g-1', grupoNombre: null, mentorNombre: null, resumen: null, promedio: null,
          colorDelPromedio: null, etiquetaDelPromedio: null,
        },
      ],
    });
  });

  it('campos desconocidos no tumban nada', () => {
    const resumen = leerGrupos({ ...RESUMEN_DEL_CONTRATO, generadoEn: 'x', grupos: [{ ...RESUMEN_DEL_CONTRATO.grupos[0], cohorte: 'C-3' }] });
    expect(resumen.grupos[0].promedio).toBe(76.4);
  });

  it('un grupo sin id, o sin fechas, se dice', () => {
    expect(() => leerGrupos({ ...RESUMEN_DEL_CONTRATO, grupos: [{ grupoNombre: 'X' }] })).toThrow(/grupos\.0\.grupoId/);
    expect(() => leerGrupos({ ...RESUMEN_DEL_CONTRATO, hasta: undefined })).toThrow(/groups — hasta/);
  });
});
