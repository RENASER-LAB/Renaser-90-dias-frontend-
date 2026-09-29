import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../api/chatApi', () => ({ obtenerPresencia: jest.fn() }));

import { escuchaEnVivoCon } from '../useChatEnVivo';

/**
 * D-221 (2026-09-29): el servidor no manda el push de un chat a quien lo tiene suscripto por socket.
 * Si la app siguiera suscripta en segundo plano, con el teléfono bloqueado sobre un chat no llegaría
 * ningún aviso de ese chat. Por eso en segundo plano se deja de escuchar.
 */
describe('escuchaEnVivoCon', () => {
  it('en primer plano escucha', () => {
    expect(escuchaEnVivoCon('active')).toBe(true);
  });

  it('en segundo plano deja de escuchar', () => {
    expect(escuchaEnVivoCon('background')).toBe(false);
  });

  it('el «inactive» de iOS (centro de control encima) no cuenta como irse', () => {
    expect(escuchaEnVivoCon('inactive')).toBe(true);
  });
});
