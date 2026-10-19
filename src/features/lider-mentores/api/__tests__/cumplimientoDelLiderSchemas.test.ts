import { describe, expect, it } from '@jest/globals';

import {
  aPublicacionDelMuro,
  aSemanaDePersona,
  aTablaDelLider,
  cumplimientoDelLiderSchemas,
  validarRespuesta,
} from '../cumplimientoDelLiderSchemas';

/**
 * Lo que la app entiende de las tres lecturas nuevas del líder (spec 005, `contracts/leadership-cumplimiento.md`
 * §1, §2 y §4). Lo que importa: tolerar al servidor (un campo que falta no tumba la pantalla), no inventar datos
 * (la falta de datos no es incumplimiento, sin número no hay color) y no perder lo que el líder necesita (el
 * «No se mide en el semáforo» con su %, la evidencia de cada hábito).
 */

const FILA = { aprendizId: 'u1', nombre: 'Ana Pérez', avatarUrl: null, dias: [] };

function tabla(aprendices: unknown[]) {
  return {
    grupoId: 'g1',
    grupoNombre: 'Fénix',
    desde: '2026-10-12',
    hasta: '2026-10-18',
    cerrada: false,
    resumen: { verde: 1, amarillo: 0, rojo: 1, sinDatos: 0, total: 2 },
    aprendices,
  };
}

function leerTabla(aprendices: unknown[]) {
  return aTablaDelLider(validarRespuesta(cumplimientoDelLiderSchemas.tabla, tabla(aprendices), 'prueba'));
}

describe('la lista del grupo (contrato §1)', () => {
  it('queda en el orden del servidor: la app no reordena (FR-007)', () => {
    const lista = leerTabla([
      { ...FILA, aprendizId: 'a', color: 'ROJO', porcentaje: 20.5, etiqueta: 'Con problemas' },
      { ...FILA, aprendizId: 'b', color: 'ROJO', porcentaje: 40, etiqueta: 'Con problemas' },
      { ...FILA, aprendizId: 'c', color: 'VERDE', porcentaje: 95, etiqueta: 'Al día' },
    ]);
    expect(lista.aprendices.map(a => a.aprendizId)).toEqual(['a', 'b', 'c']);
  });

  it('el mentor o la guía con programa propio: «no se mide», sin color pero CON su %', () => {
    const lista = leerTabla([
      { ...FILA, aprendizId: 'm', nombre: 'Luisa', color: 'NO_SE_MIDE', etiqueta: 'No se mide en el semáforo', porcentaje: 88.2, rol: 'MENTOR' },
    ]);
    expect(lista.aprendices[0]).toMatchObject({ aprendizId: 'm', noSeMide: true, color: 'SIN_DATOS', porcentaje: 88.2, rol: 'MENTOR' });
  });

  it('«no se mide» sin porcentaje queda sin número, no en 0', () => {
    const lista = leerTabla([{ ...FILA, color: 'NO_SE_MIDE', porcentaje: null }]);
    expect(lista.aprendices[0].noSeMide).toBe(true);
    expect(lista.aprendices[0].porcentaje).toBeNull();
  });

  it('un aprendiz medido no lleva la marca de «no se mide»; el rol es opcional', () => {
    const lista = leerTabla([{ ...FILA, color: 'AMARILLO', porcentaje: 74.5, etiqueta: 'Requiere atención' }]);
    expect(lista.aprendices[0].noSeMide).toBeUndefined();
    expect(lista.aprendices[0].rol).toBeUndefined();
    expect(lista.aprendices[0]).toMatchObject({ color: 'AMARILLO', porcentaje: 74.5 });
  });

  it('un color que la app no conoce se lee como sin datos, nunca como verde', () => {
    const lista = leerTabla([{ ...FILA, color: 'AZUL', porcentaje: 90 }]);
    expect(lista.aprendices[0]).toMatchObject({ color: 'SIN_DATOS', porcentaje: null });
    expect(lista.aprendices[0].noSeMide).toBeUndefined();
  });

  it('sin filas es una lista vacía, no un error', () => {
    expect(aTablaDelLider(validarRespuesta(cumplimientoDelLiderSchemas.tabla, { desde: '2026-10-12', hasta: '2026-10-18' }, 'p')).aprendices).toEqual([]);
  });
});

const OBLIGACION = {
  registroId: 'r1',
  titulo: 'Ritual de la mañana',
  estadoHabito: 'COMPLETADO',
  requiereEvidencia: true,
  entrega: 'ENTREGADA',
  entregadaEn: '2026-10-17T12:00:00Z',
  revision: null,
  evidenciaId: 'e1',
  respuestaTexto: 'Me sentí con energía',
  evidencias: [{ id: 'e1', tipo: 'FOTO', subidaEn: '2026-10-17T12:00:00Z' }],
  publicacionId: null,
};

function semana(cambios: Record<string, unknown> = {}, dias: unknown[] = [{ fecha: '2026-10-17', diaDePrograma: 49, motivo: null, obligaciones: [OBLIGACION], acciones: [] }]) {
  return {
    grupoId: 'g1',
    personaId: 'p1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    desde: '2026-10-17',
    hasta: '2026-10-23',
    zona: 'America/Lima',
    semanaEnCurso: true,
    primeraSemana: '2026-08-29',
    mentor: { id: 'm1', nombre: 'Luisa' },
    resumen: { obligaciones: 35, cumplidas: 30, conEntrega: 12, pendientes: 3, sinCumplir: 2 },
    color: 'AMARILLO',
    porcentaje: 74.5,
    dias,
    ...cambios,
  };
}

function leerSemana(cuerpo: unknown) {
  return aSemanaDePersona(validarRespuesta(cumplimientoDelLiderSchemas.semana, cuerpo, 'prueba'));
}

describe('la semana de una persona (contrato §2)', () => {
  it('trae el rango, el mentor, el color y la evidencia de cada hábito', () => {
    const s = leerSemana(semana());
    expect(s).toMatchObject({
      personaId: 'p1',
      nombre: 'Ana Pérez',
      desde: '2026-10-17',
      hasta: '2026-10-23',
      semanaEnCurso: true,
      primeraSemana: '2026-08-29',
      mentor: { id: 'm1', nombre: 'Luisa' },
      color: 'AMARILLO',
      noSeMide: false,
      porcentaje: 74.5,
    });
    expect(s.dias[0].obligaciones[0]).toMatchObject({
      registroId: 'r1',
      estado: 'COMPLETADO',
      respuestaTexto: 'Me sentí con energía',
      evidencias: [{ id: 'e1', tipo: 'FOTO' }],
      publicacionId: null,
    });
  });

  it('un grupo sin mentor vigente: `mentor` null, y «Avisar a su mentor» no tiene a quién', () => {
    expect(leerSemana(semana({ mentor: null })).mentor).toBeNull();
    expect(leerSemana(semana({ mentor: undefined })).mentor).toBeNull();
  });

  it('el mentor o la guía con programa propio: «no se mide» y conserva su %', () => {
    const s = leerSemana(semana({ color: 'NO_SE_MIDE', porcentaje: 81 }));
    expect(s).toMatchObject({ noSeMide: true, color: 'SIN_DATOS', porcentaje: 81 });
  });

  it('sin porcentaje no hay color: nunca verde por falta de datos', () => {
    expect(leerSemana(semana({ color: 'VERDE', porcentaje: null }))).toMatchObject({ color: 'SIN_DATOS', porcentaje: null });
  });

  it('los días quedan de sábado a viernes (por fecha ascendente) aunque lleguen desordenados', () => {
    const s = leerSemana(
      semana({}, [
        { fecha: '2026-10-19', obligaciones: [] },
        { fecha: '2026-10-17', obligaciones: [] },
        { fecha: '2026-10-18', obligaciones: [] },
      ]),
    );
    expect(s.dias.map(d => d.fecha)).toEqual(['2026-10-17', '2026-10-18', '2026-10-19']);
  });

  it('los campos nuevos son opcionales: un backend sin ellos no rompe (obligación mínima)', () => {
    const s = leerSemana(
      semana({}, [{ fecha: '2026-10-17', obligaciones: [{ registroId: 'r9', titulo: 'Agua', estadoHabito: 'PENDIENTE' }] }]),
    );
    expect(s.dias[0].obligaciones[0]).toMatchObject({
      registroId: 'r9',
      requiereEvidencia: false,
      entrega: null,
      evidenciaId: null,
      respuestaTexto: null,
      evidencias: [],
      publicacionId: null,
    });
    expect(s.dias[0].acciones).toEqual([]);
    expect(s.dias[0].motivo).toBeNull();
  });

  it('si solo viene `evidenciaId` (sin la lista) la evidencia igual se puede abrir', () => {
    const s = leerSemana(
      semana({}, [
        { fecha: '2026-10-17', obligaciones: [{ registroId: 'r1', titulo: 'Agua', estadoHabito: 'COMPLETADO', evidenciaId: 'e7' }] },
      ]),
    );
    expect(s.dias[0].obligaciones[0].evidencias).toEqual([{ id: 'e7', tipo: null, subidaEn: null }]);
  });

  it('no duplica la evidencia que está en la lista y también en `evidenciaId`', () => {
    const s = leerSemana(semana());
    expect(s.dias[0].obligaciones[0].evidencias).toHaveLength(1);
  });

  it('el motivo del día se conserva para decirlo en palabras (nunca como ✗)', () => {
    const s = leerSemana(semana({}, [{ fecha: '2026-10-17', motivo: 'PAUSADO', obligaciones: [] }]));
    expect(s.dias[0].motivo).toBe('PAUSADO');
  });

  it('las acciones del día vienen con su evidencia', () => {
    const s = leerSemana(
      semana({}, [
        { fecha: '2026-10-17', obligaciones: [], acciones: [{ id: 'a1', titulo: 'Llamar a 3 clientes', estado: 'COMPLETADA', evidenciaId: 'e2' }] },
      ]),
    );
    expect(s.dias[0].acciones).toEqual([{ id: 'a1', titulo: 'Llamar a 3 clientes', estado: 'COMPLETADA', evidenciaId: 'e2' }]);
  });

  it('el post diario trae la publicación del Muro', () => {
    const s = leerSemana(
      semana({}, [
        {
          fecha: '2026-10-17',
          obligaciones: [{ ...OBLIGACION, evidencias: [], evidenciaId: null, publicacionId: 'pub1', titulo: 'Post diario en comunidad' }],
        },
      ]),
    );
    expect(s.dias[0].obligaciones[0].publicacionId).toBe('pub1');
  });

  it('sin fechas la respuesta no sirve y se dice, en vez de dibujar a medias', () => {
    expect(() => leerSemana({ personaId: 'p1', dias: [] })).toThrow(/Respuesta inesperada/);
  });

  it('un nombre ausente no se inventa', () => {
    expect(leerSemana(semana({ nombre: undefined })).nombre).toBeNull();
  });
});

describe('la publicación del Muro (contrato §4)', () => {
  it('lee el autor, el texto, la fecha y las fotos', () => {
    const p = aPublicacionDelMuro(
      validarRespuesta(
        cumplimientoDelLiderSchemas.publicacion,
        {
          id: 'pub1',
          authorName: 'Ana Pérez',
          authorAvatarUrl: null,
          text: 'Hoy corrí 5 km',
          createdAt: '2026-10-17T13:00:00Z',
          media: [{ url: 'https://s3/foto.jpg?X-Amz=1', mimeType: 'image/jpeg' }],
        },
        'prueba',
      ),
    );
    expect(p).toMatchObject({ autor: 'Ana Pérez', texto: 'Hoy corrí 5 km', creadaEn: '2026-10-17T13:00:00Z' });
    expect(p.fotos).toEqual([{ url: 'https://s3/foto.jpg?X-Amz=1' }]);
  });

  it('una publicación de solo foto o de solo texto sigue sirviendo', () => {
    const solaFoto = aPublicacionDelMuro(
      validarRespuesta(cumplimientoDelLiderSchemas.publicacion, { media: [{ url: 'https://s3/a.png' }] }, 'p'),
    );
    expect(solaFoto.texto).toBe('');
    expect(solaFoto.fotos).toHaveLength(1);
    const soloTexto = aPublicacionDelMuro(validarRespuesta(cumplimientoDelLiderSchemas.publicacion, { text: 'Hola' }, 'p'));
    expect(soloTexto.fotos).toEqual([]);
  });

  it('solo cuentan las fotos con una dirección de la red; el video no se dibuja como foto', () => {
    const p = aPublicacionDelMuro(
      validarRespuesta(
        cumplimientoDelLiderSchemas.publicacion,
        {
          media: [
            { url: 'about:blank#marcador', mimeType: 'image/png' },
            { url: 'https://s3/v.mp4', mimeType: 'video/mp4' },
            { url: 'https://s3/ok.jpg', mimeType: 'image/jpeg' },
          ],
        },
        'p',
      ),
    );
    expect(p.fotos).toEqual([{ url: 'https://s3/ok.jpg' }]);
  });
});
