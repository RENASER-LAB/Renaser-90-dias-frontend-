import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../services/http/apiClient', () => {
  const real = jest.requireActual<typeof import('../../../services/http/apiClient')>('../../../services/http/apiClient');
  return { ...real, apiFetch: jest.fn() };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { apiFetch } from '../../../services/http/apiClient';
import { obtenerCursosBloqueados, obtenerMisCursos } from '../../academy/api/cursosApi';
import { abrirConversacionDirecta, obtenerConversaciones, obtenerMiembrosGlobal, obtenerSoportes } from '../../chat/api/chatApi';
import { obtenerFeedMuro, obtenerPublicacionesOcultas, publicarEnMuro } from '../../community/api/wallApi';
import { crearTestimonio, obtenerTestimonios } from '../../community/api/testimoniosApi';
import { crearEvento, listarEventos, listarProximos } from '../../eventos/api/eventosApi';
import { obtenerRankingAgregado } from '../../ranking/api/rankingApi';
import {
  elegirFormacionDeLaComunidad,
  fijarLaEleccionRecordada,
  formacionDeLaLectura,
  prepararLaFormacionDeLaComunidad,
  reiniciarLaFormacionDeLaComunidad,
} from '../estado/formacionDeLaComunidad';

const pedido = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  pedido.mockReset();
  reiniciarLaFormacionDeLaComunidad();
});

const ultimaRuta = () => pedido.mock.calls[pedido.mock.calls.length - 1][0] as string;
const ultimoCuerpo = () => (pedido.mock.calls[pedido.mock.calls.length - 1][1] as { body?: unknown } | undefined)?.body;

describe('las lecturas de la Comunidad llevan ?formation= solo si se les pasa', () => {
  it('sin formación, cada ruta es la de siempre (aprendiz, mentor, líder, y Administración leyendo «Todas»)', async () => {
    pedido.mockResolvedValue({ posts: [], nextCursor: null });
    await obtenerFeedMuro();
    expect(ultimaRuta()).toBe('/api/v1/wall');
    await obtenerFeedMuro('abc', 'LOGROS');
    expect(ultimaRuta()).toBe('/api/v1/wall?cursor=abc&category=LOGROS');
    await obtenerPublicacionesOcultas();
    expect(ultimaRuta()).toBe('/api/v1/wall/hidden');

    pedido.mockResolvedValue([]);
    await obtenerMisCursos();
    expect(ultimaRuta()).toBe('/api/v1/cursos');
    await obtenerCursosBloqueados();
    expect(ultimaRuta()).toBe('/api/v1/cursos/bloqueados');
    await obtenerConversaciones();
    expect(ultimaRuta()).toBe('/api/v1/chat/conversations');
    await listarEventos(new Date('2026-11-01T10:00:00Z'), new Date('2026-11-30T10:00:00Z'));
    expect(ultimaRuta()).not.toContain('formation');
    await listarProximos(Date.UTC(2026, 10, 1));
    expect(ultimaRuta()).not.toContain('formation');
    await obtenerTestimonios();
    expect(ultimaRuta()).toBe('/api/v1/testimonios');

    pedido.mockResolvedValue({ conversations: [], nextCursor: null, hasMore: false });
    await obtenerSoportes({ tamano: 25 });
    expect(ultimaRuta()).toBe('/api/v1/chat/support-conversations?size=25');

    pedido.mockResolvedValue({ members: [], nextCursor: null });
    await obtenerMiembrosGlobal();
    expect(ultimaRuta()).toBe('/api/v1/chat/conversations/global/members');

    pedido.mockResolvedValue({ fecha: '2026-10-31', celula: null, liga: [], coherenciaIndividual: [], general: [] });
    await obtenerRankingAgregado();
    expect(ultimaRuta()).toBe('/api/v1/ranking');
    await obtenerRankingAgregado('2026-10-30');
    expect(ultimaRuta()).toBe('/api/v1/ranking?fecha=2026-10-30');
  });

  it('con una formación elegida, las doce lecturas la llevan', async () => {
    pedido.mockResolvedValue({ posts: [], nextCursor: null });
    await obtenerFeedMuro(undefined, undefined, 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/wall?formation=DIPLOMADO');
    await obtenerFeedMuro('abc', undefined, 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/wall?cursor=abc&formation=DIPLOMADO');
    await obtenerPublicacionesOcultas('xyz', 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/wall/hidden?cursor=xyz&formation=DIPLOMADO');

    pedido.mockResolvedValue([]);
    await obtenerMisCursos('DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/cursos?formation=DIPLOMADO');
    await obtenerCursosBloqueados('DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/cursos/bloqueados?formation=DIPLOMADO');
    await obtenerConversaciones('CERTIFICACION');
    expect(ultimaRuta()).toBe('/api/v1/chat/conversations?formation=CERTIFICACION');
    await listarEventos(new Date('2026-11-01T10:00:00Z'), new Date('2026-11-30T10:00:00Z'), 'DIPLOMADO');
    expect(ultimaRuta()).toMatch(/^\/api\/v1\/calendar\/events\?from=.*&to=.*&formation=DIPLOMADO$/);
    await listarProximos(Date.UTC(2026, 10, 1), 60, 'DIPLOMADO');
    expect(ultimaRuta()).toMatch(/&formation=DIPLOMADO$/);
    await obtenerTestimonios('DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/testimonios?formation=DIPLOMADO');

    pedido.mockResolvedValue({ conversations: [], nextCursor: null, hasMore: false });
    await obtenerSoportes({ tamano: 25, texto: 'ana', formation: 'DIPLOMADO' });
    expect(ultimaRuta()).toBe('/api/v1/chat/support-conversations?q=ana&size=25&formation=DIPLOMADO');

    pedido.mockResolvedValue({ members: [], nextCursor: null });
    await obtenerMiembrosGlobal('c1', 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/chat/conversations/global/members?cursor=c1&formation=DIPLOMADO');

    pedido.mockResolvedValue({ fecha: '2026-10-31', celula: null, liga: [], coherenciaIndividual: [], general: [] });
    await obtenerRankingAgregado(undefined, 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/ranking?formation=DIPLOMADO');
    await obtenerRankingAgregado('2026-10-30', 'DIPLOMADO');
    expect(ultimaRuta()).toBe('/api/v1/ranking?fecha=2026-10-30&formation=DIPLOMADO');
  });
});

describe('lo que se crea lleva la formación en el cuerpo, solo si se le pasa', () => {
  it('publicar en el Muro: el cuerpo de siempre sin formación; con ella, un campo más', async () => {
    pedido.mockResolvedValue({ id: 'p1' });
    await publicarEnMuro('hola', [{ url: 'ruta', mimeType: 'image/jpeg' }], 'LOGROS').catch(() => undefined);
    expect(ultimoCuerpo()).toEqual({ text: 'hola', media: [{ url: 'ruta', mimeType: 'image/jpeg' }], category: 'LOGROS' });
    await publicarEnMuro('hola', [{ url: 'ruta', mimeType: 'image/jpeg' }], null, 'DIPLOMADO').catch(() => undefined);
    expect(ultimoCuerpo()).toEqual({ text: 'hola', media: [{ url: 'ruta', mimeType: 'image/jpeg' }], category: null, formation: 'DIPLOMADO' });
  });

  it('crear un evento y un testimonio a mano', async () => {
    pedido.mockResolvedValue({ id: 'e1', title: 'Charla', startsAt: '2026-11-05T15:00:00Z' });
    await crearEvento({ title: 'Charla' });
    expect(ultimoCuerpo()).toEqual({ title: 'Charla' });
    await crearEvento({ title: 'Charla' }, 'CERTIFICACION');
    expect(ultimoCuerpo()).toEqual({ title: 'Charla', formation: 'CERTIFICACION' });

    pedido.mockResolvedValue({ id: 't1', texto: 'Me cambió la vida' });
    await crearTestimonio({ nombre: 'Ana', rol: 'Aprendiz', texto: 'Me cambió la vida' });
    expect(ultimoCuerpo()).toEqual({ nombre: 'Ana', rol: 'Aprendiz', texto: 'Me cambió la vida' });
    await crearTestimonio({ nombre: 'Ana', rol: 'Aprendiz', texto: 'Me cambió la vida' }, 'DIPLOMADO');
    expect(ultimoCuerpo()).toEqual({ nombre: 'Ana', rol: 'Aprendiz', texto: 'Me cambió la vida', formation: 'DIPLOMADO' });
  });

  it('abrir un directo: el cuerpo de siempre, y la formación solo para desempatar', async () => {
    pedido.mockResolvedValue({ id: 'c1', type: 'DIRECT', celulaId: null, nombre: null, createdAt: '2026-10-31T10:00:00Z' });
    await abrirConversacionDirecta('u2');
    expect(ultimoCuerpo()).toEqual({ otherUserId: 'u2' });
    await abrirConversacionDirecta('u2', 'DIPLOMADO');
    expect(ultimoCuerpo()).toEqual({ otherUserId: 'u2', formation: 'DIPLOMADO' });
  });
});

describe('quién llena el parámetro: solo quien ve todas y eligió una', () => {
  it('el aprendiz, el mentor o el líder nunca tienen una formación para leer', () => {
    prepararLaFormacionDeLaComunidad('aprendiz-1', false);
    elegirFormacionDeLaComunidad('DIPLOMADO');
    expect(formacionDeLaLectura()).toBeNull();
  });

  it('Administración la tiene solo después de elegir', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    expect(formacionDeLaLectura()).toBeNull();
    elegirFormacionDeLaComunidad('CERTIFICACION');
    expect(formacionDeLaLectura()).toBe('CERTIFICACION');
  });
});
