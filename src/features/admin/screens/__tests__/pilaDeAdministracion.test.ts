import { describe, expect, it, jest } from '@jest/globals';

// Solo se prueba `pilaInicial`: las pantallas no se montan.
jest.mock('../AdminInicioScreen', () => ({}));
jest.mock('../AnimalDeFaseDetalleScreen', () => ({}));
jest.mock('../AnimalesDeFaseAdminScreen', () => ({}));
jest.mock('../../hooks/useAnimalesDeFaseAdmin', () => ({}));
jest.mock('../BienvenidaAdminScreen', () => ({}));
jest.mock('../CategoriasDeHabitoAdminScreen', () => ({}));
jest.mock('../HabitosProgramaAdminScreen', () => ({}));
jest.mock('../HabitoProgramaFormScreen', () => ({}));
jest.mock('../../hooks/useHabitosProgramaAdmin', () => ({}));
jest.mock('../FichaAprendizScreen', () => ({}));
jest.mock('../GrupoDetalleScreen', () => ({}));
jest.mock('../GrupoFormScreen', () => ({}));
jest.mock('../GruposAdminScreen', () => ({}));
jest.mock('../GuiasRecepcionScreen', () => ({}));
jest.mock('../MasOpcionesScreen', () => ({}));
jest.mock('../PersonasAdminScreen', () => ({}));
jest.mock('../PublicacionesOcultasScreen', () => ({}));
jest.mock('../SemaforoAdminScreen', () => ({}));
jest.mock('../SemaforoGrupoAdminScreen', () => ({}));
jest.mock('../SolicitudesAdminScreen', () => ({}));
jest.mock('../StaffRolesScreen', () => ({}));
jest.mock('../../../caja/screens/CajaContenidoScreen', () => ({}));
jest.mock('../../../caja/screens/CajaDetalleScreen', () => ({}));
jest.mock('../../../caja/screens/CajaListaScreen', () => ({}));
jest.mock('../../../lider-mentores/screens/PersonaDelLiderScreen', () => ({}));
jest.mock('../../../formaciones/screens/FormacionDetalleAdminScreen', () => ({}));
jest.mock('../../../formaciones/screens/FormacionesAdminScreen', () => ({}));

import { pilaInicial, pilaTrasEliminarCuenta } from '../AdminScreen';

/**
 * Por dónde entra Administración. El aviso de la Caja Renaser (`/admin/caja/{id}`, D-219) entra a esa
 * caja con la lista y la raíz debajo: volver sube paso a paso y no sale de golpe a Mi programa.
 */
describe('la pila con la que abre Administración', () => {
  it('por defecto, la raíz', () => {
    expect(pilaInicial('inicio')).toEqual([{ nombre: 'inicio' }]);
  });

  it('el aviso del sábado, el semáforo sobre la raíz (como antes)', () => {
    expect(pilaInicial('semaforo')).toEqual([{ nombre: 'inicio' }, { nombre: 'semaforo' }]);
  });

  it('el aviso de la Caja, esa caja sobre la lista y la raíz', () => {
    expect(pilaInicial({ caja: 'a-7' })).toEqual([
      { nombre: 'inicio' },
      { nombre: 'caja' },
      { nombre: 'caja-detalle', aprendizId: 'a-7' },
    ]);
  });

  it('«Ver ficha» desde la info de un chat (D-222), la ficha sobre la raíz', () => {
    const aprendiz = { id: 'a-9', fullName: 'Ana Pérez' };

    expect(pilaInicial({ ficha: aprendiz })).toEqual([{ nombre: 'inicio' }, { nombre: 'ficha', aprendiz }]);
  });
});

/** D-243: tras «Eliminar cuenta» en la ficha se vuelve a la lista de Personas (que se relee al montarse). */
describe('la pila tras eliminar una cuenta', () => {
  const ficha = { nombre: 'ficha' as const, aprendiz: { id: 'a-1', fullName: 'Ana' } };

  it('desde Personas, saca la ficha', () => {
    expect(pilaTrasEliminarCuenta([{ nombre: 'inicio' }, { nombre: 'personas', soloSinGrupo: true }, ficha])).toEqual([
      { nombre: 'inicio' },
      { nombre: 'personas', soloSinGrupo: true },
    ]);
  });

  it('desde otro lado (semáforo, inicio, chat), la reemplaza por Personas', () => {
    expect(pilaTrasEliminarCuenta([{ nombre: 'inicio' }, { nombre: 'semaforo' }, ficha])).toEqual([
      { nombre: 'inicio' },
      { nombre: 'semaforo' },
      { nombre: 'personas', soloSinGrupo: false },
    ]);
  });

  it('si la ficha se abrió desde los días de esa persona (semáforo), tampoco se vuelve a ellos: su cuenta ya no existe', () => {
    const aprendiz = { id: 'a-1', fullName: 'Ana' };
    const susDias = {
      nombre: 'persona-semaforo' as const,
      grupoId: 'g-1',
      grupoNombre: 'Fénix',
      aprendiz,
      avatarUrl: null,
      conBotonDeFicha: true,
    };
    const semaforoGrupo = {
      nombre: 'semaforo-grupo' as const,
      grupoId: 'g-1',
      grupoNombre: 'Fénix',
      inicio: { posicion: { modo: 'vigente' as const }, hastaVigente: null },
      puedeAbrirse: true,
    };

    expect(pilaTrasEliminarCuenta([{ nombre: 'inicio' }, { nombre: 'semaforo' }, semaforoGrupo, susDias, ficha])).toEqual([
      { nombre: 'inicio' },
      { nombre: 'semaforo' },
      semaforoGrupo,
      { nombre: 'personas', soloSinGrupo: false },
    ]);
  });

  it('los días de OTRA persona debajo de la ficha se conservan', () => {
    const otraPersona = {
      nombre: 'persona-semaforo' as const,
      grupoId: 'g-1',
      grupoNombre: null,
      aprendiz: { id: 'a-9', fullName: 'Beto' },
      avatarUrl: null,
      conBotonDeFicha: false,
    };

    expect(pilaTrasEliminarCuenta([{ nombre: 'inicio' }, otraPersona, ficha])).toEqual([
      { nombre: 'inicio' },
      otraPersona,
      { nombre: 'personas', soloSinGrupo: false },
    ]);
  });
});
