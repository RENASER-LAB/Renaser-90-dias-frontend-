import { describe, expect, it } from '@jest/globals';

import {
  rutaDelResumenPorGrupos,
  rutaDelSemaforoDeAprendiz,
  rutaDelSemaforoDelGrupo,
} from '../semaforoApi';

/**
 * Las puertas del semáforo de otros (contrato §4.1, §4.3 y §4.4): qué ruta se pide para cada rol.
 * Se fija la forma exacta de cada una —la del mentor y la de administración NO son la misma
 * ruta— y que un identificador raro no pueda cambiar a qué ruta se llama.
 */

describe('el detalle de una persona (§4.1)', () => {
  it('el mentor entra por el grupo que acompaña', () => {
    expect(rutaDelSemaforoDeAprendiz({ quien: 'mentor', grupoId: 'g-1', aprendizId: 'u-2' })).toBe(
      '/api/v1/mentor/groups/g-1/learners/u-2/semaforo?semanas=8',
    );
  });

  it('administración entra por la persona', () => {
    expect(rutaDelSemaforoDeAprendiz({ quien: 'admin', aprendizId: 'u-2' })).toBe(
      '/api/v1/admin/trainees/u-2/semaforo?semanas=8',
    );
  });

  it('`semanas` queda entre 1 y 13, como acepta el servidor', () => {
    expect(rutaDelSemaforoDeAprendiz({ quien: 'admin', aprendizId: 'u-2' }, 40)).toMatch(/semanas=13$/);
    expect(rutaDelSemaforoDeAprendiz({ quien: 'admin', aprendizId: 'u-2' }, 0)).toMatch(/semanas=1$/);
  });

  it('un identificador con barras o espacios no cambia la ruta', () => {
    expect(rutaDelSemaforoDeAprendiz({ quien: 'mentor', grupoId: 'g/1', aprendizId: 'u 2' })).toBe(
      '/api/v1/mentor/groups/g%2F1/learners/u%202/semaforo?semanas=8',
    );
  });
});

describe('la tabla de un grupo (§4.3)', () => {
  it('sin semana, la ventana vigente', () => {
    expect(rutaDelSemaforoDelGrupo({ quien: 'mentor', grupoId: 'g-1' })).toBe('/api/v1/mentor/groups/g-1/semaforo');
    expect(rutaDelSemaforoDelGrupo({ quien: 'admin', grupoId: 'g-1' }, null)).toBe('/api/v1/admin/semaforo/groups/g-1');
  });

  it('con semana, el viernes que la cierra', () => {
    expect(rutaDelSemaforoDelGrupo({ quien: 'mentor', grupoId: 'g-1' }, '2026-09-18')).toBe(
      '/api/v1/mentor/groups/g-1/semaforo?semanaHasta=2026-09-18',
    );
    expect(rutaDelSemaforoDelGrupo({ quien: 'admin', grupoId: 'g-1' }, '2026-09-18')).toBe(
      '/api/v1/admin/semaforo/groups/g-1?semanaHasta=2026-09-18',
    );
  });
});

describe('el resumen por grupos (§4.4)', () => {
  it('una sola ruta para líder, administración y alquimista', () => {
    expect(rutaDelResumenPorGrupos()).toBe('/api/v1/semaforo/groups');
    expect(rutaDelResumenPorGrupos('2026-09-11')).toBe('/api/v1/semaforo/groups?semanaHasta=2026-09-11');
  });
});
