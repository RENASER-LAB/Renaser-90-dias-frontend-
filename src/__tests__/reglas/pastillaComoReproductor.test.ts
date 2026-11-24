import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * La Pastilla Renacer es un reproductor de música para el sistema (issue #254, norma 2.5.4 de Apple).
 *
 * `app.json` declara audio en segundo plano (`expo-audio` con `enableBackgroundPlayback`, que pone `audio` en
 * `UIBackgroundModes`). Apple solo lo acepta si el audio de verdad sigue sonando con controles del sistema. Por eso, mientras
 * ese permiso esté declarado, `PastillaRenacerModal` tiene que: activar `setActiveForLockScreen` con metadatos
 * (título y artista), pedir `interruptionMode: 'doNotMix'` y llamar `clearLockScreenControls` al cerrar.
 *
 * Si falla: o se restauran esas llamadas en `src/features/spirit/components/PastillaRenacerModal.tsx`, o se quita el
 * audio en segundo plano de `app.json` (decisión del dueño del 2026-11-24 en docs/decisiones/transversal.md: se mantiene).
 */
const RAIZ = path.resolve(__dirname, '..', '..', '..');
const modal = fs.readFileSync(path.join(RAIZ, 'src/features/spirit/components/PastillaRenacerModal.tsx'), 'utf8');
const app = JSON.parse(fs.readFileSync(path.join(RAIZ, 'app.json'), 'utf8'));

function pluginAudio(): Record<string, unknown> | null {
  const plugins: unknown[] = app.expo?.plugins ?? [];
  const entrada = plugins.find(p => (Array.isArray(p) ? p[0] : p) === 'expo-audio');
  if (!entrada) return null;
  return (Array.isArray(entrada) ? (entrada[1] as Record<string, unknown>) : {}) ?? {};
}

describe('Pastilla Renacer como reproductor del sistema (#254)', () => {
  it('app.json declara el audio en segundo plano de forma explícita', () => {
    expect(pluginAudio()?.enableBackgroundPlayback).toBe(true);
  });

  it('si hay audio en segundo plano, la Pastilla activa los controles de la pantalla bloqueada con metadatos', () => {
    const declaraSegundoPlano = pluginAudio()?.enableBackgroundPlayback !== false;
    if (!declaraSegundoPlano) return;
    expect(modal).toMatch(/setActiveForLockScreen\(\s*true,\s*\{[^}]*title:[^}]*artist:/s);
    expect(modal).toMatch(/interruptionMode:\s*'doNotMix'/);
    expect(modal).toMatch(/shouldPlayInBackground:\s*true/);
  });

  it('al cerrar el modal o desmontar se limpian los controles', () => {
    expect(modal).toMatch(/if \(!visible\) player\.clearLockScreenControls\(\)/);
    expect(modal.match(/clearLockScreenControls\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('el artista sale de la formación de la persona, no de un «90 días» escrito', () => {
    expect(modal).toMatch(/formacion\?\.activa\?\.nombre/);
  });
});
