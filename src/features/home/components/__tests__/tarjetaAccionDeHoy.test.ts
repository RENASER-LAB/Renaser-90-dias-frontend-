import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La tarjeta de acciones de Hoy (2026-10-31, pedido del dueño: «mismo diseño, no las mismas palabras»): la hora con su ícono, el
 * título en negrita, «Meta: …» y un botón dorado a todo el ancho de 52. Cuatro contenidos con el mismo esqueleto. Qué muestra
 * cada caso lo decide `vistaDeLaAccionDeHoy` (probada aparte); acá se prueba lo que se dibuja y lo que hace cada botón.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import type { RocaDiariaApi } from '../../../objetivos/types/objetivos.types';
import { TarjetaAccionDeHoy } from '../TarjetaAccionDeHoy';
import type { VistaDeLaAccionDeHoy } from '../../utils/vistaDeLaAccionDeHoy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const accion = (extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi => ({
  id: 'r1', fecha: '2026-10-31', posicion: 1, titulo: 'Caminar 40 minutos', descripcion: null, color: 'VERDE', puntajeImpacto: 5,
  esDelegable: false, eje: 'CUERPO', rocaSemanalId: 's1', horaInicio: '09:00:00', horaFin: '09:45:00', completada: false,
  completadaEn: null, puntosOtorgados: 0, bloqueada: false, acciones: [], ...extra,
});

const alEmpezar = jest.fn();
const alIrAPlan = jest.fn();
const alAgendar = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar(vista: VistaDeLaAccionDeHoy, meta: string | null = null) {
  act(() => {
    raiz = TestRenderer.create(React.createElement(TarjetaAccionDeHoy, { vista, meta, alEmpezar, alIrAPlan, alAgendar }));
  });
}
const textosDe = (): string[] =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const botones = (): ReactTestInstance[] => raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View');
const iconos = () => raiz!.root.findAll(x => typeof x.props.name === 'string' && typeof x.props.size === 'number').map(x => x.props.name as string);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  alEmpezar.mockReset();
  alIrAPlan.mockReset();
  alAgendar.mockReset();
});

describe('la acción que sigue', () => {
  it('la hora con su ícono, el título, «Meta: …» y «Empezar ahora»', () => {
    montar({ tipo: 'accion', accion: accion() }, 'Esta semana: caminar 5 días');
    const t = textosDe();
    expect(t).toContain('09:00 – 09:45');
    expect(t).toContain('Caminar 40 minutos');
    expect(t).toContain('Meta: Esta semana: caminar 5 días');
    expect(t.some(x => x.includes('Empezar ahora'))).toBe(true);
    expect(t.join(' ')).not.toContain('Iniciar enfoque');
    expect(iconos()).toContain('calendar');
    expect(iconos()).toContain('chevron');
  });

  it('el título va en negrita y de 18; la hora de 16 con cifras tabulares', () => {
    montar({ tipo: 'accion', accion: accion() });
    const titulo = raiz!.root.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Caminar 40 minutos')[0];
    const estiloTitulo = StyleSheet.flatten(titulo.props.style);
    expect(estiloTitulo.fontFamily).toMatch(/700Bold/);
    expect(estiloTitulo.fontSize).toBeGreaterThanOrEqual(17);
    const hora = raiz!.root.findAll(x => (x.type as unknown) === 'Text' && x.props.children === '09:00 – 09:45')[0];
    const estiloHora = StyleSheet.flatten(hora.props.style);
    expect(estiloHora.fontSize).toBeGreaterThanOrEqual(16);
    expect(estiloHora.fontVariant).toContain('tabular-nums');
  });

  it('solo con inicio dice «09:00»; sin hora, «Sin hora»', () => {
    montar({ tipo: 'accion', accion: accion({ horaFin: null }) });
    expect(textosDe()).toContain('09:00');
    act(() => raiz?.unmount());
    montar({ tipo: 'accion', accion: accion({ horaInicio: null, horaFin: null }) });
    expect(textosDe()).toContain('Sin hora');
  });

  it('sin meta, la línea no se dibuja', () => {
    montar({ tipo: 'accion', accion: accion() }, null);
    expect(textosDe().some(x => x.startsWith('Meta:'))).toBe(false);
  });

  it('«Empezar ahora» lleva a Training con el id de la acción', () => {
    montar({ tipo: 'accion', accion: accion({ id: 'abc' }) });
    expect(botones()).toHaveLength(1);
    act(() => botones()[0].props.onPress());
    expect(alEmpezar).toHaveBeenCalledWith('abc');
  });

  it('el botón es dorado y mide 52 como mínimo, a todo el ancho; sin los «…» de la referencia', () => {
    montar({ tipo: 'accion', accion: accion() });
    expect(iconos()).not.toContain('dots');
    const fuente = jest.requireActual<typeof import('fs')>('fs').readFileSync(require.resolve('../../../../components/GoldButton'), 'utf-8');
    expect(fuente).toMatch(/minHeight: 52/);
    expect(fuente).toMatch(/colors=\{c\.goldGrad\}/);
  });
});

describe('los otros contenidos, con el mismo esqueleto', () => {
  it('sin objetivos de 90 días: una fila compacta «Define tu objetivo de 90 días en Plan», toda tocable, sin botón dorado', () => {
    montar({ tipo: 'sin-objetivos' });
    expect(textosDe()).toContain('Define tu objetivo de 90 días en Plan');
    expect(textosDe()).toContain('Escribir mi objetivo');
    expect(iconos()).toEqual(expect.arrayContaining(['flag', 'chevron']));
    // Sin el botón dorado de las otras tarjetas (su degradado): la fila entera es el botón.
    expect(raiz!.root.findAll(x => Array.isArray(x.props.colors)).length).toBe(0);
    act(() => botones()[0].props.onPress());
    expect(alIrAPlan).toHaveBeenCalledTimes(1);
    expect(alAgendar).not.toHaveBeenCalled();
  });

  it('con objetivos del diagnóstico por confirmar: «Confirma tus objetivos de 90 días», con «Confirmar», que lleva a Plan', () => {
    montar({ tipo: 'por-confirmar', cantidad: 3 });
    expect(textosDe()).toContain('Confirma tus objetivos de 90 días');
    expect(textosDe()).toContain('Confirmar');
    act(() => botones()[0].props.onPress());
    expect(alIrAPlan).toHaveBeenCalledTimes(1);
  });

  it('las dos filas compactas dicen el título y la acción también al lector de pantalla, y no nombran el Mapa', () => {
    for (const vista of [{ tipo: 'sin-objetivos' }, { tipo: 'por-confirmar', cantidad: 2 }] as const) {
      montar(vista);
      expect(botones()[0].props.accessibilityLabel).toMatch(/^(Define tu objetivo de 90 días en Plan\. Escribir mi objetivo\.|Confirma tus objetivos de 90 días\. Confirmar\.)$/);
      expect(textosDe().join(' ')).not.toContain('Mapa');
      expect(iconos()).not.toContain('map');
      act(() => raiz?.unmount());
    }
  });

  it('la fila compacta no crece: del mismo alto que la de Coherencia / Racha (72 de mínimo), no la tarjeta grande', () => {
    montar({ tipo: 'sin-objetivos' });
    const estilo = StyleSheet.flatten(botones()[0].props.style);
    expect(estilo.minHeight).toBe(72);
  });

  it('sin acciones hoy: «Hoy no tienes acciones agendadas», con «Agendar en Plan»', () => {
    montar({ tipo: 'sin-acciones' });
    expect(textosDe()).toContain('Hoy no tienes acciones agendadas');
    act(() => botones()[0].props.onPress());
    expect(alAgendar).toHaveBeenCalledTimes(1);
    expect(textosDe().some(x => x.includes('Agendar en Plan'))).toBe(true);
  });

  it('todo cumplido: «Cumpliste tus acciones de hoy», sin botón', () => {
    montar({ tipo: 'todo-cumplido' });
    expect(textosDe()).toContain('Cumpliste tus acciones de hoy');
    expect(botones()).toHaveLength(0);
  });

  it('la meta solo se dibuja con una acción: en los demás casos se ignora', () => {
    montar({ tipo: 'sin-acciones' }, 'Una meta suelta');
    expect(textosDe().some(x => x.startsWith('Meta:'))).toBe(false);
  });
});
