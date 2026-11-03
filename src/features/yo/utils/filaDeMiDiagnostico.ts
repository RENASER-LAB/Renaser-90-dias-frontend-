import type { EstadoDeMiDiagnostico } from '../../diagnostico/types/diagnostico.types';

/**
 * La fila «Mi diagnóstico» de Yo (spec 026), con la misma forma que las demás filas de la lista (Tu Caja Renaser, Tuve una
 * emergencia, Mi Radar…). Qué dice y a qué pantalla lleva lo decide el estado que da el servidor
 * (`GET /api/v1/diagnostico/mio/estado`); sin pantalla ni React, para probarlo suelto.
 *
 * - `COMPLETADO` → «Mi diagnóstico»: abre su lectura (`MiDiagnosticoScreen`).
 * - `EN_CURSO` → «Mi diagnóstico»: abre el recorrido donde lo dejó (`CompletarDiagnosticoScreen`).
 * - `PENDIENTE` → «Completa tu diagnóstico»: abre el recorrido. (Hoy también lo ofrece, con su tarjeta; Yo no lo esconde para quien
 *   no la vio.)
 * - `NO_APLICA` (ficha estándar), sin lectura todavía, un servidor anterior (sin la ruta) o un error de red → no hay fila: nunca
 *   se ofrece un diagnóstico que no consta.
 */
export interface FilaDeMiDiagnostico {
  titulo: string;
  detalle: string;
  /** Qué pantalla abre: su lectura, o el recorrido (empezarlo o continuarlo). */
  pantalla: 'ver' | 'completar';
}

export function filaDeMiDiagnostico(estado: EstadoDeMiDiagnostico | null | undefined): FilaDeMiDiagnostico | null {
  if (!estado || estado.ficha !== 'CON_DIAGNOSTICO') return null;
  switch (estado.estado) {
    case 'COMPLETADO':
      return { titulo: 'Mi diagnóstico', detalle: 'Lee lo que respondiste', pantalla: 'ver' };
    case 'EN_CURSO':
      return { titulo: 'Mi diagnóstico', detalle: 'Sigue donde lo dejaste', pantalla: 'completar' };
    case 'PENDIENTE':
      return { titulo: 'Completa tu diagnóstico', detalle: 'Todavía no lo empiezas', pantalla: 'completar' };
    default:
      return null;
  }
}
