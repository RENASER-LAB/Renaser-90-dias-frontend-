import { describe, expect, it } from '@jest/globals';

import { destinoDe, destinoDeRuta, type AvisoApi } from '../avisosApi';

/**
 * Las dos rutas de los resúmenes del sábado (contrato §1.2 y §4.5):
 *
 * - `/mentor/groups/{grupoId}/semaforo` — `ResumenSemanalDelGrupoEvent.rutaApp()`, al mentor.
 * - `/semaforo/grupos` — `ResumenSemanalGeneralEvent.rutaApp()`, al líder, admin y alquimista.
 *
 * Se parsean con el mismo cuidado que la del alumno: un `%` suelto no revienta, un id vacío no
 * produce una URL con `//`, y una ruta parecida no se confunde con estas.
 */

function aviso(route: string | null): AvisoApi {
  return { id: 1, type: 'RESUMEN_SEMANAL', title: 't', body: 'b', createdAt: '2026-09-26T05:30:00Z', readAt: null, route };
}

describe('el semáforo de un grupo, para su mentor', () => {
  it('saca el grupo', () => {
    expect(destinoDeRuta('/mentor/groups/g-1/semaforo')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-1' });
  });

  it('así la arma el backend: con el UUID del grupo', () => {
    expect(destinoDeRuta('/mentor/groups/7c1e2f7a-0b7e-4d0a-9d3e-2f4b8f6a1c55/semaforo')).toEqual({
      tipo: 'semaforoGrupo',
      grupoId: '7c1e2f7a-0b7e-4d0a-9d3e-2f4b8f6a1c55',
    });
  });

  it('tolera la barra final y decodifica el id', () => {
    expect(destinoDeRuta('/mentor/groups/g%201/semaforo/')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g 1' });
  });

  it('un % suelto no revienta, y sin id no hay destino', () => {
    expect(destinoDeRuta('/mentor/groups/%/semaforo')).toBeNull();
    expect(destinoDeRuta('/mentor/groups//semaforo')).toBeNull();
  });

  it('no se confunde con la ficha de un alumno ni con otra ruta parecida', () => {
    expect(destinoDeRuta('/mentor/groups/g-1/learners/u-2')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });
    expect(destinoDeRuta('/mentor/groups/g-1/semaforos')).toBeNull();
    expect(destinoDeRuta('/mentor/groups/g-1/semaforo?semanaHasta=2026-09-18')).toBeNull();
    expect(destinoDeRuta('/mentor/groups/g-1/learners/u-2/semaforo')).toBeNull();
  });
});

describe('el resumen por grupos, para el líder y administración', () => {
  it('/semaforo/grupos, con o sin barra final', () => {
    expect(destinoDeRuta('/semaforo/grupos')).toEqual({ tipo: 'semaforoGrupos' });
    expect(destinoDeRuta('/semaforo/grupos/')).toEqual({ tipo: 'semaforoGrupos' });
  });

  it('parecidas no son iguales', () => {
    expect(destinoDeRuta('/semaforo/grupos/g-1')).toBeNull();
    expect(destinoDeRuta('/semaforo/grupo')).toBeNull();
    expect(destinoDeRuta('/SEMAFORO/GRUPOS')).toBeNull();
    expect(destinoDeRuta('semaforo/grupos')).toBeNull();
  });

  it('no le quita su ruta al semáforo propio', () => {
    expect(destinoDeRuta('/semaforo')).toEqual({ tipo: 'semaforo' });
  });
});

describe('la bandeja de acompañamiento sigue abriendo solo alumnos', () => {
  it('un resumen del sábado en esa bandeja no abre ninguna ficha', () => {
    expect(destinoDe(aviso('/mentor/groups/g-1/semaforo'))).toBeNull();
    expect(destinoDe(aviso('/semaforo/grupos'))).toBeNull();
  });
});
