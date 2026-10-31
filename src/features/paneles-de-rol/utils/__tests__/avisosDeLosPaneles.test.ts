import { describe, expect, it } from '@jest/globals';

import type { VistaCelula } from '../../../mentor/hooks/useCelulaQueAcompano';
import {
  PARAMETROS_DE_AVISO_DE_ROL,
  pendienteDeLosParametros,
  resolverAvisoDeGrupo,
  resolverAvisoDelResumenGeneral,
} from '../avisosDeLosPaneles';

/**
 * Los avisos del teléfono que abrían «Mi grupo», la ficha de un aprendiz, el semáforo del grupo y el resumen por grupos desde Hoy
 * ahora entran por Yo (2026-10-31). Estas decisiones son las que tomaba `HoyScreen`, sin cambiar ninguna regla.
 */
const aprendiz = { participanteId: 'a-1', nombre: 'Rosa' };
function vista(grupoActual: string, otrosGrupos: string[] = []): VistaCelula {
  return {
    celula: { id: grupoActual },
    grupos: [grupoActual, ...otrosGrupos].map(id => ({ id })),
    todos: [aprendiz],
  } as unknown as VistaCelula;
}

describe('los parámetros que trae el aviso', () => {
  it('la ficha de un aprendiz', () => {
    expect(pendienteDeLosParametros({ abrirAlumno: { grupoId: 'g', alumnoId: 'a-1' } })).toEqual({ tipo: 'alumno', grupoId: 'g', alumnoId: 'a-1' });
  });

  it('el semáforo de un grupo', () => {
    expect(pendienteDeLosParametros({ abrirSemaforoDelGrupo: 'g-2' })).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-2' });
  });

  it('el resumen por grupos', () => {
    expect(pendienteDeLosParametros({ abrirSemaforoPorGrupos: true })).toEqual({ tipo: 'semaforoGrupos' });
  });

  it('nada, o algo mal formado, no abre nada', () => {
    expect(pendienteDeLosParametros(undefined)).toBeNull();
    expect(pendienteDeLosParametros({})).toBeNull();
    expect(pendienteDeLosParametros({ abrirAlumno: { grupoId: 1, alumnoId: 'a' } })).toBeNull();
    expect(pendienteDeLosParametros({ abrirAlumno: { grupoId: 'g' } })).toBeNull();
    expect(pendienteDeLosParametros({ abrirSemaforoDelGrupo: '' })).toBeNull();
    expect(pendienteDeLosParametros({ abrirSemaforoPorGrupos: 'si' })).toBeNull();
  });

  it('Yo limpia exactamente estos tres parámetros (se consumen una vez)', () => {
    expect([...PARAMETROS_DE_AVISO_DE_ROL]).toEqual(['abrirAlumno', 'abrirSemaforoDelGrupo', 'abrirSemaforoPorGrupos']);
  });
});

describe('la ficha de un aprendiz', () => {
  const pendiente = { tipo: 'alumno', grupoId: 'g-1', alumnoId: 'a-1' } as const;

  it('espera al padrón del grupo: nunca abre a ciegas', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: true, vista: null, huboFallo: false })).toEqual({ hacer: 'esperar' });
  });

  it('si no se pudo leer el grupo, se descarta (no queda esperando para siempre)', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: true, vista: null, huboFallo: true })).toEqual({ hacer: 'descartar' });
  });

  it('quien no es mentor ni guía no abre nada', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: false, vista: vista('g-1'), huboFallo: false })).toEqual({ hacer: 'descartar' });
  });

  it('abre la ficha si el aprendiz está en el padrón del grupo que se mira', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: true, vista: vista('g-1'), huboFallo: false })).toEqual({ hacer: 'abrirAlumno', alumno: aprendiz });
  });

  it('si el aprendiz ya no está en el padrón, abre el grupo y no la ficha de alguien que rotó', () => {
    expect(
      resolverAvisoDeGrupo({ ...pendiente, alumnoId: 'otro' }, { esMentor: true, vista: vista('g-1'), huboFallo: false }),
    ).toEqual({ hacer: 'abrirGrupo' });
  });

  it('si es de OTRO de sus grupos, pasa a ese grupo y abre la ficha con su padrón (D-141)', () => {
    expect(
      resolverAvisoDeGrupo({ ...pendiente, grupoId: 'g-2' }, { esMentor: true, vista: vista('g-1', ['g-2']), huboFallo: false }),
    ).toEqual({ hacer: 'cambiarDeGrupoYAbrirAlumno', grupoId: 'g-2', alumnoId: 'a-1' });
  });
});

describe('el semáforo de un grupo (revisión del líder, resumen del sábado del mentor)', () => {
  const pendiente = { tipo: 'semaforoGrupo', grupoId: 'g-1' } as const;

  it('del grupo que se mira: «Mi grupo» con la sección del semáforo a la vista', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: true, vista: vista('g-1'), huboFallo: false })).toEqual({
      hacer: 'abrirSemaforoDelGrupo',
      cambiarAlGrupo: null,
      enfocar: true,
    });
  });

  it('de OTRO de sus grupos: cambia a ese y también baja a la sección', () => {
    expect(
      resolverAvisoDeGrupo({ ...pendiente, grupoId: 'g-2' }, { esMentor: true, vista: vista('g-1', ['g-2']), huboFallo: false }),
    ).toEqual({ hacer: 'abrirSemaforoDelGrupo', cambiarAlGrupo: 'g-2', enfocar: true });
  });

  it('de un grupo que ya no es suyo: abre «Mi grupo» y nada más', () => {
    expect(
      resolverAvisoDeGrupo({ ...pendiente, grupoId: 'g-ajeno' }, { esMentor: true, vista: vista('g-1'), huboFallo: false }),
    ).toEqual({ hacer: 'abrirSemaforoDelGrupo', cambiarAlGrupo: null, enfocar: false });
  });

  it('espera al padrón y se descarta sin permiso, igual que la ficha', () => {
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: true, vista: null, huboFallo: false })).toEqual({ hacer: 'esperar' });
    expect(resolverAvisoDeGrupo(pendiente, { esMentor: false, vista: null, huboFallo: false })).toEqual({ hacer: 'descartar' });
  });
});

describe('el resumen por grupos del sábado (`/semaforo/grupos`)', () => {
  it('el líder abre su resumen de «Mis mentores», sin fijar ningún grupo', () => {
    expect(resolverAvisoDelResumenGeneral({ esLider: true, administrar: false, cargandoCapacidades: false })).toEqual({
      hacer: 'abrir',
      vista: { tipo: 'cumplimiento', grupo: null },
    });
  });

  it('Administración y Alquimista abren el semáforo de Administración', () => {
    expect(resolverAvisoDelResumenGeneral({ esLider: false, administrar: true, cargandoCapacidades: false })).toEqual({ hacer: 'abrirAdministracion' });
  });

  it('mientras no se sabe si la cuenta administra, espera', () => {
    expect(resolverAvisoDelResumenGeneral({ esLider: false, administrar: false, cargandoCapacidades: true })).toEqual({ hacer: 'esperar' });
  });

  it('cualquier otra cuenta lo descarta', () => {
    expect(resolverAvisoDelResumenGeneral({ esLider: false, administrar: false, cargandoCapacidades: false })).toEqual({ hacer: 'descartar' });
  });
});
