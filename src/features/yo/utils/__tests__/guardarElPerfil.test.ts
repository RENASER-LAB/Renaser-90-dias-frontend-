import { describe, expect, it, jest } from '@jest/globals';

import { guardarElPerfil } from '../guardarElPerfil';

describe('«Guardar cambios» de Editar perfil', () => {
  it('guarda el perfil y, con un número nuevo, lo manda a la ficha', async () => {
    const orden: string[] = [];
    const guardarPerfil = jest.fn(async () => void orden.push('perfil'));
    const guardarWhatsapp = jest.fn(async (n: string) => void orden.push(`whatsapp:${n}`));
    const r = await guardarElPerfil({ decision: { tipo: 'guardar', valor: '+51 912345678' }, guardarPerfil, guardarWhatsapp });
    expect(r).toBe('guardado');
    expect(orden).toEqual(['perfil', 'whatsapp:+51 912345678']);
  });

  it('sin cambio en el número no toca la ficha', async () => {
    const guardarWhatsapp = jest.fn(async () => undefined);
    const r = await guardarElPerfil({ decision: { tipo: 'sin-cambio' }, guardarPerfil: async () => undefined, guardarWhatsapp });
    expect(r).toBe('guardado');
    expect(guardarWhatsapp).not.toHaveBeenCalled();
  });

  it('si el perfil falla, sale el error y el número no se manda', async () => {
    const guardarWhatsapp = jest.fn(async () => undefined);
    await expect(
      guardarElPerfil({
        decision: { tipo: 'guardar', valor: '+51 912345678' },
        guardarPerfil: async () => {
          throw new Error('sin red');
        },
        guardarWhatsapp,
      }),
    ).rejects.toThrow('sin red');
    expect(guardarWhatsapp).not.toHaveBeenCalled();
  });

  it('si el número falla, el perfil ya quedó guardado y se avisa aparte', async () => {
    const guardarPerfil = jest.fn(async () => undefined);
    const r = await guardarElPerfil({
      decision: { tipo: 'guardar', valor: '+51 912345678' },
      guardarPerfil,
      guardarWhatsapp: async () => {
        throw new Error('503');
      },
    });
    expect(r).toBe('whatsapp-fallo');
    expect(guardarPerfil).toHaveBeenCalledTimes(1);
  });
});
