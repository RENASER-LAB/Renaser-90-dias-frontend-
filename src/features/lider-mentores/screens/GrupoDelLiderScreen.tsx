import React from 'react';

import type { LecturaDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { NavegacionDeSemanas } from '../../semaforo/components/NavegacionDeSemanas';
import { VistaSemaforoDelGrupo } from '../../semaforo/components/TablaDelSemaforo';
import type { AprendizDelSemaforo } from '../../semaforo/types/semaforo.types';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';

/**
 * Las personas de un grupo, para el líder (spec 005, US1; `GET /leadership/groups/{g}/semaforo`).
 *
 * Es la tabla del semáforo del grupo de siempre (`VistaSemaforoDelGrupo`: el mismo cálculo que ve el mentor y
 * el administrador, FR-008) con tres diferencias que no decide la app:
 *
 * - **El orden es del servidor** (FR-007): rojo, amarillo, sin datos, verde y «no se mide» al final; dentro de
 *   cada color, de menor a mayor porcentaje. La app no reordena.
 * - **La semana por defecto es la última cerrada** (sábado→viernes), no «los últimos 7 días» del resumen: la
 *   navegación se rotula como semana (`navegacionComoSemana`).
 * - **Quien lleva su propio programa en el grupo** (el mentor o la guía de aprendiz) aparece con su % y con
 *   «No se mide en el semáforo» en lugar del color.
 * - **Cada fila se abre** a la semana de esa persona.
 *
 * Un grupo sin nadie dice «Este grupo todavía no tiene personas» y no deja una lista vacía muda. La lectura
 * la hace quien monta la pantalla (`useGrupoDelLider`): así, al volver de una persona, la lista sigue en la
 * semana en que estaba.
 *
 * Un único scroll (`MarcoDelLider`) y el retroceso del sistema vuelve al resumen por grupos.
 */
export function GrupoDelLiderScreen({
  nombre,
  lectura,
  onVolver,
  onAbrirPersona,
}: {
  /** El nombre del grupo, el de la tarjeta que se tocó: está a la vista antes de que llegue la lista. */
  nombre: string;
  lectura: LecturaDelGrupo;
  onVolver: () => void;
  onAbrirPersona: (persona: AprendizDelSemaforo) => void;
}) {
  const personas = lectura.datos?.aprendices ?? null;
  const sinNadie = personas !== null && personas.length === 0;

  return (
    <MarcoDelLider titulo={lectura.datos?.grupoNombre?.trim() || nombre} onVolver={onVolver}>
      {sinNadie ? (
        <>
          <NavegacionDeSemanas lectura={lectura} comoSemana />
          <Linea>Este grupo todavía no tiene personas.</Linea>
        </>
      ) : (
        <>
          {personas ? <Linea>Primero quienes más lo necesitan. Toca a una persona para ver su semana.</Linea> : null}
          <VistaSemaforoDelGrupo
            lectura={lectura}
            navegacionComoSemana
            onAbrirAprendiz={id => {
              const persona = personas?.find(p => p.aprendizId === id);
              return persona ? () => onAbrirPersona(persona) : undefined;
            }}
          />
        </>
      )}
    </MarcoDelLider>
  );
}
