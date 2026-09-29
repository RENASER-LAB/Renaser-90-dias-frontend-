import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../sonidoDeMensaje', () => ({ sonarMensajeEnLaApp: jest.fn() }));

import { atenderAvisoDeChatEnPrimerPlano } from '../atenderAvisoDeChat';
import { marcarConversacionAbierta } from '../conversacionAbierta';
import { alLlegarMensajeDeOtroChat } from '../mensajesEnVivo';
import { sonarMensajeEnLaApp } from '../sonidoDeMensaje';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  marcarConversacionAbierta(null);
  (sonarMensajeEnLaApp as jest.Mock).mockClear();
});

describe('atenderAvisoDeChatEnPrimerPlano', () => {
  it('mensaje de otro chat: suena una vez y avisa para releer la lista', () => {
    const oyente = jest.fn();
    const soltar = alLlegarMensajeDeOtroChat(oyente);
    marcarConversacionAbierta(B);
    expect(atenderAvisoDeChatEnPrimerPlano({ route: `/chat/${A}` })).toBe('sonarEnLaApp');
    expect(sonarMensajeEnLaApp).toHaveBeenCalledTimes(1);
    expect(oyente).toHaveBeenCalledWith(A);
    soltar();
  });

  it('mensaje del chat abierto: no suena nada', () => {
    marcarConversacionAbierta(A);
    expect(atenderAvisoDeChatEnPrimerPlano({ route: `/chat/${A}` })).toBe('silencio');
    expect(sonarMensajeEnLaApp).not.toHaveBeenCalled();
  });

  it('un aviso que no es de chat no suena por acá', () => {
    expect(atenderAvisoDeChatEnPrimerPlano({ route: '/semaforo' })).toBe('noEsDeChat');
    expect(sonarMensajeEnLaApp).not.toHaveBeenCalled();
  });
});
