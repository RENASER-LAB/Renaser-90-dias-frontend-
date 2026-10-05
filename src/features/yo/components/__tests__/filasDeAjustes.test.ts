/**
 * Las filas de Ajustes de Yo (rediseño del 2026-10-05), y el bug de la línea negra al pie de cada
 * grupo en modo claro: la última fila tenía `borderBottomWidth: 1` sin `borderBottomColor`, y un borde
 * sin color se dibuja negro. Acá ninguna fila lleva borde: el grupo pone una línea ENTRE filas.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { light } from '../../../../theme/tokens';
import {
  ALTO_FILA_AJUSTE,
  FilaDeAjuste,
  GrupoDeAjustes,
  LADO_BALDOSA,
  TAMANO_CHEVRON_FILA,
  TAMANO_ICONO_BALDOSA,
} from '../FilasDeAjustes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz;
}

const plano = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const vistas = (raiz: ReactTestRenderer) => raiz.root.findAll(n => (n.type as unknown) === 'View');
const iconos = (raiz: ReactTestRenderer) =>
  raiz.root.findAll(n => typeof n.type === 'function' && (n.type as { name?: string }).name === 'Icon');

function grupoDeTres(conLaDelMedio: boolean) {
  return React.createElement(
    GrupoDeAjustes,
    { titulo: 'Preferencias' },
    React.createElement(FilaDeAjuste, { icono: 'bell', titulo: 'Notificaciones', detalle: 'Qué avisos te llegan', onPress: () => undefined }),
    conLaDelMedio ? React.createElement(FilaDeAjuste, { icono: 'alarmClock', titulo: 'Alarmas', onPress: () => undefined }) : null,
    React.createElement(FilaDeAjuste, { icono: 'logout', titulo: 'Cerrar sesión', peligro: true, sinChevron: true, onPress: () => undefined }),
  );
}

describe('un grupo de Ajustes', () => {
  it('ninguna vista dibuja un borde sin color (la línea negra del pie)', () => {
    const raiz = dibujar(grupoDeTres(true));
    for (const v of vistas(raiz)) {
      const e = plano(v) as Record<string, unknown>;
      for (const lado of ['', 'Top', 'Bottom', 'Left', 'Right']) {
        const ancho = e[`border${lado}Width`];
        if (typeof ancho === 'number' && ancho > 0) {
          expect({ lado, color: e[`border${lado}Color`] ?? e.borderColor }).toEqual({ lado, color: expect.any(String) });
        }
      }
    }
  });

  it('pone una línea entre dos filas y ninguna después de la última', () => {
    expect(dibujar(grupoDeTres(true)).root.findAll(n => n.props.testID === 'separador-de-ajuste' && (n.type as unknown) === 'View')).toHaveLength(2);
    // Una fila que no se muestra no deja una línea doble ni una al final.
    expect(dibujar(grupoDeTres(false)).root.findAll(n => n.props.testID === 'separador-de-ajuste' && (n.type as unknown) === 'View')).toHaveLength(1);
  });

  it('el título va en tipo oración y se anuncia como encabezado', () => {
    const raiz = dibujar(grupoDeTres(true));
    const [titulo] = raiz.root.findAll(n => n.type === Text && n.props.accessibilityRole === 'header');
    expect(titulo.props.children).toBe('Preferencias');
  });
});

describe('una fila de Ajustes', () => {
  it('mide 56, con baldosa dorada de 30 e ícono de 18, y «›» de 20 si abre otra pantalla', () => {
    const raiz = dibujar(React.createElement(FilaDeAjuste, { icono: 'bell', titulo: 'Notificaciones', onPress: () => undefined }));
    const fila = raiz.root.findAll(n => (n.type as unknown) === 'View' && plano(n).minHeight === ALTO_FILA_AJUSTE);
    expect(fila.length).toBeGreaterThan(0);
    const [baldosa] = raiz.root.findAll(n => n.props.testID === 'baldosa-de-ajuste' && (n.type as unknown) === 'View');
    expect(plano(baldosa)).toMatchObject({ width: LADO_BALDOSA, height: LADO_BALDOSA, backgroundColor: light.gold });
    const [icono, chevron] = iconos(raiz);
    expect(icono.props).toMatchObject({ name: 'bell', size: TAMANO_ICONO_BALDOSA, color: light.onGold });
    expect(chevron.props).toMatchObject({ name: 'chevron', size: TAMANO_CHEVRON_FILA });
  });

  it('una acción en rojo (cerrar sesión) no lleva «›»: no abre otra pantalla', () => {
    const raiz = dibujar(React.createElement(FilaDeAjuste, { icono: 'logout', titulo: 'Cerrar sesión', peligro: true, sinChevron: true, onPress: () => undefined }));
    expect(iconos(raiz).map(i => i.props.name)).toEqual(['logout']);
    const [texto] = raiz.root.findAll(n => n.type === Text && n.props.children === 'Cerrar sesión');
    expect(plano(texto).color).toBe(light.danger);
  });

  it('se toca entera y se anuncia con su título y su detalle', () => {
    const alTocar = jest.fn();
    const raiz = dibujar(React.createElement(FilaDeAjuste, { icono: 'bell', titulo: 'Notificaciones', detalle: 'Qué avisos te llegan', onPress: alTocar }));
    const [boton] = raiz.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(boton.props.accessibilityLabel).toBe('Notificaciones. Qué avisos te llegan');
    act(() => boton.props.onPress());
    expect(alTocar).toHaveBeenCalledTimes(1);
  });

  it('con un accesorio (el interruptor) la fila no se toca: se toca el accesorio', () => {
    const raiz = dibujar(
      React.createElement(FilaDeAjuste, {
        icono: 'sun',
        titulo: 'Modo oscuro',
        accesorio: React.createElement(Text, { testID: 'accesorio' }, 'interruptor'),
        onPress: () => undefined,
      }),
    );
    // Nada tocable adentro: ni un botón ni un `Pressable` (la `FilaDeAjuste` misma recibe `onPress` y lo ignora).
    expect(raiz.root.findAll(n => n.type !== FilaDeAjuste && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(raiz.root.findAll(n => n.props.accessibilityRole === 'button')).toHaveLength(0);
    expect(raiz.root.findAll(n => n.props.testID === 'accesorio').length).toBeGreaterThan(0);
    expect(iconos(raiz).map(i => i.props.name)).toEqual(['sun']);
  });
});
