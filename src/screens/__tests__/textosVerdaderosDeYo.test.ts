import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Textos verdaderos» (29/09): el Centro de Perfil y Ajustes de Yo prometía cosas que no existen
 * —«37 fotos subidas y verificadas por tu mentor» a cualquiera, «5 Etapas» cuando se ven 2, «3
 * fases» cuando se muestran 4, teléfono y contraseña que no se pueden editar—.
 *
 * Se lee el código sin los comentarios: el comentario que cuenta qué decía antes puede nombrar el
 * texto viejo; lo que no puede es volver a mostrarse.
 */
const YO = path.resolve(__dirname, '..', 'YoScreen.tsx');
const codigo = fs
  .readFileSync(YO, 'utf-8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('los textos del Centro de Perfil y Ajustes de Yo', () => {
  it.each([
    '37',
    'verificadas por tu mentor',
    '5 Etapas',
    '90 variables',
    '3 fases',
    'teléfono y contraseña',
    'Ubicación',
    'Medallas y trofeos',
    '12:45',
  ])('ya no muestra «%s»', viejo => {
    expect(codigo).not.toContain(viejo);
  });

  it('dice solo lo que se puede editar', () => {
    expect(codigo).toContain('>Nombre y foto<');
    expect(codigo).toContain('>Biografía y departamento<');
  });

  it('cuenta las etapas del onboarding y las fases del método de sus listas', () => {
    expect(codigo).toContain('`Mi Onboarding (${ONBOARDING_STAGES.length} etapas)`');
    expect(codigo).toContain('>El Pacto y tu Mapa de Renacimiento<');
    expect(codigo).toContain('`${METODO_FASES.length} fases para comprenderte y sostener tu transformación`');
    expect(codigo).toMatch(/ONBOARDING_STAGES = \[\s*\{ id: 'st1'[^\n]*\n\s*\{ id: 'st2'[^\n]*\n\] as const/);
  });

  it('la fila de evidencias sale de los datos reales', () => {
    expect(codigo).toMatch(/resumenDeEvidencias\(\{[\s\S]*?cantidad: evidencias\.length,[\s\S]*?hayMas: hayMasEvidencias/);
  });
});
