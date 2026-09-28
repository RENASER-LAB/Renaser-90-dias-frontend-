import { describe, expect, it, jest } from '@jest/globals';

// Solo se prueba `pilaInicial`: las pantallas no se montan.
jest.mock('../AdminInicioScreen', () => ({}));
jest.mock('../BienvenidaAdminScreen', () => ({}));
jest.mock('../FichaAprendizScreen', () => ({}));
jest.mock('../GrupoDetalleScreen', () => ({}));
jest.mock('../GrupoFormScreen', () => ({}));
jest.mock('../GruposAdminScreen', () => ({}));
jest.mock('../MasOpcionesScreen', () => ({}));
jest.mock('../PersonasAdminScreen', () => ({}));
jest.mock('../SemaforoAdminScreen', () => ({}));
jest.mock('../SemaforoGrupoAdminScreen', () => ({}));
jest.mock('../SolicitudesAdminScreen', () => ({}));
jest.mock('../StaffRolesScreen', () => ({}));
jest.mock('../../../caja/screens/CajaContenidoScreen', () => ({}));
jest.mock('../../../caja/screens/CajaDetalleScreen', () => ({}));
jest.mock('../../../caja/screens/CajaListaScreen', () => ({}));

import { pilaInicial } from '../AdminScreen';

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
});
