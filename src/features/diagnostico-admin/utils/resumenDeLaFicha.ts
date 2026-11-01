import type { BorradorDelDiagnostico, FichaDeIngreso, ResultadoDeAsignar } from '../types/diagnosticoAdmin.types';
import { cantidad } from './textos';

/** La línea de la lista «Fichas»: «29 preguntas · 6 secciones». */
export function resumenDeContenido(borrador: BorradorDelDiagnostico): string {
  const pasos = borrador.secciones.filter(s => !s.esPortada).length;
  const secciones = borrador.totales.secciones > 0 ? borrador.totales.secciones : pasos;
  return `${cantidad(borrador.totales.preguntas, 'pregunta', 'preguntas')} · ${cantidad(secciones, 'sección', 'secciones')}`;
}

/** «12 asignadas · 2 omitidas»; al volver a la ficha estándar, «cambiadas». */
export function textoDelLote(r: ResultadoDeAsignar, ficha: FichaDeIngreso): string {
  const verbo = ficha === 'CON_DIAGNOSTICO' ? ['asignada', 'asignadas'] : ['cambiada', 'cambiadas'];
  const partes = [`${r.asignadas} ${r.asignadas === 1 ? verbo[0] : verbo[1]}`];
  if (r.omitidas.length > 0) partes.push(`${r.omitidas.length} ${r.omitidas.length === 1 ? 'omitida' : 'omitidas'}`);
  return partes.join(' · ');
}

/** Lo que dice la ficha de una persona: «Con diagnóstico · en curso». */
export function textoDeLaFicha(ficha: FichaDeIngreso, estado: string): string {
  if (ficha === 'ESTANDAR') return 'Estándar';
  const detalle =
    estado === 'COMPLETADO' ? 'ya lo completó' : estado === 'EN_CURSO' ? 'lo está respondiendo' : estado === 'PENDIENTE' ? 'todavía no empieza' : null;
  return detalle ? `Con diagnóstico · ${detalle}` : 'Con diagnóstico';
}
