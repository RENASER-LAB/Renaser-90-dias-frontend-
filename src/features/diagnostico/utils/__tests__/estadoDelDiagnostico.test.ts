import { describe, expect, it } from '@jest/globals';

import type { EstadoDeMiDiagnostico } from '../../types/diagnostico.types';
import { diagnosticoPendiente, diagnosticoTerminado } from '../estadoDelDiagnostico';

const estado = (extra: Partial<EstadoDeMiDiagnostico>): EstadoDeMiDiagnostico => ({
  ficha: 'CON_DIAGNOSTICO',
  estado: 'PENDIENTE',
  version: null,
  completedAt: null,
  ...extra,
});

describe('diagnosticoPendiente: cuándo se le ofrece «Completa tu diagnóstico»', () => {
  it('con el diagnóstico asignado y sin terminar, pendiente o en curso', () => {
    expect(diagnosticoPendiente(estado({ estado: 'PENDIENTE' }))).toBe(true);
    expect(diagnosticoPendiente(estado({ estado: 'EN_CURSO', version: 3 }))).toBe(true);
  });

  it('terminado, con la ficha estándar o sin saber, no se ofrece nada', () => {
    expect(diagnosticoPendiente(estado({ estado: 'COMPLETADO', completedAt: '2026-11-02T15:04:00Z' }))).toBe(false);
    expect(diagnosticoPendiente(estado({ ficha: 'ESTANDAR', estado: 'NO_APLICA' }))).toBe(false);
    expect(diagnosticoPendiente(estado({ ficha: 'ESTANDAR', estado: 'PENDIENTE' }))).toBe(false);
    expect(diagnosticoPendiente(estado({ estado: 'NO_APLICA' }))).toBe(false);
    expect(diagnosticoPendiente(null)).toBe(false);
  });
});

describe('diagnosticoTerminado: cuándo se le ofrece «Mi diagnóstico»', () => {
  it('solo con el diagnóstico asignado y terminado', () => {
    expect(diagnosticoTerminado(estado({ estado: 'COMPLETADO', completedAt: '2026-11-02T15:04:00Z' }))).toBe(true);
    expect(diagnosticoTerminado(estado({ estado: 'EN_CURSO' }))).toBe(false);
    expect(diagnosticoTerminado(estado({ estado: 'PENDIENTE' }))).toBe(false);
    expect(diagnosticoTerminado(estado({ ficha: 'ESTANDAR', estado: 'NO_APLICA' }))).toBe(false);
    expect(diagnosticoTerminado(null)).toBe(false);
  });
});
