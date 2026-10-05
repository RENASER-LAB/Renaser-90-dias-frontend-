/**
 * El Pacto ya firmado, en solo lectura (decisión 12 del dueño, 2026-10-05): «Firmado el <fecha>», sin
 * lienzo ni «Sellar mi compromiso».
 *
 * Con la firma dibujada arriba desde D-253 (`GET /api/v1/onboarding/pact/signature`, 2026-10-05). Antes
 * la firma no se mostraba porque el servidor no la devolvía; sin la URL (backend viejo, 404, sin red) o
 * si la imagen no carga, queda como antes.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

jest.mock('../../../onboarding/api/onboardingApi', () => ({
  obtenerFirmaDelPacto: jest.fn(),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { obtenerFirmaDelPacto } from '../../../onboarding/api/onboardingApi';
import { PactoFirmado } from '../PactoFirmado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pedirFirma = obtenerFirmaDelPacto as jest.MockedFunction<typeof obtenerFirmaDelPacto>;
const OBJETO = 'https://s3-renaser90dias.s3.us-east-1.amazonaws.com/onboarding/u-1/firma/f-1';
const firmada = (firma: string) => `${OBJETO}?X-Amz-Signature=${firma}`;

let raiz: ReactTestRenderer | null = null;

async function dibujar(firmadoEn: string | null): Promise<ReactTestRenderer> {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(PactoFirmado, { firmadoEn }));
  });
  return raiz!;
}

const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Text).map(n => String(n.props.children));
const firmas = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Image);
const rotulo = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.props.accessible === true && typeof n.props.accessibilityLabel === 'string')[0].props
    .accessibilityLabel;

beforeEach(() => {
  pedirFirma.mockReset();
  pedirFirma.mockRejectedValue(new ApiError(404, 'Todavía no hay una firma del Pacto guardada'));
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('el Pacto firmado', () => {
  it('dice cuándo se firmó', async () => {
    expect(textos(await dibujar('2026-09-29T17:10:00Z'))).toEqual([
      'Firmado el 29 de septiembre de 2026',
      'Tu firma quedó guardada en tu expediente.',
    ]);
  });

  it('sin fecha legible dice que está firmado, sin inventar el día', async () => {
    expect(textos(await dibujar(null))[0]).toBe('Pacto firmado');
  });

  it('con la URL del backend dibuja la firma arriba, con la dirección del objeto como clave de caché, y la fecha debajo', async () => {
    pedirFirma.mockResolvedValue({ url: firmada('aaa'), expiresAt: '2026-10-05T22:15:00Z' });

    const r = await dibujar('2026-09-29T17:10:00Z');

    expect(firmas(r)).toHaveLength(1);
    expect(firmas(r)[0].props.source).toEqual({ uri: firmada('aaa'), cacheKey: OBJETO });
    expect(firmas(r)[0].props.contentFit).toBe('contain');
    expect(textos(r)).toEqual(['Firmado el 29 de septiembre de 2026', 'Tu firma quedó guardada en tu expediente.']);
    expect(rotulo(r)).toBe(
      'Tu firma del Pacto. Firmado el 29 de septiembre de 2026. Tu firma quedó guardada en tu expediente.'
    );
  });

  it('sin firma guardada (404) o con un backend anterior a D-253 queda solo «Firmado el …», como antes', async () => {
    const r = await dibujar('2026-09-29T17:10:00Z');

    expect(pedirFirma).toHaveBeenCalledTimes(1);
    expect(firmas(r)).toHaveLength(0);
    expect(rotulo(r)).toBe('Firmado el 29 de septiembre de 2026. Tu firma quedó guardada en tu expediente.');
  });

  it('con el almacenamiento de marcador del entorno local (about:blank) no pinta una imagen rota', async () => {
    pedirFirma.mockResolvedValue({ url: 'about:blank#pendiente-s3/onboarding/u-1/firma/f-1', expiresAt: null });

    expect(firmas(await dibujar('2026-09-29T17:10:00Z'))).toHaveLength(0);
  });

  it('el papel toma la forma del PNG al cargar, sin franjas arriba y abajo', async () => {
    pedirFirma.mockResolvedValue({ url: firmada('aaa'), expiresAt: null });
    const r = await dibujar('2026-09-29T17:10:00Z');
    const proporcion = () => [firmas(r)[0].props.style].flat().reduce((a, e) => ({ ...a, ...e }), {}).aspectRatio;

    expect(proporcion()).toBe(5 / 2);
    act(() => firmas(r)[0].props.onLoad({ cacheType: 'none', source: { url: firmada('aaa'), width: 752, height: 290 } }));

    expect(proporcion()).toBeCloseTo(752 / 290);
  });

  it('si la imagen no carga, se saca y queda la fecha', async () => {
    pedirFirma.mockResolvedValue({ url: firmada('aaa'), expiresAt: null });
    const r = await dibujar('2026-09-29T17:10:00Z');

    act(() => firmas(r)[0].props.onError());

    expect(firmas(r)).toHaveLength(0);
    expect(textos(r)[0]).toBe('Firmado el 29 de septiembre de 2026');
  });
});
