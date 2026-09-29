/**
 * El nombre visible de un chat de grupo.
 *
 * Falla contra el código anterior a D-142 por partida doble: `ChatConversation` no tenía `celulaId`
 * —el mapeador lo descartaba— y la pantalla pintaba `conversacion.title` a secas, que para todo
 * chat de grupo es el texto fijo `'Mi Grupo'`.
 */
import { describe, expect, it } from '@jest/globals';

import { nombreVisibleDeGrupo } from '../nombreDeGrupo';

const GRUPOS = [
  { cellId: 'g-general', cellName: 'General' },
  { cellId: 'g-nuevo', cellName: 'Grupo 07' },
];

function chatDeGrupo(celulaId: string | null) {
  return { type: 'celula', celulaId, title: 'Mi Grupo' };
}

describe('nombreVisibleDeGrupo', () => {
  it('le pone a cada grupo SU nombre, no el genérico', () => {
    expect(nombreVisibleDeGrupo(chatDeGrupo('g-general'), GRUPOS)).toBe('General');
    expect(nombreVisibleDeGrupo(chatDeGrupo('g-nuevo'), GRUPOS)).toBe('Grupo 07');
  });

  it('con la lista todavía vacía deja el título genérico, no el de otro grupo', () => {
    // Es el instante entre que abre la app y contesta `/me/cells`. Un nombre equivocado sería peor
    // que uno genérico: la persona creería estar leyendo otro grupo.
    expect(nombreVisibleDeGrupo(chatDeGrupo('g-nuevo'), [])).toBe('Mi Grupo');
  });

  it('un grupo que ya no está en la lista tampoco hereda el nombre de otro', () => {
    expect(nombreVisibleDeGrupo(chatDeGrupo('g-que-ya-no-esta'), GRUPOS)).toBe('Mi Grupo');
  });

  it('D-221: el nombre del chat que manda el servidor gana al de la célula', () => {
    // Pedido del dueño (29/09): el chat del grupo se llama «<mentor> y sus aprendices», no como la
    // célula. Falla contra el código anterior, que siempre prefería el `cellName` de `/me/cells`.
    const chat = { type: 'celula', celulaId: 'g-nuevo', title: 'Luisa y sus aprendices' };
    expect(nombreVisibleDeGrupo(chat, GRUPOS)).toBe('Luisa y sus aprendices');
  });

  it('no toca las conversaciones que no son de grupo', () => {
    expect(nombreVisibleDeGrupo({ type: 'direct', celulaId: null, title: 'Ana Pérez' }, GRUPOS))
      .toBe('Ana Pérez');
    expect(nombreVisibleDeGrupo({ type: 'global', celulaId: null, title: 'Comunidad Global' }, GRUPOS))
      .toBe('Comunidad Global');
  });
});
