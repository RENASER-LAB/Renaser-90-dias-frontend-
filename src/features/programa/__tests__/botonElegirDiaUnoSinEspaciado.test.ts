import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const BOTON = fs.readFileSync(path.resolve(__dirname, '../components/BotonElegirDiaUno.tsx'), 'utf8');
const GOLD = fs.readFileSync(path.resolve(__dirname, '../../../components/GoldButton.tsx'), 'utf8');
const TARJETA_HOY = fs.readFileSync(path.resolve(__dirname, '../../home/components/TarjetaAccionDeHoy.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issue #84): «Elegir mi Día 1» salía con las letras separadas («E l e g i r  m i  D í a  1»). `GoldButton` traía el
 * espaciado de los rótulos en versales (11 px, 2,2) y un texto en tipo oración no lleva espaciado (AGENTS.md §4). Se le pasa el mismo `textStyle` que
 * a «Empezar ahora ›» de Hoy. Todos los usos (Plan, Hoy, Training, Yo, el aviso de Mi Radar) pasan por `BotonElegirDiaUno`.
 */
describe('«Elegir mi Día 1» sin letras espaciadas', () => {
  it('el botón lleva el texto en 16 px y sin espaciado', () => {
    expect(BOTON).toMatch(/TEXTO_DEL_BOTON = \{ fontSize: 16, letterSpacing: 0 \} as const;/);
    expect(BOTON).toContain('<GoldButton label="Elegir mi Día 1" icon="calendar" onPress={selector.abrir} textStyle={TEXTO_DEL_BOTON} />');
  });

  it('es el mismo ajuste que los demás botones dorados en tipo oración del rediseño', () => {
    expect(TARJETA_HOY).toMatch(/textoDelBoton: \{ fontSize: 16, letterSpacing: 0 \}/);
    // Desde el 2026-11-02 el botón dorado trae él mismo el estilo nuevo (16 px, sin espaciado): el `textStyle` de arriba queda
    // como estaba y ya no corrige nada (botonesDoradosEnTipoOracion vigila el estilo por defecto).
    expect(GOLD).not.toMatch(/letterSpacing: 2\.2/);
    expect(GOLD).toMatch(/fontSize: 16,\s*letterSpacing: 0/);
  });

  it('ningún otro lugar arma su propio «Elegir mi Día 1» con un botón dorado a pelo', () => {
    const lugares = ['../components/EntradaAlProgramaPropio.tsx', '../components/InvitacionProgramaPropio.tsx', '../components/PlanSinPrograma.tsx'];
    for (const lugar of lugares) {
      const fuente = fs.readFileSync(path.resolve(__dirname, lugar), 'utf8');
      expect(fuente).not.toMatch(/<GoldButton[^>]*Elegir mi Día 1/);
    }
  });
});
