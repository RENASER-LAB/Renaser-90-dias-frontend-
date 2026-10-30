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
 * - **La ventana es la del resumen por grupos** (decisión del dueño del 2026-10-19: «la ventana del resumen manda en
 *   todo»): abre en los mismos 7 días que se miraban al tocar el grupo, con el mismo rótulo y las mismas flechas
 *   (`NavegacionDeSemanas`), y no tiene una semana propia.
 * - **Quien lleva su propio programa en el grupo** (el mentor o la guía de aprendiz) aparece con su % y con
 *   «No se mide en el semáforo» en lugar del color.
 * - **Cada fila se abre** a la semana de esa persona.
 *
 * **Spec 018: sin el párrafo de ayuda de arriba** («Primero quienes más lo necesitan. Toca a una persona para ver su semana.»):
 * el orden se ve en los colores y cada fila lleva su chevron.
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
          <NavegacionDeSemanas lectura={lectura} />
          <Linea>Este grupo todavía no tiene personas.</Linea>
        </>
      ) : (
        <>
          <VistaSemaforoDelGrupo
            lectura={lectura}
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
