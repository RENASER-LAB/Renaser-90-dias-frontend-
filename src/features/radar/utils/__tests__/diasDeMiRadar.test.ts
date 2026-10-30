import { describe, expect, it } from '@jest/globals';

import type { MiRadarApi } from '../../types/radar.types';
import {
  MENSAJE_SIN_HORAS_EN_DIAS,
  algunDiaTienePropias,
  aplicarAlosDias,
  dejarComoLosDemas,
  errorDeLosDias,
  hayCambiosEnLosDias,
  resumenDelDiaEnLaFila,
  textoDelBotonDeLosDias,
  vistaDeLosDias,
} from '../diasDeMiRadar';

/**
 * Mi Radar por día (spec 012, cuarta ronda): lo que pasa al marcar días y tocarles las horas, igual que «Planificar»:
 * solo se guarda lo tocado, los días que no coinciden se dicen, y un día igual que todos vuelve a seguirlos.
 */

const SAB = 6;
const DOM = 7;
const LUN = 1;
const base = (...dias: Array<[number, number[]]>): MiRadarApi => ({
  encendido: true,
  horas: [9, 14, 20],
  dias: dias.map(([dia, horas]) => ({ dia, horas })),
});

describe('lo que se ve al marcar días', () => {
  it('días que siguen a todos: sus horas, sin «Sin Radar» y sin aviso de distintas', () => {
    expect(vistaDeLosDias(base(), [SAB], {})).toEqual({ sin: false, horas: [9, 14, 20], distintas: false });
    expect(vistaDeLosDias(base(), [SAB, DOM], {})).toEqual({ sin: false, horas: [9, 14, 20], distintas: false });
  });

  it('un día con horas propias muestra esas', () => {
    expect(vistaDeLosDias(base([SAB, [11]]), [SAB], {})).toEqual({ sin: false, horas: [11], distintas: false });
  });

  it('días con las mismas horas propias se ven como una sola cosa', () => {
    expect(vistaDeLosDias(base([SAB, [11]], [DOM, [11]]), [SAB, DOM], {})).toEqual({ sin: false, horas: [11], distintas: false });
  });

  it('días con horas distintas: no se marca ninguna y se dice que son distintas', () => {
    expect(vistaDeLosDias(base([SAB, [11]]), [SAB, DOM], {})).toEqual({ sin: false, horas: [], distintas: true });
    expect(vistaDeLosDias(base([SAB, [11]], [DOM, [12]]), [SAB, DOM], {})).toEqual({ sin: false, horas: [], distintas: true });
  });

  it('«Sin Radar»: encendido si todos los marcados van sin Radar; «Varía» si solo algunos', () => {
    expect(vistaDeLosDias(base([DOM, []]), [DOM], {})).toEqual({ sin: true, horas: [], distintas: false });
    expect(vistaDeLosDias(base([SAB, []], [DOM, []]), [SAB, DOM], {})).toEqual({ sin: true, horas: [], distintas: false });
    expect(vistaDeLosDias(base([DOM, []]), [SAB, DOM], {})).toEqual({ sin: 'varia', horas: [], distintas: true });
  });

  it('lo tocado se ve en el acto: elegir horas para días distintos las pone a todos los marcados', () => {
    expect(vistaDeLosDias(base([SAB, [11]]), [SAB, DOM], { horas: [16] })).toEqual({ sin: false, horas: [16], distintas: false });
  });

  it('elegir horas para días que iban sin Radar los saca de ahí', () => {
    expect(vistaDeLosDias(base([DOM, []]), [DOM], { horas: [10] })).toEqual({ sin: false, horas: [10], distintas: false });
  });

  it('apagar «Sin Radar» muestra las horas que seguirían (las de todos los días)', () => {
    expect(vistaDeLosDias(base([DOM, []]), [DOM], { sin: false })).toEqual({ sin: false, horas: [9, 14, 20], distintas: false });
  });

  it('encender «Sin Radar» deja los marcados sin horas', () => {
    expect(vistaDeLosDias(base(), [SAB, DOM], { sin: true })).toEqual({ sin: true, horas: [], distintas: false });
    expect(vistaDeLosDias(base([SAB, [11]]), [SAB, DOM], { sin: true })).toEqual({ sin: true, horas: [], distintas: false });
  });

  it('todas las horas desmarcadas se ven así (ninguna), sin pasar a «Sin Radar»', () => {
    expect(vistaDeLosDias(base([SAB, [11]]), [SAB], { horas: [] })).toEqual({ sin: false, horas: [], distintas: false });
  });

  it('con Mi Radar apagado aún (se está eligiendo), las horas de todos son las que se están eligiendo', () => {
    const sinGuardar: MiRadarApi = { encendido: false, horas: [8, 12], dias: [] };
    expect(vistaDeLosDias(sinGuardar, [SAB], {})).toEqual({ sin: false, horas: [8, 12], distintas: false });
  });
});

describe('qué se guarda: solo lo tocado', () => {
  it('«Sin Radar estos días» deja esos días con `horas: []`; los demás no cambian', () => {
    expect(aplicarAlosDias(base(), [SAB, DOM], { sin: true })).toEqual([
      { dia: SAB, horas: [] },
      { dia: DOM, horas: [] },
    ]);
    expect(aplicarAlosDias(base([LUN, [8]]), [DOM], { sin: true })).toEqual([
      { dia: LUN, horas: [8] },
      { dia: DOM, horas: [] },
    ]);
  });

  it('elegir horas las pone a todos los marcados, ordenadas, y también a los que iban sin Radar', () => {
    expect(aplicarAlosDias(base([DOM, []]), [SAB, DOM], { horas: [16, 11] })).toEqual([
      { dia: SAB, horas: [11, 16] },
      { dia: DOM, horas: [11, 16] },
    ]);
  });

  it('un día que queda con las mismas horas que todos vuelve a seguirlos: no se guarda como propio', () => {
    expect(aplicarAlosDias(base([SAB, [11]]), [SAB], { horas: [20, 9, 14] })).toEqual([]);
    expect(aplicarAlosDias(base([SAB, [11]], [LUN, [8]]), [SAB], { horas: [9, 14, 20] })).toEqual([{ dia: LUN, horas: [8] }]);
  });

  it('apagar «Sin Radar» sin elegir horas: esos días vuelven a seguir a todos; los que tenían otras horas no cambian', () => {
    expect(aplicarAlosDias(base([SAB, [11]], [DOM, []]), [SAB, DOM], { sin: false })).toEqual([{ dia: SAB, horas: [11] }]);
  });

  it('no tocar nada no cambia nada, aunque haya días marcados', () => {
    const b = base([SAB, [11]], [DOM, []]);
    expect(aplicarAlosDias(b, [SAB, DOM, LUN], {})).toEqual([{ dia: SAB, horas: [11] }, { dia: DOM, horas: [] }]);
    expect(hayCambiosEnLosDias(b, [SAB, DOM], {})).toBe(false);
  });

  it('una lista vacía de horas todavía no es «Sin Radar»: no cambia nada hasta que se diga', () => {
    expect(aplicarAlosDias(base([SAB, [11]]), [SAB], { horas: [] })).toEqual([{ dia: SAB, horas: [11] }]);
  });

  it('las entradas que ya eran iguales a todos no se arrastran', () => {
    expect(aplicarAlosDias(base([LUN, [9, 14, 20]]), [SAB], { sin: true })).toEqual([{ dia: SAB, horas: [] }]);
  });

  it('con Mi Radar aún apagado sirve igual: guarda sobre las horas que se están eligiendo', () => {
    const sinGuardar: MiRadarApi = { encendido: false, horas: [8, 12], dias: [] };
    expect(aplicarAlosDias(sinGuardar, [SAB], { horas: [8, 12] })).toEqual([]);
    expect(aplicarAlosDias(sinGuardar, [SAB], { horas: [11] })).toEqual([{ dia: SAB, horas: [11] }]);
  });
});

describe('«Guardar horas · …» solo cuando hay algo que guardar', () => {
  it('cambia algo: elegir otras horas, o «Sin Radar»', () => {
    expect(hayCambiosEnLosDias(base(), [SAB], { horas: [11] })).toBe(true);
    expect(hayCambiosEnLosDias(base(), [SAB], { sin: true })).toBe(true);
    expect(hayCambiosEnLosDias(base([SAB, []]), [SAB], { sin: false })).toBe(true);
  });

  it('no cambia nada: dejar lo mismo, o encender lo que ya estaba encendido', () => {
    expect(hayCambiosEnLosDias(base(), [SAB], {})).toBe(false);
    expect(hayCambiosEnLosDias(base(), [SAB], { horas: [9, 14, 20] })).toBe(false);
    expect(hayCambiosEnLosDias(base([SAB, []]), [SAB], { sin: true })).toBe(false);
    expect(hayCambiosEnLosDias(base([SAB, [11]]), [SAB], { horas: [11] })).toBe(false);
  });

  it('el motivo si lo tocado no se puede guardar: sin horas y sin «Sin Radar»', () => {
    expect(errorDeLosDias({ horas: [] })).toBe(MENSAJE_SIN_HORAS_EN_DIAS);
    expect(MENSAJE_SIN_HORAS_EN_DIAS).toBe('Elige al menos una hora o marca «Sin Radar» para esos días');
    expect(errorDeLosDias({ horas: [], sin: true })).toBeNull();
    expect(errorDeLosDias({ horas: [11] })).toBeNull();
    expect(errorDeLosDias({})).toBeNull();
    expect(errorDeLosDias({ sin: false })).toBeNull();
  });
});

describe('«Dejar sáb como los demás días»', () => {
  it('quita lo propio de los marcados y deja el resto', () => {
    const b = base([LUN, [8]], [SAB, [11]], [DOM, []]);
    expect(dejarComoLosDemas(b, [SAB])).toEqual([{ dia: LUN, horas: [8] }, { dia: DOM, horas: [] }]);
    expect(dejarComoLosDemas(b, [SAB, DOM, LUN])).toEqual([]);
  });

  it('solo se ofrece si alguno de los marcados tiene horas propias o va sin Radar', () => {
    const b = base([SAB, [11]], [DOM, []]);
    expect(algunDiaTienePropias(b, [SAB])).toBe(true);
    expect(algunDiaTienePropias(b, [LUN, DOM])).toBe(true);
    expect(algunDiaTienePropias(b, [LUN])).toBe(false);
    expect(algunDiaTienePropias(base([LUN, [9, 14, 20]]), [LUN])).toBe(false);
  });
});

describe('el ícono de cada día de la fila', () => {
  it('un día que sigue a todos no lleva ícono', () => {
    expect(resumenDelDiaEnLaFila(base(), 3)).toBeNull();
    expect(resumenDelDiaEnLaFila(base([SAB, [11]]), 3)).toBeNull();
  });

  it('con horas propias: la campana (y el lector dice cuáles)', () => {
    expect(resumenDelDiaEnLaFila(base([SAB, [11, 15]]), SAB)).toEqual({ largo: 'Horas propias: 11:00 y 15:00', sinAviso: false });
  });

  it('sin Radar: la campana tachada (y el lector lo dice)', () => {
    expect(resumenDelDiaEnLaFila(base([DOM, []]), DOM)).toEqual({ largo: 'Sin Radar', sinAviso: true });
  });

  it('una entrada igual a las de todos no cuenta como propia', () => {
    expect(resumenDelDiaEnLaFila(base([SAB, [9, 14, 20]]), SAB)).toBeNull();
  });
});

describe('el botón de guardar', () => {
  it('dice las horas y los días; si aún está apagado, también que enciende', () => {
    expect(textoDelBotonDeLosDias({ guardando: false, frase: 'sáb, dom', enciende: false })).toBe('Guardar horas · sáb, dom');
    expect(textoDelBotonDeLosDias({ guardando: false, frase: 'sáb', enciende: true })).toBe('Guardar y encender · sáb');
    expect(textoDelBotonDeLosDias({ guardando: true, frase: 'sáb', enciende: false })).toBe('Guardando…');
  });
});
