import { describe, expect, it } from '@jest/globals';

import { PILA_INICIAL, abrir, alCambiarElMentorDelGrupo, alCrearUnGrupo, rotuloDeVolver, volver, type VistaDelLider } from '../pilaDelLider';

const mentor: VistaDelLider = { tipo: 'fichaMentor', mentorId: 'm-1', nombre: 'E2E Mentor' };
const grupo: VistaDelLider = { tipo: 'grupo', grupoId: 'g-1', nombre: 'Cupo 1314', mentorNombre: 'E2E Mentor' };
const aprendiz: VistaDelLider = { tipo: 'fichaAprendiz', personaId: 'p-1', nombre: 'Ana', grupoId: 'g-1', mentorNombre: 'E2E Mentor' };

describe('el recorrido del líder: un nivel atrás por vez (FR-046)', () => {
  it('desde «Mis mentores» no hay nivel atrás: quien la monta sale a Yo', () => { // spec 056 FR-046
    expect(volver(PILA_INICIAL)).toBeNull();
  });

  it('Mis mentores → mentor → grupo → aprendiz sube de a un nivel hasta Mis mentores', () => { // spec 056 FR-046
    let pila: VistaDelLider[] = abrir(abrir(abrir([...PILA_INICIAL], mentor), grupo), aprendiz);
    const recorrido: string[] = [];
    for (let siguiente = volver(pila); siguiente; siguiente = volver(pila)) {
      pila = siguiente;
      recorrido.push(pila[pila.length - 1].tipo);
    }
    expect(recorrido).toEqual(['grupo', 'fichaMentor', 'misMentores']);
  });

  it('la flecha de una ficha dice a qué pantalla vuelve', () => { // spec 056 FR-046
    expect(rotuloDeVolver(abrir([...PILA_INICIAL], aprendiz))).toBe('Mis mentores');
    expect(rotuloDeVolver(abrir(abrir([...PILA_INICIAL], mentor), grupo))).toBe('E2E Mentor');
    expect(rotuloDeVolver(abrir(abrir(abrir([...PILA_INICIAL], mentor), grupo), aprendiz))).toBe('Cupo 1314');
    expect(rotuloDeVolver(abrir(abrir([...PILA_INICIAL], { tipo: 'grupos' }), grupo))).toBe('Grupos');
  });

  it('al crear un grupo el asistente se cambia por «Grupos» en «Activos» y el atrás ya no lo reabre', () => { // spec 056 FR-008
    const pila = abrir(abrir([...PILA_INICIAL], { tipo: 'grupos', filtro: 'sinMentor' }), { tipo: 'crearGrupo' });
    const despues = alCrearUnGrupo(pila);
    expect(despues).toEqual([{ tipo: 'misMentores' }, { tipo: 'grupos', filtro: 'activos' }]);
    expect(volver(despues)).toEqual([{ tipo: 'misMentores' }]);
  });
});

describe('cambiar el mentor de un grupo con el grupo abierto (FR-009)', () => {
  it('el grupo de la pila recuerda al mentor nuevo: al volver de la ficha de un aprendiz la cabecera no vuelve al anterior', () => { // spec 056 FR-009
    const pila = abrir(abrir(abrir([...PILA_INICIAL], mentor), grupo), aprendiz);
    const nueva = alCambiarElMentorDelGrupo(pila, 'g-1', 'Mentor Dos');
    expect(nueva.find(v => v.tipo === 'grupo')).toMatchObject({ grupoId: 'g-1', mentorNombre: 'Mentor Dos' });
    expect(nueva.find(v => v.tipo === 'fichaAprendiz')).toMatchObject({ mentorNombre: 'Mentor Dos' });
    expect(pila.find(v => v.tipo === 'grupo')).toMatchObject({ mentorNombre: 'E2E Mentor' });
  });

  it('solo cambia las vistas de ese grupo y deja el resto como estaba', () => { // spec 056 FR-009
    const otro: VistaDelLider = { tipo: 'grupo', grupoId: 'g-2', nombre: 'Fénix', mentorNombre: 'Ana' };
    const pila = abrir(abrir([...PILA_INICIAL], otro), { tipo: 'fichaAprendiz', personaId: 'p-9', nombre: 'Beto', grupoId: 'g-2', mentorNombre: 'Ana' });
    expect(alCambiarElMentorDelGrupo(pila, 'g-1', 'Mentor Dos')).toEqual(pila);
  });
});

