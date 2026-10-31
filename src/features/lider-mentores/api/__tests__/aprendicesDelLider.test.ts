import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * «Todos los aprendices» del líder (2026-10-31): las rutas, la lectura de la lista y la tolerancia del esquema. Una fila
 * rota se pierde sola, no la lista; y las cuatro lecturas de una persona tienen su puerta sin grupo.
 */

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { rutaDeLosCierresDePersona } from '../../../cierre/api/cierreApi';
import { rutaDeLosHuecosDePersona } from '../../../huecos/api/huecosApi';
import { obtenerAprendicesDelLider, rutaDeLosAprendices } from '../aprendicesDelLiderApi';
import { aSemanaDePersona, cumplimientoDelLiderSchemas } from '../cumplimientoDelLiderSchemas';
import { obtenerSemanaDePersona, rutaDeLaSemanaDePersona, rutaDelRadarDePersona } from '../cumplimientoDelLiderApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('la lista de todos los aprendices (contrato)', () => {
  it('pide a /leadership/people con q, page y size', () => {
    expect(rutaDeLosAprendices({ q: '', pagina: 0, tamano: 30 })).toBe('/api/v1/leadership/people?q=&page=0&size=30');
    expect(rutaDeLosAprendices({ q: 'ana', pagina: 2, tamano: 30 })).toBe('/api/v1/leadership/people?q=ana&page=2&size=30');
  });

  it('el texto va escapado: una `&` o un `#` no cambian a qué se pregunta, y las tildes viajan tal cual para que el servidor las ignore', () => {
    expect(rutaDeLosAprendices({ q: 'a&b#c', pagina: 0, tamano: 30 })).toBe('/api/v1/leadership/people?q=a%26b%23c&page=0&size=30');
    expect(rutaDeLosAprendices({ q: 'José', pagina: 0, tamano: 30 })).toContain('q=Jos%C3%A9');
  });

  it('por defecto pide la primera página de 30 y recorta el texto', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [], page: 0, size: 30, total: 0 });
    await obtenerAprendicesDelLider({ q: '  ana  ' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people?q=ana&page=0&size=30', undefined);
  });
});

describe('la lectura de la lista', () => {
  it('lee a quien tiene grupo y a quien no, con su día', async () => {
    mockApiFetch.mockResolvedValueOnce({
      items: [
        { personId: 'u1', nombre: 'Ana Pérez', photoPath: '/api/v1/x/foto', grupoId: 'g1', grupoNombre: 'Grupo Fénix', mentorNombre: 'Luisa', diaPrograma: 12 },
        { personId: 'u2', nombre: 'Beto', photoPath: null, grupoId: null, grupoNombre: null, mentorNombre: null, diaPrograma: null },
      ],
      page: 0,
      size: 30,
      total: 2,
    });
    const pagina = await obtenerAprendicesDelLider();
    expect(pagina.items).toEqual([
      { personaId: 'u1', nombre: 'Ana Pérez', fotoPath: '/api/v1/x/foto', grupoId: 'g1', grupoNombre: 'Grupo Fénix', mentorNombre: 'Luisa', diaPrograma: 12 },
      { personaId: 'u2', nombre: 'Beto', fotoPath: null, grupoId: null, grupoNombre: null, mentorNombre: null, diaPrograma: null },
    ]);
    expect(pagina.total).toBe(2);
    expect(pagina.hayMas).toBe(false);
  });

  it('una fila rota se pierde sola, no la lista', async () => {
    mockApiFetch.mockResolvedValueOnce({
      items: [
        { personId: 'u1', nombre: 'Ana' },
        { nombre: 'Sin id' },
        'basura',
        null,
        { personId: '', nombre: 'Id vacío' },
        { personId: 'u2', nombre: 'Beto', diaPrograma: 'tres' },
        { personId: 'u3', nombre: 'Carla' },
      ],
      total: 7,
    });
    const pagina = await obtenerAprendicesDelLider();
    expect(pagina.items.map(f => f.personaId)).toEqual(['u1', 'u3']);
  });

  it('un nombre vacío no esconde a la persona, y el día 0 no se dice como un día del programa', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [{ personId: 'u1', nombre: '   ', diaPrograma: 0 }] });
    const [fila] = (await obtenerAprendicesDelLider()).items;
    expect(fila.nombre).toBe('Persona sin nombre');
    expect(fila.diaPrograma).toBeNull();
  });

  it('hay una página siguiente según el total; sin total, si la página vino llena (las filas rotas también ocuparon su lugar)', async () => {
    const treinta = Array.from({ length: 30 }, (_, i) => ({ personId: `u${i}`, nombre: `P${i}` }));
    mockApiFetch.mockResolvedValueOnce({ items: treinta, page: 0, size: 30, total: 31 });
    expect((await obtenerAprendicesDelLider()).hayMas).toBe(true);
    mockApiFetch.mockResolvedValueOnce({ items: treinta, page: 0, size: 30, total: 30 });
    expect((await obtenerAprendicesDelLider()).hayMas).toBe(false);
    mockApiFetch.mockResolvedValueOnce({ items: treinta });
    expect((await obtenerAprendicesDelLider()).hayMas).toBe(true);
    mockApiFetch.mockResolvedValueOnce({ items: treinta.slice(0, 5) });
    expect((await obtenerAprendicesDelLider()).hayMas).toBe(false);
    mockApiFetch.mockResolvedValueOnce({ items: [], total: 40 });
    expect((await obtenerAprendicesDelLider({ pagina: 3 })).hayMas).toBe(false);
  });

  it('una respuesta que no es una lista es un error, no una lista vacía', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: 'no' });
    await expect(obtenerAprendicesDelLider()).rejects.toThrow(/Respuesta inesperada de GET \/leadership\/people/);
    mockApiFetch.mockResolvedValueOnce([]);
    await expect(obtenerAprendicesDelLider()).rejects.toThrow(/Respuesta inesperada/);
  });
});

describe('la puerta sin grupo de una persona', () => {
  it('con un grupo, las rutas de siempre', () => {
    expect(rutaDeLaSemanaDePersona('g1', 'u1')).toBe('/api/v1/leadership/groups/g1/people/u1/week');
    expect(rutaDelRadarDePersona('g1', 'u1')).toBe('/api/v1/leadership/groups/g1/people/u1/radar');
    expect(rutaDeLosHuecosDePersona('g1', 'u1', '2026-10-26')).toBe('/api/v1/leadership/groups/g1/people/u1/huecos?semana=2026-10-26');
    expect(rutaDeLosCierresDePersona('g1', 'u1')).toBe('/api/v1/leadership/groups/g1/people/u1/cierres');
  });

  it('con `null`, /leadership/people/{p}/… para la semana, el Radar, el tiempo libre y los cierres', () => {
    expect(rutaDeLaSemanaDePersona(null, 'u1')).toBe('/api/v1/leadership/people/u1/week');
    expect(rutaDelRadarDePersona(null, 'u1')).toBe('/api/v1/leadership/people/u1/radar');
    expect(rutaDelRadarDePersona(null, 'u1', 'c1')).toBe('/api/v1/leadership/people/u1/radar?cursor=c1');
    expect(rutaDeLosHuecosDePersona(null, 'u1')).toBe('/api/v1/leadership/people/u1/huecos');
    expect(rutaDeLosHuecosDePersona(null, 'u1', '2026-10-26')).toBe('/api/v1/leadership/people/u1/huecos?semana=2026-10-26');
    expect(rutaDeLosCierresDePersona(null, 'u1', '2026-10-26')).toBe('/api/v1/leadership/people/u1/cierres?semana=2026-10-26');
  });

  it('la fecha de la semana viaja con los dos nombres, para que no se pierda en silencio', () => {
    expect(rutaDeLaSemanaDePersona(null, 'u1', '2026-10-30')).toBe(
      '/api/v1/leadership/people/u1/week?semanaHasta=2026-10-30&hasta=2026-10-30',
    );
    /* Desde un grupo, la de siempre y nada más. */
    expect(rutaDeLaSemanaDePersona('g1', 'u1', '2026-10-30')).toBe(
      '/api/v1/leadership/groups/g1/people/u1/week?semanaHasta=2026-10-30',
    );
  });

  it('un id con `/` o `%` no cambia a qué ruta se llama', () => {
    expect(rutaDeLaSemanaDePersona(null, 'c%d/e')).toBe('/api/v1/leadership/people/c%25d%2Fe/week');
  });

  it('la semana se lee por esa puerta', async () => {
    mockApiFetch.mockResolvedValueOnce({ desde: '2026-10-24', hasta: '2026-10-30', personaId: 'u1' });
    await obtenerSemanaDePersona(null, 'u1', null);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/u1/week', undefined);
  });
});

describe('puedeAvisarAlMentor', () => {
  const base = { desde: '2026-10-24', hasta: '2026-10-30' };
  const leer = (extra: object) => aSemanaDePersona(cumplimientoDelLiderSchemas.semana.parse({ ...base, ...extra }));

  it('lo que dice el servidor, tal cual', () => {
    expect(leer({ puedeAvisarAlMentor: true }).puedeAvisarAlMentor).toBe(true);
    expect(leer({ puedeAvisarAlMentor: false }).puedeAvisarAlMentor).toBe(false);
  });

  it('si no lo dice (un backend anterior) o dice otra cosa, es «no lo dijo», no un falso', () => {
    expect(leer({}).puedeAvisarAlMentor).toBeNull();
    expect(leer({ puedeAvisarAlMentor: null }).puedeAvisarAlMentor).toBeNull();
    expect(leer({ puedeAvisarAlMentor: 'sí' }).puedeAvisarAlMentor).toBeNull();
  });
});
