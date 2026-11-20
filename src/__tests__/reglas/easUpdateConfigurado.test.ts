import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * La app está lista para EAS Update (actualizaciones por internet de lo que es solo código de la app).
 *
 * Tres cosas tienen que ir juntas, y si falta una el update o no llega o llega a un binario con otro código nativo:
 *   1. `updates.url` apunta al proyecto de EAS (el mismo `extra.eas.projectId` de la app publicada).
 *   2. `runtimeVersion.policy` es `fingerprint`: un update solo lo recibe un binario con el mismo código nativo.
 *   3. Cada perfil de `eas.json` que sale a teléfonos tiene su `channel` (el canal al que se publica con `eas update`).
 *
 * Si falla: restaura en `app.json` el bloque `"runtimeVersion": { "policy": "fingerprint" }` y `"updates"` con
 * `"url": "https://u.expo.dev/<projectId>"`, y en `eas.json` el `channel` de cada perfil (production → "production",
 * preview → "preview", development → "development"). Decisión: docs/decisiones/transversal.md (2026-11-19, EAS Update).
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const CANALES: Record<string, string> = { production: 'production', preview: 'preview', development: 'development' };

function configuracion(): { updates?: { url?: string; checkAutomatically?: string; fallbackToCacheTimeout?: number }; runtimeVersion?: unknown; extra?: { eas?: { projectId?: string } } } {
  const salida = execFileSync(path.join(RAIZ, 'node_modules', '.bin', 'expo'), ['config', '--type', 'public', '--json'], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(salida);
}

describe('EAS Update configurado', () => {
  const config = configuracion();
  const eas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'eas.json'), 'utf8')) as { build: Record<string, { channel?: string }> };

  it('updates.url apunta al proyecto de EAS de la app', () => {
    const id = config.extra?.eas?.projectId;
    expect(id).toBeTruthy();
    expect(config.updates?.url).toBe(`https://u.expo.dev/${id}`);
  });

  it('abre al toque con lo que tiene y aplica el update en la siguiente apertura', () => {
    expect(config.updates?.checkAutomatically).toBe('ON_LOAD');
    expect(config.updates?.fallbackToCacheTimeout).toBe(0);
  });

  it('runtimeVersion usa la política fingerprint', () => {
    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  it.each(Object.entries(CANALES))('el perfil «%s» de eas.json publica en el canal «%s»', (perfil, canal) => {
    expect(eas.build[perfil]?.channel).toBe(canal);
  });
});
