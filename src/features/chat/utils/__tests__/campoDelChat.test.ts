import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { propsDelCampoDelChat } from '../campoDelChat';

/**
 * La barra de escribir del chat en un renglón (revisión del 2026-10-05): en la web el `<textarea>` de
 * `react-native-web` salía con dos renglones y la barra medía ~72 px, con «Mensaje» arriba y los
 * íconos abajo. Contra el código anterior falla: el campo no pasaba `rows`.
 */
describe('el campo de escribir del chat', () => {
  it('en la web va en un renglón; en el teléfono no se toca (crece solo)', () => {
    expect(propsDelCampoDelChat('web')).toEqual({ rows: 1 });
    expect(propsDelCampoDelChat('android')).toEqual({});
    expect(propsDelCampoDelChat('ios')).toEqual({});
  });

  it('es lo que usa la barra de la conversación', () => {
    const texto = fs.readFileSync(path.resolve(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf-8');
    const campo = texto.slice(texto.indexOf('ref={campoDelChatRef}'));
    expect(campo.slice(0, campo.indexOf('/>'))).toMatch(/\{\.\.\.propsDelCampoDelChat\(\)\}/);
  });
});
