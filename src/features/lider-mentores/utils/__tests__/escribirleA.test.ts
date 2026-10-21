import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAbrir = jest.fn<(id: string) => Promise<{ id: string }>>();
const mockEnviar = jest.fn<(conversacionId: string, texto: string) => Promise<{ id: string }>>();
jest.mock('../../../chat/api/chatApi', () => ({
  abrirConversacionDirecta: (id: string) => mockAbrir(id),
  enviarMensajeTexto: (c: string, t: string) => mockEnviar(c, t),
}));
const mockIrAPestana = jest.fn<(nombre: string, params?: Record<string, unknown>) => boolean>();
jest.mock('../../../../navigation/navegacionRef', () => ({
  irAPestana: (n: string, p?: Record<string, unknown>) => mockIrAPestana(n, p),
}));
const mockAvisar = jest.fn<(titulo: string, mensaje?: string) => void>();
jest.mock('../../../admin/utils/dialogo', () => ({ avisar: (t: string, m?: string) => mockAvisar(t, m) }));

import { ApiError } from '../../../../services/http/apiClient';
import { escribirleA, escribirleAlMentor } from '../irAlChat';

/**
 * «Escribirle» a una persona desde la ficha del líder (spec 005, FR-015): abre o reutiliza el 1 a 1 y lleva a
 * Comunidad. No manda nada en su nombre; quien escribe es el líder.
 */

beforeEach(() => {
  mockAbrir.mockReset();
  mockEnviar.mockReset();
  mockIrAPestana.mockReset();
  mockAvisar.mockReset();
});

describe('escribirle a una persona', () => {
  it('abre el 1 a 1 y lleva a ese chat en Comunidad, sin enviar ningún mensaje', async () => {
    mockAbrir.mockResolvedValue({ id: 'c1' });
    mockIrAPestana.mockReturnValue(true);
    await escribirleA('u1', 'Ana Pérez');
    expect(mockAbrir).toHaveBeenCalledWith('u1');
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: 'c1' });
    expect(mockEnviar).not.toHaveBeenCalled();
    expect(mockAvisar).not.toHaveBeenCalled();
  });

  it('si el navegador todavía no está listo, dice dónde quedó el chat y que no se envió nada', async () => {
    mockAbrir.mockResolvedValue({ id: 'c1' });
    mockIrAPestana.mockReturnValue(false);
    await escribirleA('u1', 'Ana Pérez');
    expect(mockAvisar).toHaveBeenCalledWith('Conversación lista', 'Tu chat con Ana Pérez está en Comunidad. No se envió ningún mensaje.');
  });

  it('si el servidor no lo abre (cuentas activas, G-4), dice su respuesta en vez de quedarse quieto', async () => {
    mockAbrir.mockRejectedValue(new ApiError(403, 'Esa persona tiene la cuenta suspendida.'));
    await escribirleA('u1', 'Ana Pérez');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo abrir el chat', 'Esa persona tiene la cuenta suspendida.');
    expect(mockIrAPestana).not.toHaveBeenCalled();
  });

  it('sin red lo dice con el texto de siempre', async () => {
    mockAbrir.mockRejectedValue(new Error('boom'));
    await escribirleA('u1', 'Ana Pérez');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo abrir el chat', 'Revisa tu conexión e inténtalo de nuevo.');
  });

  it('la ficha del mentor sigue usando el mismo camino', () => {
    expect(escribirleAlMentor).toBe(escribirleA);
  });
});
