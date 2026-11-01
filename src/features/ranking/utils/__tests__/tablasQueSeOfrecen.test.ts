/**
 * Spec 023 aplicada al ranking: «Kilómetros» y «Gimnasio» solo si el catálogo de la formación tiene KILÓMETROS DIARIOS (`DAILY_KM`) o GIMNASIO
 * (`WORKOUT`); sin catálogo leído salen las cuatro.
 */
import { describe, expect, it } from '@jest/globals';

import { tablasQueSeOfrecen } from '../tablasQueSeOfrecen';

const titulos = (claves: ReadonlyArray<string | null | undefined> | null) => tablasQueSeOfrecen(claves).map(t => t.titulo);

describe('tablasQueSeOfrecen', () => {
  it('sin catálogo leído (null, falló o vacío) salen las cuatro, como antes de las formaciones', () => {
    expect(titulos(null)).toEqual(['General', 'Coherencia', 'Kilómetros', 'Gimnasio']);
    expect(titulos([])).toEqual(['General', 'Coherencia', 'Kilómetros', 'Gimnasio']);
  });

  it('un catálogo con los dos hábitos (la Escuela) ofrece las cuatro', () => {
    expect(titulos(['WAKE_UP', 'DAILY_KM', 'WORKOUT', null])).toEqual(['General', 'Coherencia', 'Kilómetros', 'Gimnasio']);
  });

  it('un catálogo sin KILÓMETROS DIARIOS esconde Kilómetros', () => {
    expect(titulos(['WAKE_UP', 'WORKOUT'])).toEqual(['General', 'Coherencia', 'Gimnasio']);
  });

  it('un catálogo sin GIMNASIO esconde Gimnasio', () => {
    expect(titulos(['WAKE_UP', 'DAILY_KM'])).toEqual(['General', 'Coherencia', 'Kilómetros']);
  });

  it('el Diplomado o la Certificación recién creados (sin ninguno de los dos) solo ofrecen General y Coherencia', () => {
    expect(titulos(['WAKE_UP', 'SLEEP', null, undefined])).toEqual(['General', 'Coherencia']);
  });
});
