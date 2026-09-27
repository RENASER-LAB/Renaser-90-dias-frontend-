import { describe, expect, it } from '@jest/globals';

import { OPCIONES_CON_PESTANAS, OPCIONES_SIN_PESTANAS, pestanasOcultas } from '../pestanasOcultas';
import { conversacionAPantallaCompleta } from '../../features/chat/utils/pantallaCompletaDelChat';

/**
 * Conversación a pantalla completa (2026-09-26): la barra de pestañas propia tiene que obedecer
 * `tabBarStyle: { display: 'none' }`, que antes ignoraba, y volver al cerrar la conversación.
 */
describe('pestanasOcultas', () => {
  it('se esconde con la opción que pone la conversación abierta', () => {
    expect(pestanasOcultas(OPCIONES_SIN_PESTANAS)).toBe(true);
  });

  it('vuelve con la opción que se pone al cerrarla, y sin opciones', () => {
    expect(pestanasOcultas(OPCIONES_CON_PESTANAS)).toBe(false);
    expect(pestanasOcultas(undefined)).toBe(false);
    expect(pestanasOcultas({})).toBe(false);
  });

  it('lee también un estilo en arreglo', () => {
    expect(pestanasOcultas({ tabBarStyle: [{ height: 60 }, { display: 'none' }] })).toBe(true);
    expect(pestanasOcultas({ tabBarStyle: [{ display: 'none' }, { display: 'flex' }] })).toBe(false);
  });
});

describe('conversacionAPantallaCompleta', () => {
  it('solo con una conversación abierta en Tribu', () => {
    expect(conversacionAPantallaCompleta({ enTribu: true, hayConversacionAbierta: true })).toBe(true);
    expect(conversacionAPantallaCompleta({ enTribu: true, hayConversacionAbierta: false })).toBe(false);
    expect(conversacionAPantallaCompleta({ enTribu: false, hayConversacionAbierta: true })).toBe(false);
  });
});
