import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../utils/semanaDelPlan';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { FilaDeDiasDelPlan, type AlarmaDeUnDiaEnLaFila, type AvisoDeUnDiaEnLaFila } from '../FilaDeDiasDelPlan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * La fila de días con el aviso propio de cada día (spec 008, FR-005). La prop es OPCIONAL: Plan (agendar
 * acciones) no la pasa y su fila tiene que ser exactamente la de siempre.
 */
const corre = Object.fromEntries(DIAS_DEL_PLAN.map(d => [d, true])) as Record<DiaDelPlan, boolean>;
const todosPlanificables = () => true;
const horarios = { 'SÁB': { hora: '09:00', propio: true }, LUN: { hora: '07:00' } };

let raiz: ReactTestRenderer | null = null;

function montar(extra: Partial<React.ComponentProps<typeof FilaDeDiasDelPlan>> = {}): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(FilaDeDiasDelPlan, {
        corre, horarios, enEdicion: [], planificable: todosPlanificables, onAlternarDia: () => undefined, ...extra,
      }),
    );
  });
  return raiz!;
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

const iconos = (r: ReactTestRenderer): string[] =>
  r.root.findAll(n => typeof n.props.name === 'string' && n.props.color !== undefined && n.props.size !== undefined).map(n => n.props.name as string);
const textos = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''));
const pastillas = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.disabled !== undefined && typeof n.props.style !== 'undefined' && Array.isArray(n.props.style));

describe('sin la prop (Plan): la fila de siempre', () => {
  it('no dibuja campanas ni le suma etiqueta a las pastillas', () => {
    const r = montar();
    expect(iconos(r)).not.toContain('bell');
    expect(iconos(r)).not.toContain('bellOff');
    for (const p of pastillas(r)) expect(p.props.accessibilityLabel).toBeUndefined();
    // La hora de cada pastilla sigue ahí.
    expect(textos(r)).toEqual(expect.arrayContaining(['09:00', '07:00']));
  });
});

describe('con la prop (editor de Planificar)', () => {
  const avisos: Partial<Record<DiaDelPlan, AvisoDeUnDiaEnLaFila>> = {
    'SÁB': { largo: 'Aviso 30 minutos antes', sinAviso: false },
    DOM: { largo: 'Sin aviso', sinAviso: true },
    JUE: { largo: 'Aviso a la hora', sinAviso: false },
  };

  it('dibuja la campana solo en los días con aviso propio, y la campana tachada sin aviso; nada escrito (spec 011)', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    expect(iconos(r).filter(n => n === 'bell')).toHaveLength(2);
    expect(iconos(r).filter(n => n === 'bellOff')).toHaveLength(1);
    // Ni los minutos («30′», «a la hora», «30′ +1») ni «sin aviso» se escriben en el chip: solo íconos.
    expect(textos(r).join(' ')).not.toMatch(/′|a la hora|sin aviso|hora\b.*\+/i);
    expect(textos(r)).not.toContain('sin aviso');
  });

  it('cada chip lleva solo la letra del día, su número y la hora: ningún texto del aviso', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    for (const pastilla of pastillas(r)) {
      const hijos = pastilla.findAll(n => (n.type as unknown) === 'Text');
      // La letra, el número del mes y la hora (o su «·»): tres textos, ni uno más.
      expect(hijos).toHaveLength(3);
    }
  });

  it('las campanas son de 16, el tamaño de uso de un solo ícono', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    const campanas = r.root.findAll(n => n.props.name === 'bell' && n.props.size !== undefined);
    expect(campanas.length).toBeGreaterThan(0);
    for (const c of campanas) expect(c.props.size).toBe(16);
  });

  it('cada pastilla se anuncia completa: día, hora y aviso', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    const etiquetas = pastillas(r).map(p => p.props.accessibilityLabel as string);
    expect(etiquetas.find(e => e.startsWith('Sábado'))).toMatch(/^Sábado \d\d, 09:00, aviso 30 minutos antes$/);
    expect(etiquetas.find(e => e.startsWith('Domingo'))).toMatch(/, sin aviso$/);
    expect(etiquetas.find(e => e.startsWith('Lunes'))).toMatch(/^Lunes \d\d, 07:00$/);
  });

  it('un día bloqueado por el candado no muestra aviso y lo dice', () => {
    const r = montar({ planificable: dia => dia !== 'SÁB', avisoDelDia: dia => avisos[dia] ?? null });
    const sabado = pastillas(r).map(p => p.props.accessibilityLabel as string).find(e => e.startsWith('Sábado'))!;
    expect(sabado).toMatch(/ya no se puede cambiar$/);
    expect(iconos(r).filter(n => n === 'bell')).toHaveLength(1); // solo el jueves
  });

  it('un día marcado se anuncia como seleccionado', () => {
    const r = montar({ enEdicion: ['SÁB'], avisoDelDia: () => null });
    const marcadas = pastillas(r).filter(p => p.props.accessibilityState?.selected === true);
    expect(marcadas).toHaveLength(1);
    expect(marcadas[0].props.accessibilityLabel).toMatch(/^Sábado/);
  });

  it('tocar una pastilla sigue avisando el día', () => {
    const alternar = jest.fn();
    const r = montar({ onAlternarDia: alternar, avisoDelDia: () => null });
    act(() => {
      pastillas(r)[5].props.onPress();
    });
    expect(alternar).toHaveBeenCalledWith('SÁB');
  });
});

describe('con «cómo suena» propio de un día (spec 009)', () => {
  const alarmas: Partial<Record<DiaDelPlan, AlarmaDeUnDiaEnLaFila>> = {
    'SÁB': { largo: 'Alarma propia: sin sonido, vibra' },
    VIE: { largo: 'Alarma propia: con voz, vibra, se repite' },
  };

  it('sin la prop no dibuja ningún reloj de alarma (Plan no cambia)', () => {
    const r = montar({ avisoDelDia: () => null });
    expect(iconos(r)).not.toContain('alarmClock');
  });

  it('dibuja un reloj de alarma de 16, sin texto, solo en los días con combinación propia', () => {
    const r = montar({ avisoDelDia: () => null, alarmaDelDia: dia => alarmas[dia] ?? null });
    const relojes = r.root.findAll(n => n.props.name === 'alarmClock' && n.props.size !== undefined);
    expect(relojes).toHaveLength(2);
    for (const reloj of relojes) expect(reloj.props.size).toBe(16);
    // «Sin texto largo»: nada de lo que dice el lector de pantalla aparece escrito en el chip.
    expect(textos(r).join(' ')).not.toMatch(/Alarma propia/);
  });

  it('el reloj convive con la campana del aviso propio del mismo día', () => {
    const avisos: Partial<Record<DiaDelPlan, AvisoDeUnDiaEnLaFila>> = { 'SÁB': { largo: 'Aviso 30 minutos antes', sinAviso: false } };
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null, alarmaDelDia: dia => alarmas[dia] ?? null });
    expect(iconos(r)).toEqual(expect.arrayContaining(['bell', 'alarmClock']));
  });

  it('la pastilla se anuncia con su alarma propia, aun sin aviso propio', () => {
    const r = montar({ alarmaDelDia: dia => alarmas[dia] ?? null });
    const etiquetas = pastillas(r).map(p => p.props.accessibilityLabel as string);
    expect(etiquetas.find(e => e.startsWith('Sábado'))).toMatch(/^Sábado \d\d, 09:00, alarma propia: sin sonido, vibra$/);
    expect(etiquetas.find(e => e.startsWith('Lunes'))).toMatch(/^Lunes \d\d, 07:00$/);
  });

  it('un día bloqueado por el candado no muestra el reloj', () => {
    const r = montar({ planificable: dia => dia !== 'SÁB', alarmaDelDia: dia => alarmas[dia] ?? null });
    expect(iconos(r).filter(n => n === 'alarmClock')).toHaveLength(1); // solo el viernes
  });
});

describe('E-643 y spec 011: el chip no se deforma con varios avisos y no escribe los minutos', () => {
  /** Jueves con cuatro avisos y alarma propia; sábado con un aviso; domingo sin aviso; el resto, sin nada. */
  const avisos: Partial<Record<DiaDelPlan, AvisoDeUnDiaEnLaFila>> = {
    JUE: { largo: 'Avisos 30, 10 y 5 minutos antes y a la hora', sinAviso: false },
    'SÁB': { largo: 'Aviso 30 minutos antes', sinAviso: false },
    DOM: { largo: 'Sin aviso', sinAviso: true },
  };
  const alarmas: Partial<Record<DiaDelPlan, AlarmaDeUnDiaEnLaFila>> = { JUE: { largo: 'Alarma propia: sin sonido, vibra' } };
  const montarDeVerdad = () => montar({ avisoDelDia: dia => avisos[dia] ?? null, alarmaDelDia: dia => alarmas[dia] ?? null });
  const estiloDe = (nodo: ReactTestInstance) => (StyleSheet.flatten(nodo.props.style) ?? {}) as Record<string, unknown>;

  it('los siete chips tienen la misma altura mínima y el mismo alineado, lleven o no campana y reloj', () => {
    const r = montarDeVerdad();
    const estilos = pastillas(r).map(estiloDe);
    expect(estilos).toHaveLength(7);
    expect(new Set(estilos.map(e => e.minHeight)).size).toBe(1);
    expect(estilos.every(e => e.justifyContent === 'flex-start' && e.paddingTop === 6)).toBe(true);
    // La altura de siempre de un chip sin aviso (58) no se usa: con la fila de íconos de abajo mide más, igual para todos.
    expect(estilos[0].minHeight).toBeGreaterThan(58);
    // Sin el texto de los minutos (spec 011) el chip es más bajo que con él (88).
    expect(estilos[0].minHeight).toBeLessThan(88);
  });

  it('todos reservan el mismo bloque de abajo (con o sin íconos) y la misma fila para la hora o el candado', () => {
    const r = montarDeVerdad();
    for (const pastilla of pastillas(r)) {
      // El bloque de abajo es solo la fila de íconos: 16 de alto, ya sin renglón de texto (spec 011).
      const bandas = pastilla.findAll(n => estiloDe(n).minHeight === 16 && estiloDe(n).alignSelf === 'stretch');
      expect(bandas.length).toBeGreaterThan(0);
      const filasDeHora = pastilla.findAll(n => estiloDe(n).height === 14 && estiloDe(n).justifyContent === 'center');
      expect(filasDeHora.length).toBeGreaterThan(0);
    }
  });

  it('la lista completa no se escribe en el chip: la oye el lector de pantalla', () => {
    const r = montarDeVerdad();
    expect(textos(r).join(' ')).not.toMatch(/30, 10 y 5|minutos antes/);
    const jueves = pastillas(r).map(p => p.props.accessibilityLabel as string).find(e => e.startsWith('Jueves'))!;
    expect(jueves).toMatch(/aviso?s 30, 10 y 5 minutos antes y a la hora, alarma propia: sin sonido, vibra$/i);
  });

  it('campana y reloj conviven en una sola fila, de 14 cada uno; solos, de 16', () => {
    const r = montarDeVerdad();
    const delJueves = pastillas(r).find(p => String(p.props.accessibilityLabel).startsWith('Jueves'))!;
    const iconosDelJueves = delJueves.findAll(n => typeof n.props.name === 'string' && n.props.size !== undefined);
    expect(iconosDelJueves.map(n => [n.props.name, n.props.size])).toEqual([['bell', 14], ['alarmClock', 14]]);
    const delSabado = pastillas(r).find(p => String(p.props.accessibilityLabel).startsWith('Sábado'))!;
    expect(delSabado.findAll(n => n.props.name === 'bell').map(n => n.props.size)).toEqual([16]);
    // La fila de íconos es la misma para todos: una sola, de 16 de alto, en fila.
    const filas = delJueves.findAll(n => (n.type as unknown) === 'View' && estiloDe(n).flexDirection === 'row' && estiloDe(n).height === 16);
    expect(filas).toHaveLength(1);
  });

  it('con la letra del sistema grande (1,3) el chip no crece sin tope: todo el texto acota su escala', () => {
    const r = montarDeVerdad();
    const delJueves = pastillas(r).find(p => String(p.props.accessibilityLabel).startsWith('Jueves'))!;
    const textosDelChip = delJueves.findAll(n => (n.type as unknown) === 'Text');
    // La letra, el número y la hora: tres textos (ya no hay resumen de minutos), todos acotados a 1,15.
    expect(textosDelChip.length).toBe(3);
    for (const t of textosDelChip) expect(t.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.15);
  });

  it('un chip con candado también reserva el bloque, sin moverse', () => {
    const r = montar({ planificable: dia => dia !== 'MAR', avisoDelDia: dia => avisos[dia] ?? null, alarmaDelDia: dia => alarmas[dia] ?? null });
    const estilos = pastillas(r).map(estiloDe);
    expect(new Set(estilos.map(e => e.minHeight)).size).toBe(1);
    const martes = pastillas(r).find(p => String(p.props.accessibilityLabel).startsWith('Martes'))!;
    expect(martes.findAll(n => n.props.name === 'lock')).toHaveLength(1);
  });

  it('sin las props (Plan) el chip es el de siempre: 58 de alto y centrado, sin bloque de abajo', () => {
    const r = montar();
    const estilos = pastillas(r).map(estiloDe);
    expect(estilos.every(e => e.minHeight === 58 && e.justifyContent === 'center')).toBe(true);
    expect(r.root.findAll(n => estiloDe(n).minHeight === 16 && estiloDe(n).alignSelf === 'stretch')).toHaveLength(0);
  });
});
