/**
 * Las vistas del mentor que tapan Comunidad («Mi grupo», su ficha y la ficha desde la info del grupo).
 *
 * E-341: en Comunidad, «Mi grupo» → ficha → «Escribirle» abría el chat DETRÁS de la ficha, y el botón
 * parecía no hacer nada. La primera prueba falla contra el código viejo, donde pedir un chat solo
 * cerraba la ficha abierta desde la info (comprobado dejando esa versión y corriéndola).
 */
import { describe, expect, it } from '@jest/globals';

import { conEstado } from '../../reglas';
import {
  loQueTapaComunidad,
  SIN_VISTAS_DEL_MENTOR,
  vistasDelMentor,
  type AccionDeLasVistasDelMentor,
  type VistasDelMentor,
} from '../vistasDelMentor';

const ANA = conEstado({
  participanteId: 'u-ana',
  nombre: 'Ana Pérez',
  diaPrograma: null,
  ultimaActividadEn: null,
  habitosProgramados: null,
  habitosCumplidos: null,
  evidenciasPendientes: null,
});

const aplicar = (...acciones: AccionDeLasVistasDelMentor[]): VistasDelMentor =>
  acciones.reduce(vistasDelMentor, SIN_VISTAS_DEL_MENTOR);

describe('E-341: pedir un chat despeja lo que tapa Comunidad', () => {
  it('con la ficha de «Mi grupo» abierta, el «Escribirle» deja ver el chat pedido', () => {
    const conLaFicha = aplicar({ tipo: 'abrir-mi-grupo' }, { tipo: 'abrir-ficha', alumno: ANA });
    expect(loQueTapaComunidad(conLaFicha, true)).toBe('ficha-de-mi-grupo');

    expect(loQueTapaComunidad(vistasDelMentor(conLaFicha, { tipo: 'pedir-un-chat' }), true)).toBeNull();
  });

  it('también con «Mi grupo» a la vista', () => {
    const enMiGrupo = aplicar({ tipo: 'abrir-mi-grupo' });

    expect(loQueTapaComunidad(vistasDelMentor(enMiGrupo, { tipo: 'pedir-un-chat' }), true)).toBeNull();
  });

  it('y con la ficha abierta desde la info del grupo (D-207)', () => {
    const desdeLaInfo = aplicar({ tipo: 'abrir-ficha-desde-la-info', alumno: ANA, grupoId: 'g-1' });
    expect(loQueTapaComunidad(desdeLaInfo, true)).toBe('ficha-desde-la-info');

    expect(loQueTapaComunidad(vistasDelMentor(desdeLaInfo, { tipo: 'pedir-un-chat' }), true)).toBeNull();
  });
});

describe('la navegación de siempre no cambia', () => {
  it('«←» en la ficha vuelve a «Mi grupo», y «←» en «Mi grupo» vuelve a Comunidad', () => {
    const conLaFicha = aplicar({ tipo: 'abrir-mi-grupo' }, { tipo: 'abrir-ficha', alumno: ANA });

    const deVuelta = vistasDelMentor(conLaFicha, { tipo: 'volver-a-mi-grupo' });
    expect(loQueTapaComunidad(deVuelta, true)).toBe('mi-grupo');
    expect(loQueTapaComunidad(vistasDelMentor(deVuelta, { tipo: 'salir-de-mi-grupo' }), true)).toBeNull();
  });

  it('la ficha abierta desde la info tapa a todo lo demás, y «←» vuelve a la info', () => {
    const ambas = aplicar(
      { tipo: 'abrir-mi-grupo' },
      { tipo: 'abrir-ficha-desde-la-info', alumno: ANA, grupoId: 'g-1' }
    );
    expect(loQueTapaComunidad(ambas, true)).toBe('ficha-desde-la-info');

    expect(loQueTapaComunidad(vistasDelMentor(ambas, { tipo: 'volver-a-la-info' }), true)).toBe('mi-grupo');
  });

  it('a quien no es mentor, las vistas de «Mi grupo» no le tapan nada', () => {
    const conLaFicha = aplicar({ tipo: 'abrir-mi-grupo' }, { tipo: 'abrir-ficha', alumno: ANA });

    expect(loQueTapaComunidad(conLaFicha, false)).toBeNull();
  });
});


describe('«Mis grupos» en Comunidad → Tribu (spec 055)', () => {
  it('con dos o más grupos se entra por «Mis grupos» y de ahí a «Mi grupo»; volver desde «Mi grupo» regresa a la lista', () => { // spec 055 FR-003
    const enLaLista = aplicar({ tipo: 'abrir-mis-grupos' });
    expect(loQueTapaComunidad(enLaLista, true)).toBe('mis-grupos');
    const enElGrupo = vistasDelMentor(enLaLista, { tipo: 'abrir-mi-grupo' });
    expect(loQueTapaComunidad(enElGrupo, true)).toBe('mi-grupo');
    expect(loQueTapaComunidad(vistasDelMentor(enElGrupo, { tipo: 'salir-de-mi-grupo', variosGrupos: true }), true)).toBe('mis-grupos');
    expect(loQueTapaComunidad(vistasDelMentor(enLaLista, { tipo: 'salir-de-mis-grupos' }), true)).toBeNull();
  });

  it('con un solo grupo, volver desde «Mi grupo» deja Tribu a la vista (no hay lista a la que volver)', () => { // spec 055 FR-003
    const enElGrupo = aplicar({ tipo: 'abrir-mi-grupo' });
    expect(loQueTapaComunidad(vistasDelMentor(enElGrupo, { tipo: 'salir-de-mi-grupo', variosGrupos: false }), true)).toBeNull();
    expect(loQueTapaComunidad(vistasDelMentor(enElGrupo, { tipo: 'salir-de-mi-grupo' }), true)).toBeNull();
  });

  it('pedir un chat despeja también «Mis grupos» (E-341)', () => { // spec 055 FR-003
    const enLaLista = aplicar({ tipo: 'abrir-mis-grupos' });
    expect(loQueTapaComunidad(vistasDelMentor(enLaLista, { tipo: 'pedir-un-chat' }), true)).toBeNull();
  });

  it('quien no es mentor nunca ve estas vistas', () => { // spec 055 FR-003
    expect(loQueTapaComunidad(aplicar({ tipo: 'abrir-mis-grupos' }), false)).toBeNull();
  });
});
