import React from 'react';

import { FilaCompacta } from '../../../components/FilaCompacta';
import { vistaDelProgramaQueEmpieza } from '../utils/filaDelPrograma';

/**
 * «Tu programa empieza el martes 3 de noviembre»: la misma fila informativa que Hoy y Plan dibujan arriba a quien ya activó su programa y
 * todavía no llega su Día 1 (issue #72), para las pantallas que no montan el hook completo de `useFilaDelProgramaPropio`: Training y Yo
 * (issues #101 y #102, E2E del 2026-11-02). El texto sale de `vistaDelProgramaQueEmpieza`, el mismo de Hoy y Plan.
 *
 * Es una línea, no un botón: sin chevron, sin `Presionable` y sin movimiento propio (no lleva a nada y se ve un solo día).
 */
export function FilaDelProgramaQueEmpieza({ fechaInicio }: { fechaInicio?: string | null }) {
  const vista = vistaDelProgramaQueEmpieza(fechaInicio);
  return <FilaCompacta icono="calendarRange" titulo={vista.titulo} linea={vista.linea} accessibilityLabel={vista.etiquetaAccesible} />;
}
