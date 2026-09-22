import { describe, expect, it } from '@jest/globals';

import { aAudioterapiaSemanal } from '../audioterapiaApi';

/**
 * El backend devuelve los cuatro campos en `null` cuando todavía no cargaron el audio de la
 * semana (`EsperandoContenido`), y eso NO es un error: es un estado que la pantalla tiene que
 * saber pintar. Este mapeo es el que lo convierte en algo ramificable.
 */
describe('aAudioterapiaSemanal', () => {
  it('reconoce el audio de la semana', () => {
    const r = aAudioterapiaSemanal({
      semana: 3,
      titulo: 'Soltar el control',
      url: 'https://s3/audio-3.mp3',
      diaSiguienteCambio: 22,
    });
    expect(r).toEqual({
      estado: 'con_audio',
      semana: 3,
      titulo: 'Soltar el control',
      url: 'https://s3/audio-3.mp3',
      diaSiguienteCambio: 22,
    });
  });

  it('cuando no hay contenido cargado, lo dice', () => {
    expect(aAudioterapiaSemanal({ semana: null, titulo: null, url: null, diaSiguienteCambio: null }))
      .toEqual({ estado: 'esperando_contenido' });
  });

  /* Lo que decide que hay audio es la URL. Un título sin archivo sería una tarjeta que invita a
     escuchar algo que no suena: peor que no mostrar nada. */
  it('sin URL no hay audio, aunque venga el título', () => {
    expect(aAudioterapiaSemanal({ semana: 3, titulo: 'Soltar el control', url: null, diaSiguienteCambio: null }))
      .toEqual({ estado: 'esperando_contenido' });
  });

  /* El título puede faltar y el audio seguir siendo reproducible: ahí se nombra por su semana en
     vez de dejar el encabezado vacío. */
  it('sin título, se nombra por la semana', () => {
    const r = aAudioterapiaSemanal({ semana: 5, titulo: null, url: 'https://s3/a.mp3', diaSiguienteCambio: null });
    expect(r).toEqual({
      estado: 'con_audio',
      semana: 5,
      titulo: 'Semana 5',
      url: 'https://s3/a.mp3',
      diaSiguienteCambio: null,
    });
  });
});
