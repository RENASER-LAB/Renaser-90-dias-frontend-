/**
 * E-411 (emulador, 28/09): la info del grupo mostraba iniciales («ME», «RE») en vez de la tarjeta con
 * el nombre de cada integrante, y el soporte y los grupos, la tarjeta sin nombre. El servidor mandaba la
 * ruta y la tarjeta respondía 200 con sesión, pero la app la pedía SIN `X-Auth-Token` (capturado con
 * tcpdump en el emulador) y recibía 403.
 *
 * Causa: `Image.android.js` de React Native solo pasa las cabeceras al componente nativo (la prop
 * `headers`, la única que lee `ReactImageManager`) cuando `source` es un ARREGLO. Con un objeto
 * `{ uri, headers }` las deja dentro del objeto y Android no las usa.
 *
 * La prueba dibuja el `Image` de Android de verdad y mira qué recibe el nativo. Contra el código anterior
 * falla: la fuente era un objeto y `headers` llegaba vacío.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://10.0.2.2:8080' } }));

import { fuenteNativaDeLaFoto } from '../fotoConSesion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RUTA = '/api/v1/chat/conversations/c-1/miembros/u-1/foto';

describe('la tarjeta con sesión en Android (E-411)', () => {
  it('el Image nativo recibe la cabecera de sesión', () => {
    // El `Image` de Android tal cual lo trae React Native, no el de iOS que usa jest por defecto.
    const ImageAndroid = (jest.requireActual('react-native/Libraries/Image/Image.android') as { default: React.ComponentType<{ source: unknown }> }).default;
    const fuente = fuenteNativaDeLaFoto(RUTA, 'sesion-1');

    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(ImageAndroid, { source: fuente }));
    });

    const nativo = raiz.root.findAll(n => typeof n.type === 'string' && n.props.source !== undefined)[0];
    expect(nativo.props.headers).toEqual({ 'X-Auth-Token': 'sesion-1' });
    expect(nativo.props.source[0].uri).toBe(`http://10.0.2.2:8080${RUTA}`);
  });

  it('sin sesión no hay nada que pedir', () => {
    expect(fuenteNativaDeLaFoto(RUTA, null)).toBeNull();
  });
});
