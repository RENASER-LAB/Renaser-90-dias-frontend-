import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { conversacionDelAviso, decidirAvisoDeChat, rutaDelMensajeDeChat } from '../avisoDeChat';
import { cerrarConversacionAbierta, conversacionAbierta, marcarConversacionAbierta } from '../conversacionAbierta';
import { alLlegarMensajeDeOtroChat, avisarMensajeDeOtroChat } from '../mensajesEnVivo';

/**
 * D-221 (2026-09-29): el aviso de un mensaje con la app abierta, «como WhatsApp». Del chat que se está
 * mirando no suena nada; de otro, un sonido corto dentro de la app y la lista se relee.
 */

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

beforeEach(() => marcarConversacionAbierta(null));

describe('conversacionDelAviso', () => {
  it('saca la conversación de la ruta del push', () => {
    expect(conversacionDelAviso({ route: `/chat/${A}` })).toBe(A);
  });

  it('otros avisos no son de chat', () => {
    expect(conversacionDelAviso({ route: '/habitos/h-1' })).toBeNull();
    expect(conversacionDelAviso({})).toBeNull();
    expect(conversacionDelAviso(null)).toBeNull();
    expect(conversacionDelAviso({ route: 42 })).toBeNull();
  });
});

describe('decidirAvisoDeChat', () => {
  it('del chat abierto: silencio', () => {
    expect(decidirAvisoDeChat({ route: `/chat/${A}` }, A)).toBe('silencio');
  });

  it('de otro chat, o sin ninguno abierto: suena en la app', () => {
    expect(decidirAvisoDeChat({ route: `/chat/${A}` }, B)).toBe('sonarEnLaApp');
    expect(decidirAvisoDeChat({ route: `/chat/${A}` }, null)).toBe('sonarEnLaApp');
  });

  it('un aviso que no es de chat sigue su camino de siempre', () => {
    expect(decidirAvisoDeChat({ route: '/caja' }, A)).toBe('noEsDeChat');
  });
});

describe('la conversación abierta', () => {
  it('cerrar una que ya no es la abierta no borra la nueva', () => {
    marcarConversacionAbierta(A);
    marcarConversacionAbierta(B);
    cerrarConversacionAbierta(A);
    expect(conversacionAbierta()).toBe(B);
    cerrarConversacionAbierta(B);
    expect(conversacionAbierta()).toBeNull();
  });
});

describe('el aviso interno de mensaje en otro chat', () => {
  it('llega a los oyentes, y uno que falla no corta a los demás', () => {
    const malo = jest.fn(() => {
      throw new Error('x');
    });
    const bueno = jest.fn();
    const soltarMalo = alLlegarMensajeDeOtroChat(malo);
    const soltarBueno = alLlegarMensajeDeOtroChat(bueno);
    avisarMensajeDeOtroChat(A);
    expect(bueno).toHaveBeenCalledWith(A);
    soltarMalo();
    soltarBueno();
    avisarMensajeDeOtroChat(B);
    expect(bueno).toHaveBeenCalledTimes(1);
  });
});

describe('el mensaje del service worker', () => {
  it('reconoce el de chat y descarta lo demás', () => {
    expect(rutaDelMensajeDeChat({ tipo: 'renaser-mensaje-chat', ruta: `/chat/${A}` })).toBe(`/chat/${A}`);
    expect(rutaDelMensajeDeChat({ tipo: 'renaser-abrir-aviso', ruta: '/caja' })).toBeNull();
    expect(rutaDelMensajeDeChat(null)).toBeNull();
  });
});
