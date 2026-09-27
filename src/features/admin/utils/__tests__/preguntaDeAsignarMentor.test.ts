import { describe, expect, it } from '@jest/globals';

import { preguntaDeAsignarMentor } from '../mensajes';

/** A-5 (26/09): tocar un nombre asignaba al mentor en el acto. Ahora se pregunta antes. */
describe('la pregunta antes de asignar un mentor', () => {
  it('nombra a la persona y al grupo', () => {
    expect(preguntaDeAsignarMentor('Luz Ramos', 'Fénix', false)).toBe('¿Asignar a Luz Ramos como mentor de Fénix?');
  });

  it('avisa si ya acompaña otro grupo, sin afirmar qué le pasa a ese grupo', () => {
    expect(preguntaDeAsignarMentor('Luz Ramos', 'Fénix', true)).toBe(
      '¿Asignar a Luz Ramos como mentor de Fénix? Hoy ya acompaña otro grupo.',
    );
  });

  it('sin nombres no deja huecos', () => {
    expect(preguntaDeAsignarMentor(null, '  ', false)).toBe('¿Asignar a esta persona como mentor de este grupo?');
  });
});
