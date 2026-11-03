/**
 * Qué muestra Yo en «Tu evolución» antes del Día 1 y sin programa (issue #102, E2E del 2026-11-02).
 *
 * A quien empieza mañana le decía «Fase 1 de 4 · Días 1–7 · Día 0 de 90 · Te quedan 6 días en esta fase» y «Sin datos · 0 de 7 días con datos»;
 * al personal sin programa, lo mismo. Ahora: antes del Día 1, la fila «Tu programa empieza el martes 3 de noviembre» y nada más; sin programa, nada.
 *
 * Contra el código anterior falla: `evolucionEnYo` no existía y `YoScreen` dibujaba la fase y el semáforo siempre que `/home` los trajera.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { evolucionEnYo } from '../evolucionEnYo';

const programaActivadoEnElDia0 = { inscrito: true, diaPrograma: 0 };

describe('evolucionEnYo', () => {
  it('con el programa en marcha (día 1 o más): la tarjeta de fase y el semáforo, como siempre', () => {
    for (const dia of [1, 7, 8, 55, 90, 120]) {
      expect(evolucionEnYo({ resumen: { inscrito: true, diaPrograma: dia }, esperandoInicio: false, fechaInicio: null })).toEqual({ tipo: 'en-curso' });
    }
  });

  it('antes del Día 1, con el programa activado: solo dice cuándo empieza (sin fase, sin días que quedan, sin semáforo)', () => {
    expect(evolucionEnYo({ resumen: programaActivadoEnElDia0, esperandoInicio: true, fechaInicio: '2026-11-03' })).toEqual({
      tipo: 'empieza',
      fechaInicio: '2026-11-03',
    });
  });

  it('antes del Día 1 y sin fecha del servidor: «pronto», sin inventar una', () => {
    expect(evolucionEnYo({ resumen: programaActivadoEnElDia0, esperandoInicio: true, fechaInicio: null })).toEqual({ tipo: 'empieza', fechaInicio: null });
  });

  it('sin programa (el personal sin fila): no se dibuja nada, aunque /home traiga fase y semáforo', () => {
    expect(evolucionEnYo({ resumen: { inscrito: false, diaPrograma: 0 }, esperandoInicio: false, fechaInicio: null })).toEqual({ tipo: 'oculta' });
    // Aunque la lectura del programa dijera «esperando», sin fila no hay programa que esperar.
    expect(evolucionEnYo({ resumen: { inscrito: false, diaPrograma: 0 }, esperandoInicio: true, fechaInicio: '2026-11-03' })).toEqual({ tipo: 'oculta' });
  });

  it('con la fila sin activar el programa: no se dibuja nada (manda «Todavía no empezaste tu programa»)', () => {
    expect(evolucionEnYo({ resumen: programaActivadoEnElDia0, esperandoInicio: false, fechaInicio: null })).toEqual({ tipo: 'oculta' });
  });

  it('sin lectura de /home: no se dibuja nada (sin parpadeo)', () => {
    expect(evolucionEnYo({ resumen: null, esperandoInicio: false, fechaInicio: null })).toEqual({ tipo: 'oculta' });
    expect(evolucionEnYo({ resumen: undefined, esperandoInicio: false, fechaInicio: null })).toEqual({ tipo: 'oculta' });
  });
});

describe('YoScreen', () => {
  const codigo = fs.readFileSync(path.resolve(__dirname, '../../../../screens/YoScreen.tsx'), 'utf8');

  it('la tarjeta de fase y el semáforo solo se dibujan con el programa en marcha', () => {
    const condicion = codigo.indexOf("evolucion.tipo === 'en-curso'");
    expect(condicion).toBeGreaterThan(-1);
    expect(codigo.indexOf('<TarjetaDeFase')).toBeGreaterThan(condicion);
    expect(codigo.indexOf('<TarjetaSemaforoHoy')).toBeGreaterThan(condicion);
    // …y el rótulo «Tu evolución» vive dentro de esa misma condición: nunca queda suelto.
    expect(codigo.indexOf('Tu evolución</Text>')).toBeGreaterThan(condicion);
  });

  it('antes del Día 1 dice cuándo empieza con la fila compartida con Hoy y Plan', () => {
    expect(codigo).toMatch(/evolucion\.tipo === 'empieza' \? \(\s*(\/\*[\s\S]*?\*\/\s*)?<FilaDelProgramaQueEmpieza fechaInicio=\{evolucion\.fechaInicio\} \/>/);
  });
});
