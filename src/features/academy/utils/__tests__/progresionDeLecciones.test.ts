import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { leccionAnteriorPendiente } from '../progresionDeLecciones';

/**
 * TRB-04 (e2e web del 27/09): al marcar una lección como completada, antes de «¡Excelente
 * Progreso! 🦅» salía «Lección no disponible 🔒 / … primero debes completar la lección anterior:
 * "<la misma lección recién completada>"», y la siguiente no se abría.
 *
 * Causa: la pantalla avanza a la siguiente en el mismo toque, cuando su estado todavía no se enteró
 * del cambio (React lo aplica en el render siguiente), así que la regla secuencial leía la lección
 * recién completada como pendiente.
 */
const lecciones = [
  { id: 'l1', title: '01. CREACIÓN DE CUENTA DE GMAIL' },
  { id: 'l2', title: '02. USO DE GOOGLE MEET PARA COMPUTADORA' },
  { id: 'l3', title: '03. ZOOM' },
];
const nadaCompletado = () => false;

describe('leccionAnteriorPendiente', () => {
  it('frena una lección si la anterior falta', () => {
    expect(leccionAnteriorPendiente(lecciones, 'l2', nadaCompletado)).toEqual(lecciones[0]);
  });

  it('deja abrir la primera, y una ya completada aunque la anterior falte', () => {
    expect(leccionAnteriorPendiente(lecciones, 'l1', nadaCompletado)).toBeNull();
    expect(leccionAnteriorPendiente(lecciones, 'l3', id => id === 'l3')).toBeNull();
  });

  it('deja abrir si la anterior está completada', () => {
    expect(leccionAnteriorPendiente(lecciones, 'l2', id => id === 'l1')).toBeNull();
  });

  it('la lección que se acaba de completar cuenta, aunque la pantalla todavía no se enteró', () => {
    // El estado de la pantalla todavía dice que nada está completado (render anterior).
    expect(leccionAnteriorPendiente(lecciones, 'l2', nadaCompletado, 'l1')).toBeNull();
    // Solo cuenta ESA lección: la regla sigue frenando a quien se salta otra.
    expect(leccionAnteriorPendiente(lecciones, 'l3', nadaCompletado, 'l1')).toEqual(lecciones[1]);
  });
});

describe('ComunidadScreen, al completar una lección', () => {
  const pantalla = fs.readFileSync(path.resolve(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf8');

  it('la regla secuencial es la de leccionAnteriorPendiente, con la recién completada', () => {
    expect(
      /leccionAnteriorPendiente\(allCourseLessons, lesson\.id, esLeccionCompletada, leccionRecienCompletadaId\)/.test(pantalla)
    ).toBe(true);
  });

  it('avanza a la siguiente pasándole la lección que se acaba de completar', () => {
    expect(/handleAbrirLeccion\(nextLesson, false, leccion\.id\)/.test(pantalla)).toBe(true);
  });
});
