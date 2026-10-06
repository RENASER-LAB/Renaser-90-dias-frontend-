/**
 * Decisión del dueño (2026-10-05): la vista de Mi onboarding se titula «Tu proceso». Con «Tu proceso
 * completo» al lado de «1 de 2 etapas completadas» se leía como «ya terminé». Contra el código
 * anterior falla.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const YO = fs.readFileSync(path.join(__dirname, '..', 'YoScreen.tsx'), 'utf-8');

describe('Mi onboarding: el título no promete que el proceso está terminado', () => {
  it('dice «Tu proceso» y no «Tu proceso completo» en pantalla', () => {
    expect(YO).toMatch(/>\s*Tu proceso\s*<\/Text>/);
    expect(YO).not.toMatch(/>\s*Tu proceso completo\s*<\/Text>/);
  });
});
