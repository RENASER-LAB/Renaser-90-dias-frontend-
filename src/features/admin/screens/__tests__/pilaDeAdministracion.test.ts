import { describe, expect, it, jest } from '@jest/globals';

// Solo se prueba `pilaInicial`: las pantallas no se montan.
jest.mock('../AdminInicioScreen', () => ({}));
jest.mock('../AnimalDeFaseDetalleScreen', () => ({}));
jest.mock('../AnimalesDeFaseAdminScreen', () => ({}));
jest.mock('../../hooks/useAnimalesDeFaseAdmin', () => ({}));
jest.mock('../BienvenidaAdminScreen', () => ({}));
jest.mock('../FichaAprendizScreen', () => ({}));
jest.mock('../GrupoDetalleScreen', () => ({}));
jest.mock('../GrupoFormScreen', () => ({}));
jest.mock('../GruposAdminScreen', () => ({}));
jest.mock('../GuiasRecepcionScreen', () => ({}));
jest.mock('../MasOpcionesScreen', () => ({}));
jest.mock('../PersonasAdminScreen', () => ({}));
jest.mock('../SemaforoAdminScreen', () => ({}));
jest.mock('../SemaforoGrupoAdminScreen', () => ({}));
jest.mock('../SolicitudesAdminScreen', () => ({}));
jest.mock('../StaffRolesScreen', () => ({}));
jest.mock('../../../caja/screens/CajaContenidoScreen', () => ({}));
jest.mock('../../../caja/screens/CajaDetalleScreen', () => ({}));
jest.mock('../../../caja/screens/CajaListaScreen', () => ({}));

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
});
