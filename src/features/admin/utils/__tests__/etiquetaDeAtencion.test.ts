import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { etiquetaDeLaFilaDeAtencion } from '../etiquetaDeAtencion';

/**
 * ADM-01 (e2e web del 27/09): en «¿A quién atiendo hoy?», el lector de pantalla leía «Grupo Grupo
 * Plan E2E» y «Grupo Sin grupo»: la etiqueta le anteponía «Grupo» a un nombre que ya lo dice.
 */
const fila = (grupoNombre: string | null, dias: string | null = '7 de 7 días con datos') => ({
  nombre: 'Api Aprendiz E2E',
  palabra: 'Con problemas',
  dias,
  grupoNombre,
});

describe('etiquetaDeLaFilaDeAtencion', () => {
  it('no repite «Grupo» cuando el nombre ya lo dice', () => {
    expect(etiquetaDeLaFilaDeAtencion(fila('Grupo Plan E2E'))).toBe(
      'Api Aprendiz E2E. Con problemas. 7 de 7 días con datos. Grupo Plan E2E. Abrir su ficha.'
    );
    expect(etiquetaDeLaFilaDeAtencion(fila('Grupo sin mentor E2E (sin mentor)'))).toBe(
      'Api Aprendiz E2E. Con problemas. 7 de 7 días con datos. Grupo sin mentor E2E (sin mentor). Abrir su ficha.'
    );
  });

  it('a quien no está en ningún grupo lo dice tal cual', () => {
    expect(etiquetaDeLaFilaDeAtencion(fila('Sin grupo'))).toBe(
      'Api Aprendiz E2E. Con problemas. 7 de 7 días con datos. Sin grupo. Abrir su ficha.'
    );
  });

  it('a un nombre que no lo dice le antepone «Grupo»', () => {
    expect(etiquetaDeLaFilaDeAtencion(fila('Recepción de bienvenida (prueba)'))).toBe(
      'Api Aprendiz E2E. Con problemas. 7 de 7 días con datos. Grupo Recepción de bienvenida (prueba). Abrir su ficha.'
    );
    expect(etiquetaDeLaFilaDeAtencion(fila('Fénix'))).toContain('. Grupo Fénix. ');
  });

  it('sin días ni grupo, sin espacios de más', () => {
    expect(etiquetaDeLaFilaDeAtencion(fila(null, null))).toBe('Api Aprendiz E2E. Con problemas. Abrir su ficha.');
  });
});

describe('AdminInicioScreen', () => {
  it('la fila de «¿A quién atiendo hoy?» usa esta etiqueta, sin armar otra', () => {
    const pantalla = fs.readFileSync(path.resolve(__dirname, '../../screens/AdminInicioScreen.tsx'), 'utf8');
    expect(pantalla.includes('accessibilityLabel={etiquetaDeLaFilaDeAtencion(')).toBe(true);
    expect(pantalla.includes('`Grupo ${p.grupoNombre}.`')).toBe(false);
  });
});
