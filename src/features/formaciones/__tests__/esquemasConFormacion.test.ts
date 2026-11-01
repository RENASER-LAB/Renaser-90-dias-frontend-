import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../services/http/apiClient', () => {
  const real = jest.requireActual<typeof import('../../../services/http/apiClient')>('../../../services/http/apiClient');
  return { ...real, apiFetch: jest.fn() };
});

import { academySchemas } from '../../academy/api/academySchemas';
import { mapearCursoBloqueado, mapearCursoConSecciones } from '../../academy/api/academyMappers';
import { wireConversacionResumenSchema } from '../../chat/api/chatSchemas';
import { mapearResumenConversacion } from '../../chat/api/chatMappers';
import { wallFeedPageSchema, paginaDeOcultasTolerante } from '../../community/api/wallSchemas';
import { mapearPublicacion } from '../../community/api/wallMappers';
import { leerTestimonios } from '../../community/api/testimoniosApi';
import { leerOcurrencias } from '../../eventos/api/eventosSchemas';
import { formacionTolerante } from '../api/formacionTolerante';

describe('el campo formation es opcional y tolerante en cada fila de la Comunidad (spec 024)', () => {
  it('formacionTolerante: ausente queda ausente; un texto se conserva; cualquier otra cosa es null', () => {
    expect(formacionTolerante.parse(undefined)).toBeUndefined();
    expect(formacionTolerante.parse(null)).toBeNull();
    expect(formacionTolerante.parse('DIPLOMADO')).toBe('DIPLOMADO');
    expect(formacionTolerante.parse(7)).toBeNull();
    expect(formacionTolerante.parse({ x: 1 })).toBeNull();
  });

  const publicacion = (extra: Record<string, unknown> = {}) => ({
    id: 'p1',
    authorId: 'u1',
    authorName: 'Ana',
    authorAvatarUrl: null,
    type: 'MANUAL',
    category: null,
    text: 'hola',
    media: [],
    createdAt: '2026-10-31T10:00:00Z',
    reactionCounts: {},
    myReactions: [],
    commentCount: 0,
    ...extra,
  });

  it('Muro: un servidor anterior no la manda y la publicación queda idéntica; con ella la fila la lleva; un valor raro no tumba el feed', () => {
    const sin = wallFeedPageSchema.safeParse({ posts: [publicacion()], nextCursor: null });
    expect(sin.success).toBe(true);
    expect('formation' in (sin.success ? sin.data.posts[0] : {})).toBe(false);
    expect(sin.success && mapearPublicacion(sin.data.posts[0] as never)).not.toHaveProperty('formacion');

    const con = wallFeedPageSchema.safeParse({ posts: [publicacion({ formation: 'DIPLOMADO' })], nextCursor: null });
    expect(con.success && mapearPublicacion(con.data.posts[0] as never).formacion).toBe('DIPLOMADO');

    const rara = wallFeedPageSchema.safeParse({ posts: [publicacion({ formation: 123 })], nextCursor: null });
    expect(rara.success).toBe(true);
    expect(rara.success && mapearPublicacion(rara.data.posts[0] as never)).not.toHaveProperty('formacion');
  });

  it('la cola de ocultas conserva la formación de cada fila', () => {
    const pagina = paginaDeOcultasTolerante({ posts: [publicacion({ formation: 'CERTIFICACION' }), { roto: true }], nextCursor: null }, 'GET /wall/hidden');
    expect(pagina.posts).toHaveLength(1);
    expect(pagina.posts[0]).toMatchObject({ id: 'p1', formation: 'CERTIFICACION' });
  });

  it('Eventos: la ocurrencia trae la formación del evento solo si el servidor la mandó', () => {
    const fila = (extra: Record<string, unknown> = {}) => ({
      event: { id: 'e1', title: 'Charla', startsAt: '2026-11-05T15:00:00Z', ...extra },
      occurrenceStart: '2026-11-05T15:00:00Z',
    });
    const [sin] = leerOcurrencias([fila()]);
    expect(sin.evento).not.toHaveProperty('formacion');
    const [con] = leerOcurrencias([fila({ formation: 'DIPLOMADO' })]);
    expect(con.evento.formacion).toBe('DIPLOMADO');
    const [rara] = leerOcurrencias([fila({ formation: ['x'] })]);
    expect(rara.evento).not.toHaveProperty('formacion');
  });

  it('Cursos: el curso accesible y el bloqueado llevan la formación solo si viene', () => {
    const base = {
      id: 'c1', slug: 'curso', titulo: 'Curso', descripcion: null, portadaUrl: null, orden: 1, publicado: true, acceso: 'abierto',
      origen: 'MANUAL', diaDesbloqueo: null, rolesPermitidos: [], creadoEn: '2026-10-01T00:00:00Z', actualizadoEn: '2026-10-01T00:00:00Z',
      progreso: { cursoId: 'c1', totalLecciones: 0, completadas: 0, ultimaLeccionId: null }, portadaFirmada: null,
    };
    const lista = academySchemas.misCursos.parse([base, { ...base, id: 'c2', formation: 'DIPLOMADO' }, { ...base, id: 'c3', formation: 9 }]) as Array<
      typeof base & { formation?: string | null }
    >;
    expect(mapearCursoConSecciones(lista[0] as never, [])).not.toHaveProperty('formacion');
    expect(mapearCursoConSecciones(lista[1] as never, []).formacion).toBe('DIPLOMADO');
    expect(mapearCursoConSecciones(lista[2] as never, [])).not.toHaveProperty('formacion');

    const bloqueados = academySchemas.cursosBloqueados.parse([
      { id: 'b1', titulo: 'Futuro', portadaUrl: null, portadaFirmada: null, orden: 2, diaDesbloqueo: 20, programDayActual: 5, formation: 'CERTIFICACION' },
    ]) as Array<{ id: string; titulo: string; portadaUrl: null; portadaFirmada: null; orden: number; diaDesbloqueo: number; programDayActual: number; formation?: string }>;
    expect(mapearCursoBloqueado(bloqueados[0]).formacion).toBe('CERTIFICACION');
  });

  it('Chats: la conversación trae la formación solo si viene, y un valor raro no deja sin bandeja', () => {
    const resumen = (extra: Record<string, unknown> = {}) => ({
      conversation: { id: 'x1', type: 'GLOBAL', celulaId: null, nombre: 'Diplomado Renaser Global', createdAt: '2026-10-31T10:00:00Z', ...extra },
      lastMessage: null,
      unreadCount: 0,
    });
    const sin = wireConversacionResumenSchema.parse(resumen());
    expect(mapearResumenConversacion(sin as never, 'u1', {})).not.toHaveProperty('formacion');
    const con = wireConversacionResumenSchema.parse(resumen({ formation: 'DIPLOMADO' }));
    expect(mapearResumenConversacion(con as never, 'u1', {}).formacion).toBe('DIPLOMADO');
    const rara = wireConversacionResumenSchema.safeParse(resumen({ formation: { x: 1 } }));
    expect(rara.success).toBe(true);
    expect(rara.success && mapearResumenConversacion(rara.data as never, 'u1', {})).not.toHaveProperty('formacion');
  });

  it('Testimonios: una fila rota se pierde sola, una sin texto no se dibuja y la formación se conserva', () => {
    const lista = leerTestimonios([
      { id: 't1', nombre: ' Ana ', rol: 'Aprendiz', texto: 'Me cambió la vida', estrellas: 5, formation: 'DIPLOMADO', createdAt: '2026-10-31T10:00:00Z' },
      { id: 't2', texto: '   ' },
      { sinId: true },
      { id: 't3', texto: 'Sin nombre', estrellas: 'x', formation: 4 },
    ]);
    expect(lista.map(t => t.id)).toEqual(['t1', 't3']);
    expect(lista[0]).toMatchObject({ nombre: 'Ana', rol: 'Aprendiz', estrellas: 5, formacion: 'DIPLOMADO' });
    expect(lista[1]).toMatchObject({ nombre: 'Miembro Renaser', estrellas: null });
    expect(lista[1]).not.toHaveProperty('formacion');
    expect(() => leerTestimonios({ no: 'es lista' })).toThrow();
  });
});
