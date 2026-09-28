import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → «Tu Caja Renaser» (D-219, spec §7): los cinco pasos, «Ya la recibí» solo cuando el servidor lo
 * permite, «¿Te la enviamos a otro lugar?» antes del envío y, ya entregada, la invitación a publicar
 * una foto en el Muro (que abre el composer que ya existe).
 */

const mockIrAPestana = jest.fn((_nombre: string, _params?: Record<string, unknown>) => true);
const mockRecibida = jest.fn(async () => undefined);
const mockDestino = jest.fn(async (_d: unknown) => undefined);
const mockConfirmar = jest.fn(async (_t: string, _m?: string, _o?: unknown) => true);

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../../navigation/navegacionRef', () => ({
  irAPestana: (nombre: string, params?: Record<string, unknown>) => mockIrAPestana(nombre, params),
}));
jest.mock('../../../admin/utils/dialogo', () => ({
  confirmar: (t: string, m?: string, o?: unknown) => mockConfirmar(t, m, o),
  avisar: () => undefined,
}));
jest.mock('../../api/cajaApi', () => ({
  confirmarQueLaRecibi: () => mockRecibida(),
  guardarMiDestino: (d: unknown) => mockDestino(d),
}));

import type { MiCaja } from '../../api/cajaSchemas';
import { MiCajaScreen } from '../MiCajaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const onCambio = jest.fn(async () => undefined);

function montar(caja: MiCaja): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(MiCajaScreen, { caja, onVolver: () => undefined, onCambio }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

const boton = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  mockIrAPestana.mockClear();
  mockRecibida.mockClear();
  mockDestino.mockClear();
  onCambio.mockClear();
});

describe('Tu Caja Renaser', () => {
  it('en camino: muestra el courier y el código, y deja confirmar que llegó', async () => {
    const r = montar({
      estado: 'ENVIADA',
      pasos: [{ estado: 'ENVIADA', en: '2026-09-26T15:00:00Z' }],
      envioDatos: { medio: 'Courier', courier: 'Olva', codigo: 'OL-123', rastreoUrl: 'https://tracking.olvacourier.com' },
      puedeConfirmar: true,
      puedeCambiarDestino: false,
    });
    const texto = textos(r);
    expect(texto).toContain('En camino');
    expect(texto).toContain('Olva · OL-123');
    expect(boton(r, 'Ver dónde va')).toBeDefined();
    expect(boton(r, '¿Te la enviamos a otro lugar?')).toBeUndefined();

    await act(async () => {
      boton(r, 'Ya la recibí').props.onPress();
    });
    expect(mockRecibida).toHaveBeenCalledTimes(1);
    expect(onCambio).toHaveBeenCalledTimes(1);
  });

  it('sin permiso del servidor no hay «Ya la recibí»', () => {
    const r = montar({ estado: 'ENVIADA', puedeConfirmar: false });
    expect(boton(r, 'Ya la recibí')).toBeUndefined();
  });

  it('antes del envío deja pedir otro lugar, y guarda solo lo escrito', async () => {
    const r = montar({ estado: 'ARMANDO', puedeCambiarDestino: true, destino: { quienRecibe: 'Mi mamá' } });
    await act(async () => {
      boton(r, '¿Te la enviamos a otro lugar?').props.onPress();
    });
    const direccion = r.root.findAll(n => n.props.accessibilityLabel === 'Dirección' && typeof n.props.onChangeText === 'function')[0];
    act(() => direccion.props.onChangeText(' Jr. Cusco 45 '));
    await act(async () => {
      boton(r, 'Guardar').props.onPress();
    });
    expect(mockDestino).toHaveBeenCalledWith({
      otraDireccion: 'Jr. Cusco 45',
      otroCelular: null,
      quienRecibe: 'Mi mamá',
      referencias: null,
      provincia: null,
    });
    expect(onCambio).toHaveBeenCalled();
  });

  it('entregada: invita a publicar una foto en el Muro, con el composer que ya existe', () => {
    const r = montar({ estado: 'ENTREGADA', pasos: [] });
    expect(textos(r)).toContain('¿Nos muestras tu caja?');
    act(() => boton(r, 'Publicar una foto').props.onPress());
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirComposerMuro: true });
  });

  it('con un problema, lo dice sin detalles internos', () => {
    const r = montar({ estado: 'CON_PROBLEMA' });
    expect(textos(r)).toContain('Estamos resolviendo tu envío');
    expect(boton(r, 'Publicar una foto')).toBeUndefined();
  });

  it('trazabilidad: una línea por envío con su rastreo, el motivo y la foto de su caja (D-220)', () => {
    const r = montar({
      estado: 'ENVIADA',
      pasos: [{ estado: 'ENVIADA', en: '2026-09-30T15:00:00Z' }],
      envioDatos: { medio: 'Shalom', courier: 'Shalom', codigo: 'SH-7777', rastreoUrl: 'https://shalom.com.pe/rastrea' },
      puedeConfirmar: true,
      envios: [
        {
          envio: 1,
          courier: 'Olva',
          codigo: 'OLV-7777',
          rastreoUrl: 'https://tracking.olvaexpress.pe/',
          resultado: 'CON_PROBLEMA',
          en: '2026-09-28T15:00:00Z',
          motivo: 'PERDIDA',
        },
        {
          envio: 2,
          courier: 'Shalom',
          codigo: 'SH-7777',
          rastreoUrl: 'https://shalom.com.pe/rastrea',
          resultado: 'ENVIADA',
          en: '2026-09-30T15:00:00Z',
        },
      ],
      fotoArmadaUrl: 'https://almacen.test/onboarding/a/caja/1?firma',
    });
    const texto = textos(r);
    expect(texto).toContain('Envío 1 · Olva OLV-7777 · Se perdió · 28 sep');
    expect(texto).toContain('Envío 2 · Shalom SH-7777 · En camino · 30 sep');
    expect(texto).not.toContain('Shalom · SH-7777');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Ver dónde va' && typeof n.props.onPress === 'function')).toHaveLength(2);
    const foto = r.root.findAll(n => n.props.accessibilityLabel === 'Foto de tu caja' && n.props.source);
    expect(foto[0]?.props.source).toEqual({ uri: 'https://almacen.test/onboarding/a/caja/1?firma' });
  });

  it('con un problema dice el motivo en palabras simples', () => {
    const r = montar({
      estado: 'CON_PROBLEMA',
      envios: [{ envio: 1, courier: 'Olva', codigo: 'OLV-1', resultado: 'CON_PROBLEMA', en: null, motivo: 'DEVUELTA' }],
    });
    const texto = textos(r);
    expect(texto).toContain('Estamos resolviendo tu envío');
    expect(texto).toContain('La devolvieron');
    expect(texto).not.toContain('DEVUELTA');
  });

  it('sin envío que haya salido ni foto, no hay líneas de envío ni imagen', () => {
    const r = montar({ estado: 'ARMANDO', envios: [], fotoArmadaUrl: null });
    expect(textos(r)).not.toContain('Envío');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Foto de tu caja')).toHaveLength(0);
  });
});
