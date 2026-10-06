/**
 * El orbe del centro de Hoy con el fénix: funciona igual que antes (mismas etiquetas por fase, mantener para cerrar,
 * deshabilitado) y el fénix vivo solo está mientras Hoy se ve; si no, la foto fija.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { OrbeAcompanante } from '../../renasia/components/OrbeAcompanante';
import type { FaseDeVoz } from '../../renasia/hooks/useConversacionPorVoz';
import { crear, desmontarTodo, disparos, ultimaVistaRive, vistasRive, emitir } from './ayudasDePrueba';

const mockVista = { aLaVista: true };
jest.mock('../../renasia/hooks/useOrbeALaVista', () => ({ useOrbeALaVista: () => mockVista.aLaVista }));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'TRAINEE' } }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ mode: 'light', c: { gold: '#B2924F' } }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  desmontarTodo();
  mockVista.aLaVista = true;
});

/** El `Pressable` del orbe (el doble de React Native no deja compararlo por tipo). */
const esElBoton = (n: { type: unknown; props: Record<string, unknown> }) =>
  typeof n.type !== 'string' && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function';

function orbe(props: Partial<React.ComponentProps<typeof OrbeAcompanante>> = {}) {
  return React.createElement(OrbeAcompanante, { fase: 'reposo', diametro: 140, onTocar: () => undefined, ...props });
}

describe('OrbeAcompanante con el fénix', () => {
  it.each([
    ['reposo', 'Hablarle a tu acompañante'],
    ['escuchando', 'Terminé de hablar'],
    ['pensando', 'Tu acompañante está pensando'],
    ['hablando', 'Callar a tu acompañante'],
  ] as Array<[FaseDeVoz, string]>)('%s: la misma etiqueta de siempre', (fase, etiqueta) => {
    const boton = crear(orbe({ fase })).root.findAll(esElBoton)[0];
    expect(boton.props.accessibilityLabel).toBe(etiqueta);
    expect(boton.props.accessibilityRole).toBe('button');
  });

  it('tocar habla, mantener cierra, y el área de toque es el diámetro', () => {
    const onTocar = jest.fn();
    const onMantener = jest.fn();
    const boton = crear(orbe({ onTocar, onMantener })).root.findAll(esElBoton)[0];
    act(() => {
      boton.props.onPress();
      boton.props.onLongPress();
    });
    expect(onTocar).toHaveBeenCalledTimes(1);
    expect(onMantener).toHaveBeenCalledTimes(1);
    expect(boton.props.accessibilityHint).toBe('Mantén presionado para cerrar la conversación');
    const estilo = [boton.props.style({ pressed: false })].flat(3);
    expect(estilo).toEqual(expect.arrayContaining([expect.objectContaining({ width: 140, height: 140, opacity: 1 })]));
  });

  it('deshabilitado sigue deshabilitado', () => {
    const boton = crear(orbe({ deshabilitado: true })).root.findAll(esElBoton)[0];
    expect(boton.props.disabled).toBe(true);
  });

  it('apoyar el dedo hace reaccionar al fénix (trgTap)', () => {
    const raiz = crear(orbe());
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    act(() => raiz.root.findAll(esElBoton)[0].props.onPressIn());
    expect(disparos(rive)).toContain('trgTap');
  });

  it('con Hoy fuera de la vista no hay lienzo Rive: queda la foto fija', () => {
    mockVista.aLaVista = false;
    const raiz = crear(orbe());
    expect(raiz.root.findAll(n => n.props.testID === 'rive-del-fenix')).toHaveLength(0);
    expect(raiz.root.findAll(n => n.props.testID === 'fenix-de-ser-quieto').length).toBeGreaterThan(0);
  });
});
