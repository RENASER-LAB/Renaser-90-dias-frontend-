import { describe, expect, it } from '@jest/globals';
import { montajeDelRol, vistaTrasCrearRol } from '../utils/montajeDelRol';

describe('la pantalla de un rol recién creado no se vuelve a montar', () => {
  it('crear conserva la key del formulario vacío: el aviso «Rol … creado.» no se pierde', () => {
    const antes = montajeDelRol({ id: null });
    const despues = montajeDelRol(vistaTrasCrearRol('r-9'));
    expect(despues).toBe(antes);
  });

  it('abrir un rol existente o pasar de uno a otro sí cambia la key', () => {
    expect(montajeDelRol({ id: 'r-1' })).toBe('r-1');
    expect(montajeDelRol({ id: 'r-2' })).not.toBe(montajeDelRol({ id: 'r-1' }));
  });
});
