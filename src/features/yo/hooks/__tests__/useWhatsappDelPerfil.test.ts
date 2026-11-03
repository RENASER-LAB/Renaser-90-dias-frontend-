/**
 * El estado del WhatsApp de Editar perfil: lo lee de la ficha al abrir, no pisa lo que la persona ya escribió, no manda nada si no pudo leer y
 * guarda en la misma respuesta de la ficha.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLeer = jest.fn<() => Promise<string | null>>();
const mockGuardar = jest.fn<(numero: string) => Promise<void>>();
jest.mock('../../api/whatsappDelPerfilApi', () => ({
  leerWhatsappDelPerfil: () => mockLeer(),
  guardarWhatsappDelPerfil: (numero: string) => mockGuardar(numero),
}));

import { useWhatsappDelPerfil } from '../useWhatsappDelPerfil';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useWhatsappDelPerfil>;

async function montar(activo = true, cuenta = 'u-1') {
  function Sonda({ activo: a, cuenta: c }: { activo: boolean; cuenta: string }) {
    hook = useWhatsappDelPerfil(a, c);
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { activo, cuenta }));
  });
  return (nuevo: { activo?: boolean; cuenta?: string }) =>
    act(async () => {
      raiz!.update(React.createElement(Sonda, { activo: nuevo.activo ?? activo, cuenta: nuevo.cuenta ?? cuenta }));
    });
}

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset().mockResolvedValue('+51 987654321');
  mockGuardar.mockReset().mockResolvedValue(undefined);
});

describe('la lectura', () => {
  it('llega prellenado con el número de la ficha', async () => {
    await montar();
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(hook.lectura).toBe('listo');
    expect(hook.valor).toBe('+51 987654321');
  });

  it('sin número en la ficha, el campo arranca en Perú vacío', async () => {
    mockLeer.mockResolvedValue(null);
    await montar();
    expect(hook.lectura).toBe('listo');
    expect(hook.valor).toBe('+51 ');
  });

  it('con el número de otro país, ese país', async () => {
    mockLeer.mockResolvedValue('+591 71234567');
    await montar();
    expect(hook.valor).toBe('+591 71234567');
  });

  it('inactivo (Editar perfil cerrado) no pide nada', async () => {
    await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();
    expect(hook.lectura).toBe('pendiente');
  });

  it('abrir Editar perfil es lo que pide la lectura', async () => {
    const actualizar = await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();
    await actualizar({ activo: true });
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(hook.lectura).toBe('listo');
  });

  it('mientras llega, el estado es «cargando» (el campo no se dibuja)', async () => {
    let resolver!: (v: string | null) => void;
    mockLeer.mockReturnValue(new Promise(r => (resolver = r)));
    await montar();
    expect(hook.lectura).toBe('cargando');
    await act(async () => resolver('+51 900000000'));
    expect(hook.lectura).toBe('listo');
    expect(hook.valor).toBe('+51 900000000');
  });

  it('si falla, es «error» y se puede reintentar', async () => {
    mockLeer.mockRejectedValueOnce(new Error('sin red'));
    await montar();
    expect(hook.lectura).toBe('error');
    await act(async () => hook.reintentar());
    expect(hook.lectura).toBe('listo');
    expect(hook.valor).toBe('+51 987654321');
  });

  it('sin lectura no se manda nada al guardar: no se pisa un número que no se pudo ver', async () => {
    mockLeer.mockRejectedValue(new Error('sin red'));
    await montar();
    act(() => hook.cambiar('+51 911111111'));
    expect(hook.decidir()).toEqual({ tipo: 'sin-cambio' });
  });

  it('lo que la persona ya escribió no lo pisa una relectura', async () => {
    const actualizar = await montar();
    const versionAntes = hook.version;
    act(() => hook.cambiar('+51 911111111'));
    mockLeer.mockResolvedValue('+51 922222222');
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(hook.valor).toBe('+51 911111111');
    expect(hook.version).toBe(versionAntes);
  });

  it('una relectura sin cambios no vuelve a armar el campo', async () => {
    const actualizar = await montar();
    const versionAntes = hook.version;
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(hook.version).toBe(versionAntes);
  });

  it('una relectura que trae otro número, sin que la persona haya tocado nada, lo toma y arma el campo de nuevo', async () => {
    const actualizar = await montar();
    const versionAntes = hook.version;
    mockLeer.mockResolvedValue('+52 5512345678');
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(hook.valor).toBe('+52 5512345678');
    expect(hook.version).toBe(versionAntes + 1);
  });

  it('una lectura vieja no pisa a una nueva', async () => {
    let resolverVieja!: (v: string | null) => void;
    mockLeer.mockReturnValueOnce(new Promise(r => (resolverVieja = r)));
    const actualizar = await montar();
    mockLeer.mockResolvedValue('+51 933333333');
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(hook.valor).toBe('+51 933333333');
    await act(async () => resolverVieja('+51 900000000'));
    expect(hook.valor).toBe('+51 933333333');
  });

  it('otra cuenta: nada de la anterior queda a la vista', async () => {
    mockLeer.mockResolvedValueOnce('+51 987654321');
    const actualizar = await montar(true, 'u-1');
    expect(hook.valor).toBe('+51 987654321');
    mockLeer.mockResolvedValueOnce(null);
    await actualizar({ cuenta: 'u-2' });
    expect(hook.valor).toBe('+51 ');
  });
});

describe('guardar', () => {
  it('cambiarlo y guardar manda el número completo a la ficha', async () => {
    await montar();
    act(() => hook.cambiar('+51 912345678'));
    const decision = hook.decidir();
    expect(decision).toEqual({ tipo: 'guardar', valor: '+51 912345678' });
    if (decision.tipo !== 'guardar') throw new Error('debía guardar');
    await act(async () => hook.guardar(decision.valor));
    expect(mockGuardar).toHaveBeenCalledWith('+51 912345678');
    // Ya quedó guardado: tocar «Guardar cambios» otra vez no lo vuelve a mandar.
    expect(hook.decidir()).toEqual({ tipo: 'sin-cambio' });
  });

  it('si guardar falla, lanza y lo guardado sigue siendo lo anterior (se puede reintentar)', async () => {
    await montar();
    act(() => hook.cambiar('+51 912345678'));
    mockGuardar.mockRejectedValueOnce(new Error('503'));
    await expect(act(async () => hook.guardar('+51 912345678'))).rejects.toThrow('503');
    expect(hook.decidir()).toEqual({ tipo: 'guardar', valor: '+51 912345678' });
  });

  it('vaciarlo se rechaza y marcar el error lo deja a la vista hasta que la persona escribe', async () => {
    await montar();
    act(() => hook.cambiar('+51 '));
    expect(hook.decidir().tipo).toBe('rechazar');
    act(() => hook.marcarError('Por favor ingresa tu número de WhatsApp para contacto con tu mentor.'));
    expect(hook.error).toContain('WhatsApp');
    act(() => hook.cambiar('+51 9'));
    expect(hook.error).toBeNull();
  });
});
