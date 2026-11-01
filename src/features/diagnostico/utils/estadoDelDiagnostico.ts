import type { EstadoDeMiDiagnostico } from '../types/diagnostico.types';

/**
 * ¿Hay que ofrecerle «Completa tu diagnóstico» a la persona? (spec 026, FR-026-9). Solo si Administración le asignó el diagnóstico
 * (`ficha: CON_DIAGNOSTICO`) y todavía no lo terminó. La ficha estándar (`NO_APLICA`), un diagnóstico terminado, y no saber
 * (sin lectura: un backend anterior, sin red) no ofrecen nada: Hoy y Yo quedan como estaban.
 */
export function diagnosticoPendiente(estado: EstadoDeMiDiagnostico | null): boolean {
  if (!estado || estado.ficha !== 'CON_DIAGNOSTICO') return false;
  return estado.estado === 'PENDIENTE' || estado.estado === 'EN_CURSO';
}

/**
 * ¿La persona ya terminó su diagnóstico? Para ofrecerle «Mi diagnóstico» (la lectura propia, solo lectura) en Yo: solo quien lo
 * tiene y lo terminó. Sin lectura (un backend anterior, sin red) no se ofrece nada.
 */
export function diagnosticoTerminado(estado: EstadoDeMiDiagnostico | null): boolean {
  return !!estado && estado.ficha === 'CON_DIAGNOSTICO' && estado.estado === 'COMPLETADO';
}
