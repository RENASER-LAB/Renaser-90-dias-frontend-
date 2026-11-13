import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import { TEXTOS_DEL_WHATSAPP, detalleDelWhatsapp, mensajeDelError, numeroParaElServidor } from '../whatsappConfirmado';

/** Spec 051: la lógica pura de Yo → «WhatsApp», sin pantalla ni red. */
describe('Yo → WhatsApp: lo que se dice y lo que se manda', () => {
  // spec 051 FR-010
  it('la fila muestra el número confirmado enmascarado o «Agregar»', () => {
    expect(detalleDelWhatsapp('+51 9•• ••• •21')).toBe('+51 9•• ••• •21');
    expect(detalleDelWhatsapp(null)).toBe('Agregar');
  });

  // spec 051 FR-011
  it('el número parte en Perú y solo se manda con dígitos y forma internacional', () => {
    expect(numeroParaElServidor('+51 ')).toBeNull();
    expect(numeroParaElServidor('+51 98')).toBeNull();
    expect(numeroParaElServidor('+51 987654321')).toBe('+51987654321');
    expect(numeroParaElServidor('+1 (415) 555-2671')).toBe('+14155552671');
  });

  // spec 051 FR-012
  it('un fallo muestra el motivo del servidor (código incorrecto, número en uso, 429), no un «No se pudo» genérico', () => {
    expect(mensajeDelError(new ApiError(422, 'El código no es válido o ya venció. Pide uno nuevo.', { codigo: 'CODIGO_INCORRECTO' }))).toBe(
      'El código no es válido o ya venció. Pide uno nuevo.',
    );
    expect(mensajeDelError(new ApiError(409, 'Ese número de WhatsApp ya está en uso en otra cuenta.'))).toBe('Ese número de WhatsApp ya está en uso en otra cuenta.');
    expect(mensajeDelError(new Error('Network request failed'))).toBe(TEXTOS_DEL_WHATSAPP.sinConexion);
  });

  // spec 051 FR-011
  it('los textos van en español de Perú con tuteo, en tipo oración y sin emojis', () => {
    const todos = Object.values(TEXTOS_DEL_WHATSAPP).map(v => (typeof v === 'function' ? v('+51 9•• ••• •21') : v));
    for (const texto of todos) {
      expect(texto).not.toMatch(/\b(vos|querés|tenés|confirmá|escribí|enviá|revisá)\b/i);
      expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(texto[0]).toBe(texto[0].toUpperCase());
    }
    expect(TEXTOS_DEL_WHATSAPP.enviar).toBe('Enviar código');
  });
});
