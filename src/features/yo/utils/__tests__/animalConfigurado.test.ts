import { describe, expect, it } from '@jest/globals';

import type { AnimalDeFase } from '../../data/animalesDeFase';
import { animalConfigurado } from '../animalConfigurado';

const PORDEFECTO: AnimalDeFase = { nombre: 'Gorila', imagen: 7 };
const configurado = (parte: object) => ({ fase: 2, personalizada: false, ...parte });

describe('animalConfigurado', () => {
  it('sin nada configurado sale el animal que trae la app', () => {
    expect(animalConfigurado(PORDEFECTO, null)).toEqual({ nombre: 'Gorila', imagen: 7, imagenDeRespaldo: 7 });
    expect(animalConfigurado(PORDEFECTO, configurado({ nombre: null, imagenUrl: null }))).toEqual({
      nombre: 'Gorila', imagen: 7, imagenDeRespaldo: 7,
    });
  });

  it('con imagen configurada usa la URL, la ruta como clave de caché y deja la de la app de respaldo', () => {
    const r = animalConfigurado(PORDEFECTO, configurado({ imagenUrl: 'https://s3/x?firma=1', imagenRuta: 'fases/animales/2/a', personalizada: true }));
    expect(r.imagen).toEqual({ uri: 'https://s3/x?firma=1', cacheKey: 'fases/animales/2/a' });
    expect(r.imagenDeRespaldo).toBe(7);
  });

  it('el nombre configurado le gana al de la app; uno en blanco no', () => {
    expect(animalConfigurado(PORDEFECTO, configurado({ nombre: 'Gorila de montaña' })).nombre).toBe('Gorila de montaña');
    expect(animalConfigurado(PORDEFECTO, configurado({ nombre: '   ' })).nombre).toBe('Gorila');
  });
});
