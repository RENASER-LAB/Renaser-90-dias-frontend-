import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
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
    'SÁB': { corto: '30′', largo: 'Aviso 30 minutos antes', sinAviso: false },
    DOM: { corto: 'sin aviso', largo: 'Sin aviso', sinAviso: true },
    JUE: { corto: 'a la hora', largo: 'Aviso a la hora', sinAviso: false },
  };

  it('dibuja la campana con los minutos solo en los días con aviso propio, y la campana tachada sin aviso', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    expect(iconos(r).filter(n => n === 'bell')).toHaveLength(2);
    expect(iconos(r).filter(n => n === 'bellOff')).toHaveLength(1);
    expect(textos(r)).toEqual(expect.arrayContaining(['30′', 'a la hora']));
    // El día sin aviso no escribe «sin aviso»: va la campana tachada, y el lector de pantalla lo dice.
    expect(textos(r)).not.toContain('sin aviso');
  });

  it('las campanas son de 16, el tamaño de uso junto a texto chico, y el texto va a 13 y en negrita', () => {
    const r = montar({ avisoDelDia: dia => avisos[dia] ?? null });
    const campanas = r.root.findAll(n => n.props.name === 'bell' && n.props.size !== undefined);
    expect(campanas.length).toBeGreaterThan(0);
    for (const c of campanas) expect(c.props.size).toBe(16);
    const minutos = r.root.findAll(n => (n.type as unknown) === 'Text' && React.Children.toArray(n.props.children).includes('30′'))[0];
    const estilo = Object.assign({}, ...[minutos.props.style].flat(3).filter(Boolean));
    expect(estilo).toMatchObject({ fontSize: 13, fontFamily: 'Jost_700Bold' });
    // Nunca gris tenue: el color de los minutos no es el del texto suave.
    expect(estilo.color).toBeDefined();
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
    const avisos: Partial<Record<DiaDelPlan, AvisoDeUnDiaEnLaFila>> = { 'SÁB': { corto: '30′', largo: 'Aviso 30 minutos antes', sinAviso: false } };
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
