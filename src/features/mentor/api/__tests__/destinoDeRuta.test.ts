import { describe, expect, it } from '@jest/globals';

import { destinoDe, destinoDeRuta, type AvisoApi } from '../avisosApi';

/**
 * Las rutas de los avisos (`data.route` del push y `route` de la bandeja).
 *
 * La del alumno (RF-25) ya existía y NO puede cambiar de comportamiento. La del semáforo
 * (`/semaforo`, el aviso del sábado, D-168) es nueva, y también las otras dos del semáforo
 * (`/mentor/groups/{g}/semaforo` y `/semaforo/grupos`, contrato §4.5).
 *
 * > **Corregido 2026-09-25.** Acá decía que esas dos «todavía no tienen pantalla» y que esta
 * > versión tenía que ignorarlas. Ya la tienen (el semáforo del grupo en «Mi grupo» y el resumen
 * > por grupos del líder y de Administración): sus pruebas están en `destinoDeRutaDelSemaforo.test.ts`.
 * > Lo que sigue valiendo es que una ruta que NO se reconoce se ignora sin confundirse con otra.
 */

function aviso(route: string | null): AvisoApi {
  return { id: 1, type: 'ACOMPANAMIENTO_ALUMNO', title: 't', body: 'b', createdAt: '2026-09-25T10:00:00Z', readAt: null, route };
}

describe('la ruta del alumno, como siempre', () => {
  it('saca grupo y alumno', () => {
    expect(destinoDeRuta('/mentor/groups/g-1/learners/u-2')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });
  });

  it('decodifica los identificadores', () => {
    expect(destinoDeRuta('/mentor/groups/g%201/learners/u%2F2')).toEqual({ tipo: 'alumno', grupoId: 'g 1', alumnoId: 'u/2' });
  });

  it('un % suelto no revienta', () => {
    expect(destinoDeRuta('/mentor/groups/%/learners/u-2')).toBeNull();
  });

  it('sin identificador no hay destino', () => {
    expect(destinoDeRuta('/mentor/groups//learners/u-2')).toBeNull();
    expect(destinoDeRuta('/mentor/groups/g-1/learners/')).toBeNull();
  });
});

describe('la ruta del semáforo propio', () => {
  it('/semaforo abre el semáforo', () => {
    expect(destinoDeRuta('/semaforo')).toEqual({ tipo: 'semaforo' });
  });

  it('tolera la barra final', () => {
    expect(destinoDeRuta('/semaforo/')).toEqual({ tipo: 'semaforo' });
  });

  it('las otras rutas del semáforo ya no se confunden con el semáforo propio', () => {
    expect(destinoDeRuta('/semaforo/grupos')).toEqual({ tipo: 'semaforoGrupos' });
    expect(destinoDeRuta('/mentor/groups/g-1/semaforo')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-1' });
  });

  it('una ruta del semáforo que esta versión no conoce se sigue ignorando', () => {
    expect(destinoDeRuta('/semaforo/historial')).toBeNull();
    expect(destinoDeRuta('/mentor/groups/g-1/semaforo/semanas')).toBeNull();
  });

  it('parecidas no son iguales', () => {
    expect(destinoDeRuta('/semaforos')).toBeNull();
    expect(destinoDeRuta('semaforo')).toBeNull();
    expect(destinoDeRuta('/semaforo?semanas=8')).toBeNull();
    expect(destinoDeRuta('/SEMAFORO')).toBeNull();
  });
});

describe('lo que no es una ruta', () => {
  it.each([[undefined], [null], [42], [''], [{ route: '/semaforo' }]])('%p no lleva a ningún lado', crudo => {
    expect(destinoDeRuta(crudo)).toBeNull();
  });
});

describe('la bandeja de acompañamiento solo abre alumnos', () => {
  it('un aviso de alumno lleva a su ficha', () => {
    expect(destinoDe(aviso('/mentor/groups/g-1/learners/u-2'))).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });
  });

  it('un aviso del semáforo en esa bandeja no abre ninguna ficha', () => {
    expect(destinoDe(aviso('/semaforo'))).toBeNull();
  });

  it('sin ruta, nada', () => {
    expect(destinoDe(aviso(null))).toBeNull();
  });
});
