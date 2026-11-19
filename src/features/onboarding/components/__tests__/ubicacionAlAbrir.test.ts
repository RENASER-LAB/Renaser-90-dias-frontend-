import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * #235 (2026-11-19, decisión del dueño): al abrir los pasos del WhatsApp y de «¿Dónde vives?», la ficha completa SOLO el país y el
 * prefijo, y solo si faltan. Departamento, ciudad y distrito quedan vacíos hasta que la persona los elige.
 *
 * Antes, `useCompletarUbicacion` rellenaba también esos tres con la ciudad del proveedor de internet (o con un lugar fijo inventado),
 * y el paso mostraba «Lima / Lima Metropolitana / Miraflores» de ejemplo aunque nadie lo hubiera elegido.
 */

const mockDetectar = jest.fn<() => Promise<unknown>>();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined },
}));
jest.mock('../../../../hooks/useEnfocarAlLlegar', () => ({ useEnfocarAlLlegar: () => undefined }));
jest.mock('../../../../services/locationService', () => {
  const real = jest.requireActual<typeof import('../../../../services/locationService')>('../../../../services/locationService');
  class LocationServiceDePrueba extends real.LocationService {
    static detectUserLocation() {
      return mockDetectar() as ReturnType<typeof real.LocationService.detectUserLocation>;
    }
  }
  return { ...real, LocationService: LocationServiceDePrueba };
});

import { PasoUbicacion, PasoWhatsapp, type PasoIdentidadProps } from '../ChapterIdentidad';
import { LocationCascadePicker } from '../../../../components/LocationCascadePicker';
import { INITIAL_FICHA_DATA } from '../../data/chaptersConfig';
import type { FichaIdentidadData } from '../../types/onboarding.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BOLIVIA = { pais: 'Bolivia', codigoPais: '+591', iso: 'BO', flag: '🇧🇴' };
const SIN_PAIS: FichaIdentidadData = { ...INITIAL_FICHA_DATA.identidad, pais: '', codigoPais: '' };

let raiz: ReactTestRenderer | null = null;

async function montar(paso: typeof PasoUbicacion, props: PasoIdentidadProps): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(paso, props));
  });
  raiz = r;
  return r;
}

beforeEach(() => {
  mockDetectar.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('Al abrir la ficha solo se completan país y prefijo (#235)', () => {
  it('si faltan, completa el país y el prefijo y deja departamento, ciudad y distrito como estaban (vacíos)', async () => {
    mockDetectar.mockResolvedValue(BOLIVIA);
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    await montar(PasoUbicacion, { data: SIN_PAIS, onChange });

    expect(onChange).toHaveBeenCalledTimes(1);
    const guardado = onChange.mock.calls[0][0];
    expect(guardado).toEqual({ ...SIN_PAIS, pais: 'Bolivia', codigoPais: '+591' });
    expect(guardado).toMatchObject({ departamento: '', ciudad: '', distrito: '' });
  });

  it('lo mismo en el paso del WhatsApp', async () => {
    mockDetectar.mockResolvedValue(BOLIVIA);
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    await montar(PasoWhatsapp, { data: SIN_PAIS, onChange });

    expect(onChange).toHaveBeenCalledWith({ ...SIN_PAIS, pais: 'Bolivia', codigoPais: '+591' });
  });

  it('no pisa un país o un prefijo que la persona ya tiene', async () => {
    mockDetectar.mockResolvedValue(BOLIVIA);
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    await montar(PasoUbicacion, { data: { ...SIN_PAIS, pais: 'Chile' }, onChange });

    expect(onChange).toHaveBeenCalledWith({ ...SIN_PAIS, pais: 'Chile', codigoPais: '+591' });
  });

  it('si ya hay país y prefijo, ni siquiera pregunta dónde está el teléfono', async () => {
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    await montar(PasoUbicacion, { data: INITIAL_FICHA_DATA.identidad, onChange });

    expect(mockDetectar).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('si no se sabe ni el país (null), no se rellena nada', async () => {
    mockDetectar.mockResolvedValue(null);
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    await montar(PasoUbicacion, { data: SIN_PAIS, onChange });

    expect(mockDetectar).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('la respuesta tarda: se completa sobre lo último que escribió la persona, sin borrarlo', async () => {
    let responder!: (lugar: unknown) => void;
    mockDetectar.mockReturnValue(new Promise(res => (responder = res)));
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    const r = await montar(PasoWhatsapp, { data: SIN_PAIS, onChange });
    // Mientras la IP responde, la persona escribe su número.
    const escrito = { ...SIN_PAIS, whatsapp: '+51 987654321' };
    await act(async () => {
      r.update(React.createElement(PasoWhatsapp, { data: escrito, onChange }));
    });
    await act(async () => {
      responder(BOLIVIA);
    });

    expect(onChange).toHaveBeenCalledWith({ ...escrito, pais: 'Bolivia', codigoPais: '+591' });
  });

  it('si el paso se cierra antes de que responda, no escribe nada', async () => {
    let responder!: (lugar: unknown) => void;
    mockDetectar.mockReturnValue(new Promise(res => (responder = res)));
    const onChange = jest.fn<(data: FichaIdentidadData) => void>();

    const r = await montar(PasoUbicacion, { data: SIN_PAIS, onChange });
    act(() => r.unmount());
    raiz = null;
    await act(async () => {
      responder(BOLIVIA);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('«¿Dónde vives?» no muestra una ubicación de ejemplo (#235)', () => {
  it('con la ficha recién abierta, el selector recibe departamento, ciudad y distrito vacíos', async () => {
    const r = await montar(PasoUbicacion, { data: INITIAL_FICHA_DATA.identidad, onChange: () => undefined });
    const [selector] = r.root.findAll(n => n.type === LocationCascadePicker);
    expect(selector.props.data).toEqual({ pais: 'Perú', departamento: '', ciudad: '', distrito: '', direccion: '' });
  });

  it('los datos de una ficha nueva no traen Lima, Lima Metropolitana ni Miraflores de fábrica', () => {
    expect(INITIAL_FICHA_DATA.identidad).toMatchObject({ departamento: '', ciudad: '', distrito: '' });
  });
});
