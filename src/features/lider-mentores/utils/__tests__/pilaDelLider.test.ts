import { describe, expect, it } from '@jest/globals';

import { PILA_INICIAL, abrir, alCrearUnGrupo, rotuloDeVolver, volver, type VistaDelLider } from '../pilaDelLider';

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
