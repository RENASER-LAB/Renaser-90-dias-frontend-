/**
 * En la web no hay Rive (`vistaRive.tsx` no exporta vista): el fénix es la imagen fija del ánimo, sin Director.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Image } from 'react-native';
import { act } from 'react-test-renderer';

jest.mock('../rive/vistaRive', () => jest.requireActual('../rive/vistaRive.tsx'));

import PhoenixMascot, { PHOENIX_STATIC_IMAGES, type PhoenixMascotHandle } from '../rive/PhoenixMascot';
import { VistaRiveDelFenix } from '../rive/vistaRive';
import type { PhoenixMood } from '../rive/phoenixMaster';
import { crear, desmontarTodo } from './ayudasDePrueba';

afterEach(desmontarTodo);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('el fénix en la web', () => {
  it('la vista Rive de la web no existe', () => {
    expect(VistaRiveDelFenix).toBeNull();
  });

  it.each([
    ['alegre', PHOENIX_STATIC_IMAGES.alegre],
    ['serio', PHOENIX_STATIC_IMAGES.serio],
    ['triste', PHOENIX_STATIC_IMAGES.triste],
    ['neutral', PHOENIX_STATIC_IMAGES.neutral],
  ] as Array<[PhoenixMood, unknown]>)('%s: la imagen fija de ese ánimo, sin Rive ni Director', async (animo, imagen) => {
    const ref = React.createRef<PhoenixMascotHandle>();
    const raiz = crear(React.createElement(PhoenixMascot, { ref, size: 96, mood: animo }));
    expect(raiz.root.findAll(n => n.type === Image)[0].props.source).toBe(imagen);
    expect(raiz.root.findAll(n => n.props.testID === 'rive-del-fenix')).toHaveLength(0);
    expect(ref.current!.director()).toBeNull();
    await expect(ref.current!.celebrateShort()).resolves.toBeUndefined();
    act(() => raiz.unmount());
  });
});
