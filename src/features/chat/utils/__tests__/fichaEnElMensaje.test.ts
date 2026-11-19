import { describe, expect, it } from '@jest/globals';

import { fichaEnElMensaje } from '../fichaEnElMensaje';

/**
 * Spec 056 FR-019 y SC-005: «Avisar a su mentor» le llega al mentor como un mensaje en su chat con el líder; el servidor le agrega al final una línea
 * `Ficha de <nombre>: /mentor/groups/<grupo>/learners/<persona>` (`AvisoAlMentorService.mensajeConEnlace`). El chat la reconoce SOLO en esa forma exacta y
 * solo para esa ruta, para mostrarla como «Abrir la ficha de <nombre>»: lo demás se queda como texto.
 */
const G = '3f2b8c1e-0a4d-4e7b-9c55-1a2b3c4d5e6f';
const P = '9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const LINEA = `Ficha de Ana López: /mentor/groups/${G}/learners/${P}`;

describe('la ficha de un aprendiz dentro de un mensaje de «Avisar a su mentor»', () => {
  it('separa el texto del líder de la línea final y entrega el nombre, los dos ids y la ruta', () => { // spec 056 FR-019
    const ficha = fichaEnElMensaje(`Ana López necesita tu apoyo esta semana. ¿Le escribes hoy?\n\n${LINEA}`);
    expect(ficha).toEqual({
      antes: 'Ana López necesita tu apoyo esta semana. ¿Le escribes hoy?',
      nombre: 'Ana López',
      grupoId: G,
      personaId: P,
      ruta: `/mentor/groups/${G}/learners/${P}`,
    });
  });

  it('acepta espacios o saltos al final, y un mensaje que es solo la línea', () => { // spec 056 FR-019
    expect(fichaEnElMensaje(`Hola\n\n${LINEA}\n  `)?.antes).toBe('Hola');
    expect(fichaEnElMensaje(LINEA)).toMatchObject({ antes: '', nombre: 'Ana López', ruta: `/mentor/groups/${G}/learners/${P}` });
  });

  it('un nombre con dos puntos se lee entero (la ruta es lo último de la línea)', () => { // spec 056 FR-019
    expect(fichaEnElMensaje(`Hola\n\nFicha de Ana: la grande: /mentor/groups/${G}/learners/${P}`)?.nombre).toBe('Ana: la grande');
  });

  it('solo en esa forma exacta: sin ids de verdad, con otra ruta, en medio del texto o con otra palabra, no es una ficha', () => { // spec 056 FR-019
    expect(fichaEnElMensaje('Ficha de Ana: /mentor/groups/g1/learners/p1')).toBeNull();
    expect(fichaEnElMensaje(`Ficha de Ana: /mentor/groups/${G}/learners/${P}/extra`)).toBeNull();
    expect(fichaEnElMensaje(`Ficha de Ana: /admin/groups/${G}/learners/${P}`)).toBeNull();
    expect(fichaEnElMensaje(`Ficha de Ana: /semaforo/grupos`)).toBeNull();
    expect(fichaEnElMensaje(`Mira esto: /mentor/groups/${G}/learners/${P}`)).toBeNull();
    expect(fichaEnElMensaje(`ficha de Ana: /mentor/groups/${G}/learners/${P}`)).toBeNull();
    expect(fichaEnElMensaje(`Ficha de Ana: /mentor/groups/${G}/learners/${P}\nGracias`)).toBeNull();
    expect(fichaEnElMensaje(`Ficha de : /mentor/groups/${G}/learners/${P}`)).toBeNull();
    expect(fichaEnElMensaje('Hola a todos')).toBeNull();
    expect(fichaEnElMensaje('')).toBeNull();
  });

  it('un enlace de web en el texto no cambia nada: sigue siendo del texto', () => { // spec 056 FR-019
    const ficha = fichaEnElMensaje(`Mira https://meet.google.com/abc-defg-hij\n\n${LINEA}`);
    expect(ficha?.antes).toBe('Mira https://meet.google.com/abc-defg-hij');
  });
});
