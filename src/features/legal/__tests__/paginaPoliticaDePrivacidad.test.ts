import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

import { CORREO_DE_CONTACTO } from '../enlacesLegales';

/**
 * La Política de Privacidad publicada (`public/privacidad/index.html`, D-245) con los datos del
 * responsable que dio el dueño (ficha RUC de SUNAT, 2026-10-06). Se lee el HTML real que sirve
 * Vercel, sin JavaScript, como lo lee Google Play.
 */

const RAIZ = path.join(__dirname, '../../../..');
const HTML = fs.readFileSync(path.join(RAIZ, 'public/privacidad/index.html'), 'utf8');
const doc = new JSDOM(HTML).window.document;
const texto = (doc.body.textContent ?? '').replace(/\s+/g, ' ');

describe('la Política de Privacidad publicada', () => {
  it('nombra al responsable con razón social, nombre comercial, RUC y domicilio fiscal', () => {
    expect(texto).toContain('RENASER CONSULTING S.A.C.');
    expect(texto).toContain('nombre comercial RENASER');
    expect(texto).toContain('RUC: 20615428419');
    expect(texto).toContain('Pj. Manuel Castillo N.º 205, Urb. Alto Selva Alegre');
    expect(texto).toContain('Alto Selva Alegre, Arequipa, Perú');
    expect(texto).toContain('Kelin Jadik Merma Llave, Gerente General');
  });

  it('da el correo de contacto en la sección del responsable, en derechos y en contacto', () => {
    expect(CORREO_DE_CONTACTO).toBe('renaserlab@gmail.com');
    for (const id of ['responsable', 'derechos', 'contacto']) {
      const seccion = [] as string[];
      for (let n = doc.getElementById(id)?.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) {
        seccion.push(n.innerHTML);
      }
      expect(seccion.join(' ')).toContain(`href="mailto:${CORREO_DE_CONTACTO}"`);
    }
  });

  it('no deja marcadores, pendientes ni datos de ejemplo', () => {
    expect(HTML).not.toMatch(/\[\[|\]\]|\[\.\.\.\]|\[…\]|marcador|p\. ej\./i);
    expect(HTML).not.toMatch(/\bTODO\b|PENDIENTE|XXX/);
  });

  it('no publica ningún DNI ni número de documento personal', () => {
    expect(texto).not.toMatch(/\bDNI\b/i);
    // El único número de 8 o más dígitos seguidos es el RUC de la empresa.
    expect(texto.match(/\d{8,}/g)).toEqual(['20615428419', '20615428419']);
  });

  it('nombra la ley y la autoridad peruanas sin inventar un número de registro', () => {
    expect(texto).toContain('Ley N.º 29733, Ley de Protección de Datos Personales del Perú');
    expect(texto).toContain('Autoridad Nacional de Protección de Datos Personales del Perú');
  });

  it('declara que el diagnóstico inicial completo llega al proveedor de IA y que la memoria no guarda dinero (spec 038)', () => {
    // SER lee el diagnóstico completo (decisión Q8-B del dueño, spec 026): ingresos, emociones y situación personal viajan al modelo.
    expect(texto).toContain('Tu diagnóstico inicial: si tu formación incluye un diagnóstico, el acompañante puede leer tus respuestas completas');
    expect(texto).toContain('también las que hablan de tu dinero, tus emociones o tu situación personal');
    expect(texto).toContain('esas respuestas se envían al proveedor de inteligencia artificial');
    expect(texto).toContain('no lee tus pagos ni tu cronograma de cuotas');
    expect(texto).toContain('sin dinero personal (ingresos, deudas, cuotas o pagos)');
    // La tabla de terceros lo repite donde se dice qué se le envía a Google.
    expect(texto).toContain('tu diagnóstico inicial completo');
    // No promete lo que ya no existe ni fija una duración: son tres formaciones.
    expect(texto).not.toContain('conociendo tus hábitos de hoy o tu Mapa');
    expect(texto).not.toContain('programa de 90 días: tus hábitos');
  });

  it('vercel.json la sirve antes del rewrite a la app', () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')) as { rewrites: { source: string; destination: string }[] };
    const i = vercel.rewrites.findIndex(r => r.source === '/privacidad');
    expect(vercel.rewrites[i].destination).toBe('/privacidad/index.html');
    expect(i).toBeLessThan(vercel.rewrites.findIndex(r => r.source === '/(.*)'));
  });
});

describe('la página /eliminar-cuenta', () => {
  it('da el correo de soporte para recuperar la cuenta', () => {
    const eliminar = fs.readFileSync(path.join(RAIZ, 'public/eliminar-cuenta/index.html'), 'utf8');
    const t = new JSDOM(eliminar).window.document.body.textContent ?? '';
    expect(t).toContain('puedes pedir a soporte que la recupere, escribiendo a renaserlab@gmail.com');
    expect(eliminar).toContain('href="mailto:renaserlab@gmail.com"');
  });

  // spec 040 FR-022
  it('declara a Google (Calendar y Meet) como proveedor del enlace de los eventos y qué datos le llegan (spec 040)', () => {
    expect(texto).toContain('Google (Calendar y Meet)');
    expect(texto).toContain('Crear la sala de videollamada de Google Meet de los eventos que usan el enlace automático');
    expect(texto).toContain('Solo el nombre del evento, el día, la hora y la duración');
    expect(texto).toContain('No enviamos tu nombre, tu correo ni quiénes van al evento');
  });
});
