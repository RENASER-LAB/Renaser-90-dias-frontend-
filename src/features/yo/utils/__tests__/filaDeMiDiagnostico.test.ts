import { describe, expect, it } from '@jest/globals';

import type { EstadoDeMiDiagnostico } from '../../../diagnostico/types/diagnostico.types';
import { filaDeMiDiagnostico } from '../filaDeMiDiagnostico';

/**
 * La fila «Mi diagnóstico» de Yo (spec 026): visible solo con el diagnóstico en curso o completado (y «Completa tu diagnóstico»
 * si todavía no lo empezó); abre su lectura o el recorrido. Sin diagnóstico (ficha estándar), sin lectura o con un servidor
 * anterior no hay fila.
 */
const estado = (extra: Partial<EstadoDeMiDiagnostico>): EstadoDeMiDiagnostico => ({
  ficha: 'CON_DIAGNOSTICO', estado: 'COMPLETADO', version: 3, completedAt: null, ...extra,
});

describe('filaDeMiDiagnostico', () => {
  it('completado: «Mi diagnóstico» y abre su lectura', () => {
    expect(filaDeMiDiagnostico(estado({ estado: 'COMPLETADO' }))).toEqual({
      titulo: 'Mi diagnóstico', detalle: 'Lee lo que respondiste', pantalla: 'ver',
    });
  });

  it('en curso: «Mi diagnóstico» y abre el recorrido donde lo dejó', () => {
    expect(filaDeMiDiagnostico(estado({ estado: 'EN_CURSO' }))).toEqual({
      titulo: 'Mi diagnóstico', detalle: 'Sigue donde lo dejaste', pantalla: 'completar',
    });
  });

  it('pendiente: «Completa tu diagnóstico» y abre el recorrido', () => {
    expect(filaDeMiDiagnostico(estado({ estado: 'PENDIENTE' }))).toEqual({
      titulo: 'Completa tu diagnóstico', detalle: 'Todavía no lo empiezas', pantalla: 'completar',
    });
  });

  it('con la ficha estándar (`NO_APLICA`) no hay fila', () => {
    expect(filaDeMiDiagnostico(estado({ ficha: 'ESTANDAR', estado: 'NO_APLICA' }))).toBeNull();
    expect(filaDeMiDiagnostico(estado({ estado: 'NO_APLICA' }))).toBeNull();
  });

  it('una ficha estándar nunca ofrece el diagnóstico, diga lo que diga el estado', () => {
    for (const e of ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] as const) {
      expect(filaDeMiDiagnostico(estado({ ficha: 'ESTANDAR', estado: e }))).toBeNull();
    }
  });

  it('sin lectura (cargando, error, servidor anterior) no hay fila: no se ofrece lo que no consta', () => {
    expect(filaDeMiDiagnostico(null)).toBeNull();
    expect(filaDeMiDiagnostico(undefined)).toBeNull();
  });

  it('los textos van en tipo oración y en tuteo', () => {
    for (const e of ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] as const) {
      const fila = filaDeMiDiagnostico(estado({ estado: e }))!;
      for (const texto of [fila.titulo, fila.detalle]) {
        expect(texto).not.toBe(texto.toUpperCase());
        expect(texto).not.toMatch(/\b(completá|seguí|leé|empezás)\b/i);
      }
    }
  });
});
