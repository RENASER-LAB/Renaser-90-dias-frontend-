/**
 * El componente del diseñador adaptado al repo: en el teléfono monta Rive y aplica el ánimo al estar listo; al
 * desmontarse apaga el Director (E-570: nada vivo al terminar la prueba).
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import React from 'react';
import { Image } from 'react-native';
import { act } from 'react-test-renderer';

import PhoenixMascot, { type PhoenixMascotHandle } from '../rive/PhoenixMascot';
import { crear, desmontarTodo, disparos, emitir, ultimaVistaRive, valoresDe, vistasRive } from './ayudasDePrueba';

afterEach(desmontarTodo);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(props: Partial<React.ComponentProps<typeof PhoenixMascot>> = {}) {
  const ref = React.createRef<PhoenixMascotHandle>();
  const raiz = crear(React.createElement(PhoenixMascot, { ref, size: 96, mood: 'triste', ...props }));
  return { raiz, ref };
}

describe('PhoenixMascot en el teléfono', () => {
  it('monta la vista Rive (no la imagen) y aparece ya en su ánimo al recibir PHOENIX_READY', () => {
    const { raiz } = montar();
    expect(raiz.root.findAll(n => n.type === Image)).toHaveLength(0);
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    expect(valoresDe(rive, 'mood')).toEqual([3]);
    act(() => raiz.unmount());
  });

  it('cambiar el ánimo después de listo lo manda al .riv como entero', () => {
    const { raiz } = montar({ mood: 'neutral' });
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    act(() => raiz.update(React.createElement(PhoenixMascot, { size: 96, mood: 'alegre' })));
    expect(valoresDe(rive, 'mood')).toContain(1);
    act(() => raiz.unmount());
  });

  it('celebrateShort pedida antes de estar listo queda en cola y dispara trgCelebrateShort al estar listo', async () => {
    const { raiz, ref } = montar();
    const rive = ultimaVistaRive();
    let terminada = false;
    act(() => {
      void ref.current!.celebrateShort().then(() => { terminada = true; });
    });
    expect(disparos(rive)).not.toContain('trgCelebrateShort');
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    expect(disparos(rive)).toContain('trgCelebrateShort');
    await act(async () => emitir(vistasRive(raiz)[0], 'PHOENIX_ACTION_COMPLETE'));
    expect(terminada).toBe(true);
    act(() => raiz.unmount());
  });

  it('si el .riv no carga, muestra la imagen del ánimo', () => {
    const { raiz } = montar({ mood: 'serio' });
    act(() => vistasRive(raiz)[0].props.onError({ message: 'roto', type: 'MalformedFile' }));
    const imagen = raiz.root.findAll(n => n.type === Image)[0];
    expect(imagen.props.source).toBe(require('../../../../assets/rive/phoenix_serio.png'));
    act(() => raiz.unmount());
  });

  // E-572: en Android el runtime avisa DataBindingError porque este .riv no trae ViewModel, y antes
  // cualquier error cambiaba el fénix vivo por la foto fija aunque el .riv se dibujaba bien.
  it('un aviso que no impide dibujar (enlace de datos) NO cambia el fénix por la imagen', () => {
    const { raiz } = montar({ mood: 'serio' });
    act(() => vistasRive(raiz)[0].props.onError({ message: 'sin ViewModel', type: 'DataBindingError' }));
    expect(vistasRive(raiz)).toHaveLength(1);
    expect(raiz.root.findAll(n => n.type === Image)).toHaveLength(0);
    act(() => raiz.unmount());
  });

  it('al desmontarse apaga el Director', () => {
    const { raiz, ref } = montar();
    const handle = ref.current!;
    expect(handle.director()).not.toBeNull();
    act(() => raiz.unmount());
    expect(handle.director()).toBeNull();
  });
});
