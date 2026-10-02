/**
 * El encabezado de Comunidad que se esconde al desplazar (2026-10-02): la decisión pura. Contra el
 * código anterior falla entera: el encabezado no tenía estados, era fijo.
 */
import { describe, expect, it } from '@jest/globals';
import { desplazamientoDelEncabezado, siguienteEstadoDelEncabezado } from '../logicaDelEncabezado';
import { CERCA_DEL_TOPE_PX } from '../logicaDeLaBarra';

describe('siguienteEstadoDelEncabezado', () => {
  it('cerca del tope va completo, aunque viniera oculto', () => {
    expect(siguienteEstadoDelEncabezado('oculto', { y: 0, barraVisible: true })).toBe('completo');
    expect(siguienteEstadoDelEncabezado('circulos', { y: CERCA_DEL_TOPE_PX, barraVisible: true })).toBe('completo');
  });

  it('con la barra escondida se esconde entero', () => {
    expect(siguienteEstadoDelEncabezado('completo', { y: 300, barraVisible: false })).toBe('oculto');
    expect(siguienteEstadoDelEncabezado('circulos', { y: 300, barraVisible: false })).toBe('oculto');
  });

  it('al subir un poco (la barra vuelve lejos del tope) vuelven solo los círculos', () => {
    expect(siguienteEstadoDelEncabezado('oculto', { y: 300, barraVisible: true })).toBe('circulos');
    expect(siguienteEstadoDelEncabezado('circulos', { y: 280, barraVisible: true })).toBe('circulos');
  });

  it('al empezar a bajar desde el tope sigue completo hasta que la barra se va (un solo salto)', () => {
    expect(siguienteEstadoDelEncabezado('completo', { y: CERCA_DEL_TOPE_PX + 5, barraVisible: true })).toBe('completo');
  });
});

describe('desplazamientoDelEncabezado', () => {
  const alto = { total: 200, sobreLaFila: 110 };

  it('completo no se mueve, oculto sube su alto entero, círculos sube lo que hay sobre la fila', () => {
    expect(desplazamientoDelEncabezado('completo', alto)).toBe(0);
    expect(desplazamientoDelEncabezado('oculto', alto)).toBe(-200);
    expect(desplazamientoDelEncabezado('circulos', alto)).toBe(-110);
  });

  it('sin fila de secciones (la lección a pantalla completa), círculos es lo mismo que oculto', () => {
    expect(desplazamientoDelEncabezado('circulos', { total: 80, sobreLaFila: null })).toBe(-80);
  });
});
