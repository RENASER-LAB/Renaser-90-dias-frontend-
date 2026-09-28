import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E-400 (emulador, 28/09): el «⋯» de la cabecera de Yo no hacía nada al tocarlo. `ScreenHeader`
 * dibuja el ícono dentro de un `Pressable` cuyo `onPress` es `onPressRight`, y Yo nunca lo pasaba.
 *
 * La prueba lee el código de Yo y falla si la cabecera vuelve a quedar sin acción, o si la acción
 * deja de llevar al Centro de Perfil y Ajustes (`hub`), que es donde están Notificaciones y Alarmas.
 */
const YO = path.resolve(__dirname, '..', 'YoScreen.tsx');

describe('el menú «⋯» de Yo', () => {
  it('abre el Centro de Perfil y Ajustes', () => {
    const texto = fs.readFileSync(YO, 'utf-8');
    const cabecera = texto.match(/<ScreenHeader\s+title="YO"[^\n]*\/>/);
    expect(cabecera).not.toBeNull();
    expect(cabecera![0]).toMatch(/onPressRight=\{\(\) => setActiveView\('hub'\)\}/);
  });
});
