/**
 * Spec 060 (cumplimiento de tiendas), Apple 5.1.2(i) — patrón `APPLE-5.1.2-AI-NO-CONSENT-MODAL`: antes de que los datos de la
 * persona salgan hacia una IA de un tercero, la app muestra un aviso que nombra al proveedor y los datos, y pide aceptarlo.
 *
 * Contra el código anterior falla: el onboarding solo decía «Autorizo el uso responsable de mis datos…», el chat se abría sin
 * pedir nada y la voz empezaba al primer toque.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import {
  esConsentimientoVigente,
  TEXTO_CONSENTIMIENTO_DE_IA,
  TEXTO_DE_DATOS_EN_ONBOARDING,
  VERSION_DEL_CONSENTIMIENTO_DE_IA,
} from '../utils/consentimientoDeIa';

const RAIZ = path.resolve(__dirname, '../../..');
const leer = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

describe('consentimiento de la IA', () => {
  // spec 060 FR-003
  it('el aviso nombra al proveedor y dice qué datos viajan', () => {
    for (const texto of [TEXTO_CONSENTIMIENTO_DE_IA, TEXTO_DE_DATOS_EN_ONBOARDING]) {
      expect(texto).toMatch(/Google/);
      expect(texto).toMatch(/Gemini/);
      expect(texto).toMatch(/mensajes/i);
      expect(texto).toMatch(/voz/i);
      expect(texto).toMatch(/diagn[oó]stico/i);
    }
  });

  // spec 060 FR-004
  it('solo vale lo guardado de la versión vigente; todo lo demás cuenta como sin aceptar', () => {
    expect(esConsentimientoVigente(JSON.stringify({ version: VERSION_DEL_CONSENTIMIENTO_DE_IA }))).toBe(true);
    expect(esConsentimientoVigente(JSON.stringify({ version: VERSION_DEL_CONSENTIMIENTO_DE_IA + 1 }))).toBe(false);
    expect(esConsentimientoVigente(null)).toBe(false);
    expect(esConsentimientoVigente('basura')).toBe(false);
  });

  // spec 060 FR-001, SC-001
  it('el chat con el acompañante no muestra la conversación sin el consentimiento', () => {
    const panel = leer('features/renasia/screens/RenasiaPanel.tsx');
    expect(panel).toMatch(/useConsentimientoDeIa\(\)/);
    expect(panel).toMatch(/TarjetaDeConsentimientoDeIa/);
  });

  // spec 060 FR-002, SC-001
  it('la voz del orbe espera al consentimiento y el aviso de la voz se monta una vez en el lanzador', () => {
    const voz = leer('features/renasia/hooks/useVozDelOrbe.ts');
    expect(voz).toMatch(/pedirParaVoz\(/);
    expect(leer('features/renasia/components/RenasiaLauncher.tsx')).toMatch(/<HojaDeConsentimientoDeIa \/>/);
  });

  // spec 060 FR-005
  it('el onboarding muestra el texto que nombra al proveedor, no el genérico', () => {
    const capitulo = leer('features/onboarding/components/ChapterConsentimiento.tsx');
    expect(capitulo).toMatch(/TEXTO_DE_DATOS_EN_ONBOARDING/);
    expect(capitulo).not.toMatch(/Autorizo el uso responsable/);
  });

  // spec 060 FR-031
  it('marcar la casilla del onboarding guarda también la aceptación del aviso de IA, con la misma versión', () => {
    expect(leer('features/onboarding/components/ChapterConsentimiento.tsx')).toMatch(/onAceptaDatos\?\.\(\)/);
    expect(leer('features/onboarding/screens/FichaInicialScreen.tsx')).toMatch(/registrarAceptacionDeIa\(userId\)/);
    const estado = leer('features/renasia/state/consentimientoDeIa.ts');
    expect(estado).toMatch(/export function registrarAceptacionDeIa[\s\S]*guardarConsentimientoDeIa\(userId\)/);
    expect(leer('features/renasia/utils/almacenDelConsentimientoDeIa.ts')).toMatch(/VERSION_DEL_CONSENTIMIENTO_DE_IA/);
  });
});
