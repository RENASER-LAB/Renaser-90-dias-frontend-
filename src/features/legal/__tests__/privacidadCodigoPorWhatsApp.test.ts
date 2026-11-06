import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

/** Spec 043: la Política de Privacidad dice que el WhatsApp se pide al solicitar acceso y que se usa también para mandar códigos de verificación. */

const HTML = fs.readFileSync(path.join(__dirname, '../../../..', 'public/privacidad/index.html'), 'utf8');
const texto = (new JSDOM(HTML).window.document.body.textContent ?? '').replace(/\s+/g, ' ');

describe('la Política de Privacidad y el código por WhatsApp (spec 043)', () => {
  // spec 043 FR-014
  it('dice que el WhatsApp se pide al solicitar acceso y que se usa para mandar el código de verificación', () => {
    expect(texto).toContain('El WhatsApp te lo podemos pedir desde que solicitas acceso');
    expect(texto).toContain('Enviarte por WhatsApp tu código de verificación');
    expect(texto).toContain('solo al WhatsApp que tu cuenta ya tiene guardado');
    expect(texto).toContain('para un código, solo tu número y el código); no enviamos nada más');
  });
});
