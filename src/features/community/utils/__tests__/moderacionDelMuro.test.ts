/**
 * Moderar el Muro (pedido del dueño, 2026-10-31): quién ve el «…», cómo se clasifica un fallo, el orden de los
 * pedidos y la fusión de la relectura silenciosa. Sin React: todo lo que decide la función pura.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockOcultar = jest.fn<(id: string) => Promise<void>>();
const mockRestaurar = jest.fn<(id: string) => Promise<void>>();
const mockEliminar = jest.fn<(id: string) => Promise<void>>();
jest.mock('../../api/wallApi', () => ({
  ocultarPublicacion: (id: string) => mockOcultar(id),
  restaurarPublicacion: (id: string) => mockRestaurar(id),
  eliminarPublicacionParaSiempre: (id: string) => mockEliminar(id),
}));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import {
  clasificarFallo,
  clasificarLecturaDeOcultas,
  devolverAlMuro,
  eliminarDeLaCola,
  eliminarDesdeElMuro,
  fechaDeLaPublicacion,
  fusionarPrimeraPagina,
  ocultarEnElMuro,
  puedeModerarElMuro,
  rolModeraElMuro,
} from '../moderacionDelMuro';

const falla = (status: number, message = 'x') => Object.assign(new Error(message), { status });

beforeEach(() => {
  mockOcultar.mockReset().mockResolvedValue(undefined);
  mockRestaurar.mockReset().mockResolvedValue(undefined);
  mockEliminar.mockReset().mockResolvedValue(undefined);
});

describe('quién ve el «…» de moderación', () => {
  it.each(['ADMIN', 'ALCHEMIST', ' admin ', 'alchemist'])('%s con la capacidad del servidor: sí', rol => {
    expect(puedeModerarElMuro({ rol, administrar: true })).toBe(true);
  });

  it.each(['MENTOR_LEAD', 'MENTOR', 'TRAINEE_GUIDE', 'TRAINEE', 'IT_SUPPORT', '', null, undefined])(
    '%s: no, aunque el servidor dijera lo contrario',
    rol => {
      expect(puedeModerarElMuro({ rol, administrar: true })).toBe(false);
    },
  );

  it('ADMIN o ALCHEMIST sin la capacidad del servidor (o con la consulta caída): no', () => {
    expect(puedeModerarElMuro({ rol: 'ADMIN', administrar: false })).toBe(false);
    expect(puedeModerarElMuro({ rol: 'ALCHEMIST', administrar: false })).toBe(false);
  });

  it('rolModeraElMuro es la primera mitad: solo esos dos roles', () => {
    expect(rolModeraElMuro('ADMIN')).toBe(true);
    expect(rolModeraElMuro('ALCHEMIST')).toBe(true);
    expect(rolModeraElMuro('MENTOR_LEAD')).toBe(false);
    expect(rolModeraElMuro(undefined)).toBe(false);
  });
});

describe('clasificar un fallo', () => {
  it('403 sin permiso, 404 no existe, lo demás otro', () => {
    expect(clasificarFallo(falla(403))).toBe('sin_permiso');
    expect(clasificarFallo(falla(404))).toBe('no_existe');
    expect(clasificarFallo(falla(500))).toBe('otro');
    expect(clasificarFallo(falla(0))).toBe('otro');
    expect(clasificarFallo(new Error('sin status'))).toBe('otro');
    expect(clasificarFallo(null)).toBe('otro');
  });

  it('la lectura de la cola distingue sin permiso, sin red y error', () => {
    expect(clasificarLecturaDeOcultas(falla(403))).toBe('sin_permiso');
    expect(clasificarLecturaDeOcultas(falla(0))).toBe('sin_red');
    expect(clasificarLecturaDeOcultas(falla(500))).toBe('error');
    expect(clasificarLecturaDeOcultas(undefined)).toBe('error');
  });
});

describe('ocultar', () => {
  it('manda DELETE /wall/{id} y termina hecho', async () => {
    expect(await ocultarEnElMuro('p1')).toEqual({ tipo: 'hecho' });
    expect(mockOcultar).toHaveBeenCalledWith('p1');
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it('un 404 es «ya no está», sin error', async () => {
    mockOcultar.mockRejectedValue(falla(404));
    expect(await ocultarEnElMuro('p1')).toEqual({ tipo: 'ya_no_esta' });
  });

  it('un 403 es sin permiso y un 500 es un fallo con su error', async () => {
    mockOcultar.mockRejectedValueOnce(falla(403));
    expect(await ocultarEnElMuro('p1')).toEqual({ tipo: 'sin_permiso', quedoOculta: false });
    const error = falla(500, 'se cayó');
    mockOcultar.mockRejectedValueOnce(error);
    expect(await ocultarEnElMuro('p1')).toEqual({ tipo: 'fallo', error, quedoOculta: false });
  });
});

describe('eliminar para siempre desde una publicación visible del Muro', () => {
  it('primero la oculta y después la borra (el servidor solo borra lo que ya está oculto)', async () => {
    const orden: string[] = [];
    mockOcultar.mockImplementation(async () => void orden.push('ocultar'));
    mockEliminar.mockImplementation(async () => void orden.push('eliminar'));
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'hecho' });
    expect(orden).toEqual(['ocultar', 'eliminar']);
  });

  it('un 404 al ocultar no corta: puede que otra cuenta ya la haya ocultado, así que igual intenta borrarla', async () => {
    mockOcultar.mockRejectedValue(falla(404));
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'hecho' });
    expect(mockEliminar).toHaveBeenCalledWith('p1');
  });

  it('si tampoco está para borrarla, «ya no está»', async () => {
    mockOcultar.mockRejectedValue(falla(404));
    mockEliminar.mockRejectedValue(falla(404));
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'ya_no_esta' });
  });

  it('un 403 al ocultar corta sin intentar borrar', async () => {
    mockOcultar.mockRejectedValue(falla(403));
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'sin_permiso', quedoOculta: false });
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it('si ocultó y el borrado falla, avisa que quedó oculta', async () => {
    const error = falla(500, 'S3 no responde');
    mockEliminar.mockRejectedValue(error);
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'fallo', error, quedoOculta: true });
    mockEliminar.mockRejectedValue(falla(403));
    expect(await eliminarDesdeElMuro('p1')).toEqual({ tipo: 'sin_permiso', quedoOculta: true });
  });

  it('desde la cola es un solo pedido, sin ocultar de nuevo', async () => {
    expect(await eliminarDeLaCola('p1')).toEqual({ tipo: 'hecho' });
    expect(mockOcultar).not.toHaveBeenCalled();
    expect(mockEliminar).toHaveBeenCalledWith('p1');
  });
});

describe('devolver al Muro', () => {
  it('manda POST /wall/{id}/restore; 404 es «ya no está»; 403 es sin permiso', async () => {
    expect(await devolverAlMuro('p1')).toEqual({ tipo: 'hecho' });
    expect(mockRestaurar).toHaveBeenCalledWith('p1');
    mockRestaurar.mockRejectedValueOnce(falla(404));
    expect(await devolverAlMuro('p1')).toEqual({ tipo: 'ya_no_esta' });
    mockRestaurar.mockRejectedValueOnce(falla(403));
    expect(await devolverAlMuro('p1')).toMatchObject({ tipo: 'sin_permiso' });
  });
});

function post(id: string, cambios: Partial<PostItem> = {}): PostItem {
  return {
    id,
    author: 'Ana',
    avatar: '👤',
    cell: '',
    diaPrograma: null,
    timeAgo: 'Hace un momento',
    text: id,
    media: [],
    likes: 0,
    comments: [],
    ...cambios,
  };
}

describe('la relectura silenciosa del Muro', () => {
  it('pone al día la primera página, conserva los comentarios abiertos y las que se están publicando', () => {
    const comentarios = [{ id: 'c1', author: 'Beto', avatar: '👤', text: 'hola', likes: 0, userReaction: null, timeAgo: 'Ayer' }];
    const previas = [post('nueva', { pendiente: true }), post('a', { comments: comentarios, likes: 1 }), post('b')];
    const { posts } = fusionarPrimeraPagina(previas, [post('a', { likes: 4 }), post('b'), post('c')]);
    expect(posts.map(p => p.id)).toEqual(['nueva', 'a', 'b', 'c']);
    expect(posts[1].likes).toBe(4);
    expect(posts[1].comments).toEqual(comentarios);
  });

  it('una publicación devuelta aparece arriba, y lo que ya estaba más abajo se queda en su lugar', () => {
    const previas = [post('a'), post('b'), post('c'), post('d')];
    const { posts, hayMasAbajo } = fusionarPrimeraPagina(previas, [post('devuelta'), post('a'), post('b')]);
    expect(posts.map(p => p.id)).toEqual(['devuelta', 'a', 'b', 'c', 'd']);
    expect(hayMasAbajo).toBe(true);
  });

  it('si la lista era justo la primera página, dice que no hay más abajo (el cursor nuevo manda)', () => {
    const { posts, hayMasAbajo } = fusionarPrimeraPagina([post('a'), post('b')], [post('a'), post('b'), post('c')]);
    expect(posts.map(p => p.id)).toEqual(['a', 'b', 'c']);
    expect(hayMasAbajo).toBe(false);
  });
});

describe('la fecha de la publicación', () => {
  it('usa el día y la hora del teléfono, no los del texto ISO', () => {
    // 2026-10-31T02:04Z son las 21:04 del 30 de octubre en Lima (las pruebas corren en America/Lima).
    expect(fechaDeLaPublicacion('2026-10-31T02:04:00Z')).toBe('30 de octubre, 21:04');
  });

  it('una fecha ilegible no dice nada', () => {
    expect(fechaDeLaPublicacion('no es una fecha')).toBe('');
  });
});
