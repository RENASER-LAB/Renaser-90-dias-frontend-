import type { BorradorDelDiagnostico, QuienPublico, VersionPublicada } from '../types/diagnosticoAdmin.types';
import { cantidad, fechaConMesCorto } from './textos';

/**
 * Publicar (spec 026): lo que se edita es el BORRADOR; las personas ven solo lo publicado. Publicar crea la versión siguiente, y quien
 * ya empezó termina con la que tenía. Todo puro.
 */

export const CONFIRMACION_DE_PUBLICAR = 'Lo verán las personas que empiecen desde ahora. Quienes ya empezaron terminan con la versión que tenían.';
export const AVISO_OTRA_PERSONA_PUBLICO = 'Otra persona publicó cambios mientras editabas. Ya cargamos la versión vigente: revisa tus cambios y vuelve a publicar.';

function quien(p: QuienPublico | null): string {
  return p?.nombre?.trim() || 'alguien del equipo';
}

/** «Publicado el 31 oct por Ana · versión 3», o «Todavía sin publicar». */
export function textoDeLaPublicacion(publicada: VersionPublicada | null): string {
  if (!publicada) return 'Todavía sin publicar';
  const fecha = fechaConMesCorto(publicada.publicadaEn);
  const cuando = fecha ? `el ${fecha} ` : '';
  return `Publicado ${cuando}por ${quien(publicada.publicadaPor)} · versión ${publicada.version}`;
}

/** La versión publicada que la pantalla cargó: la «base» con la que se publica (0 si nunca se publicó). */
export function versionBaseDe(borrador: BorradorDelDiagnostico | null): number {
  return borrador?.publicada?.version ?? 0;
}

export interface EstadoDePublicar {
  habilitado: boolean;
  /** Por qué está apagado (o las advertencias), uno por renglón. */
  motivos: string[];
}

/** El botón «Publicar»: apagado con el motivo cuando el servidor dice que no se puede o no hay nada nuevo. */
export function estadoDePublicar(borrador: BorradorDelDiagnostico | null): EstadoDePublicar {
  if (!borrador) return { habilitado: false, motivos: [] };
  if (!borrador.puedePublicar.ok) {
    return { habilitado: false, motivos: borrador.puedePublicar.motivos.length > 0 ? borrador.puedePublicar.motivos : ['Todavía no se puede publicar.'] };
  }
  if (!borrador.hayCambiosSinPublicar && borrador.publicada) {
    return { habilitado: false, motivos: ['No hay cambios sin publicar.'] };
  }
  return { habilitado: true, motivos: [] };
}

/** La línea de cada versión del historial: «Versión 3 · 31 oct · Ana · 29 preguntas». */
export function lineaDeLaVersion(v: { version: number; publicadaEn: string | null; publicadaPor: QuienPublico | null; preguntas: number }): string {
  const partes = [`Versión ${v.version}`];
  const fecha = fechaConMesCorto(v.publicadaEn);
  if (fecha) partes.push(fecha);
  partes.push(quien(v.publicadaPor).replace(/^./, c => c.toUpperCase()));
  partes.push(cantidad(v.preguntas, 'pregunta', 'preguntas'));
  return partes.join(' · ');
}

/** ¿Otra persona publicó desde que se cargó el borrador? */
export function otraPersonaPublico(versionBase: number, borrador: BorradorDelDiagnostico | null): boolean {
  return !!borrador && (borrador.publicada?.version ?? 0) !== versionBase;
}
