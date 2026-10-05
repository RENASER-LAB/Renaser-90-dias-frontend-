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

describe('el botón de Ajustes de Yo (eran los «⋯»)', () => {
  it('abre el Centro de Perfil y Ajustes', () => {
    const texto = fs.readFileSync(YO, 'utf-8');
    const cabecera = texto.match(/<ScreenHeader\s+title="YO"[^\n]*\/>/);
    expect(cabecera).not.toBeNull();
    expect(cabecera![0]).toMatch(/onPressRight=\{\(\) => setActiveView\('hub'\)\}/);
  });

  /* Rediseño del 2026-10-05 (decisión 10 del dueño): los «⋯» de 38 px sin nombre pasaron a un
     engranaje con nombre, y es la ÚNICA entrada (la tarjeta del usuario abría lo mismo). Contra el
     código anterior falla: era `right="dots"` sin `etiquetaRight`, y la tarjeta tenía su `onPress`. */
  it('es un engranaje con nombre, y la única entrada a Ajustes desde Yo', () => {
    const texto = fs.readFileSync(YO, 'utf-8');
    const cabecera = texto.match(/<ScreenHeader\s+title="YO"[^\n]*\/>/)![0];
    expect(cabecera).toContain('right="settings"');
    expect(cabecera).toContain('etiquetaRight="Ajustes"');
    // Ninguna otra cosa de Yo abre Ajustes con un toque (guardar el perfil sí VUELVE ahí, sin toque propio).
    expect(texto).not.toMatch(/\bonPress=\{\(\) => setActiveView\('hub'\)\}/);
  });
});
