import type { IndicadoresApi, TipoObservacion } from '../api/liderMentoresSchemas';

/**
 * Las cifras de la gestión del Líder de Mentores dichas con palabras (SDD 002, plan §7: «frases antes
 * que cifras sueltas»). Puras, para probarlas sin montar pantallas.
 *
 * Reglas que valen para todas:
 * - Un bloque con `source: 'UNAVAILABLE'` se dice como «no se pudo leer», nunca como cero.
 * - Todo número va con su denominador o su período (RL-20).
 * - La app no recalcula nada: lo que no mandó el servidor no se deduce.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `2026-09` → `septiembre`; con `conAnio`, `septiembre de 2026`. Lo que no entiende, tal cual. */
export function nombreDelMes(mes: string, conAnio = false): string {
  const [anio, numero] = mes.split('-').map(Number);
  const nombre = MESES[(numero ?? 0) - 1];
  if (!nombre || !anio) return mes;
  return conAnio ? `${nombre} de ${anio}` : nombre;
}

/** El mes anterior/siguiente de `AAAA-MM`. */
export function mesVecino(mes: string, paso: -1 | 1): string {
  const [anio, numero] = mes.split('-').map(Number);
  const total = anio * 12 + (numero - 1) + paso;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`;
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

/** `0.5` → `30 min`, `4` → `4 h`, `52` → `2 días`. Para «suele responder en…». */
export function duracionEnPalabras(horas: number): string {
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${Number.isInteger(horas) ? horas : horas.toFixed(1)} h`;
  return plural(Math.round(horas / 24), 'día', 'días');
}

/** «Grupo Fénix · 8 aprendices», «2 grupos · 12 aprendices», «Sin grupo a cargo hoy». */
export function gruposEnPalabras(m: IndicadoresApi): string {
  const grupos = m.groups.items;
  if (m.groups.source !== 'OK' || !grupos) return 'No se pudieron leer sus grupos';
  if (grupos.length === 0) return 'Sin grupo a cargo hoy';
  const aprendices = m.traineeCount === null ? '' : ` · ${plural(m.traineeCount, 'aprendiz', 'aprendices')}`;
  const nombre = grupos.length === 1 ? grupos[0].name?.trim() || 'Su grupo' : plural(grupos.length, 'grupo', 'grupos');
  return `${nombre}${aprendices}`;
}

/** Lo que espera respuesta HOY. `null` cuando no se sabe (reporte de un mes cerrado). */
export function pendientesEnPalabras(m: IndicadoresApi): string | null {
  const a = m.attention;
  if (a.source !== 'OK') return 'Consultas: no se pudieron leer';
  if (a.open === null) return null;
  if (a.open === 0) return 'Sin consultas por responder';
  const antiguedad =
    a.oldestOpenDays === null ? '' : a.oldestOpenDays === 0 ? ' · la más antigua, de hoy'
      : ` · la más antigua, hace ${plural(a.oldestOpenDays, 'día', 'días')}`;
  return `${plural(a.open, 'consulta sin responder', 'consultas sin responder')}${antiguedad}`;
}

/** Lo que ÉL respondió en el mes, con su n y el tiempo típico (mediana). */
export function respuestasEnPalabras(m: IndicadoresApi, mes: string): string {
  const a = m.attention;
  if (a.source !== 'OK' || a.answered === null) return 'Respuestas: no se pudieron leer';
  const enElMes = `en ${nombreDelMes(mes)}`;
  if (a.answered === 0) return `Ninguna consulta respondida ${enElMes}`;
  const tiempo = a.medianResponseHours === null ? '' : ` · suele responder en ${duracionEnPalabras(a.medianResponseHours)}`;
  return `${plural(a.answered, 'respondida', 'respondidas')} ${enElMes}${tiempo}`;
}

/** «Evaluación de septiembre: 80 % (16 de 20 evidencias)» o por qué no hay número. */
export function evaluacionEnPalabras(m: IndicadoresApi, mes: string): string {
  const e = m.evaluation;
  const titulo = `Evaluación de ${nombreDelMes(e.month ?? mes)}`;
  if (e.source !== 'OK') return `${titulo}: no se pudo leer`;
  if (e.state === 'CALCULADA' && e.percentage !== null) {
    const denominador = e.expected ? ` (${e.delivered ?? 0} de ${plural(e.expected, 'evidencia', 'evidencias')})` : '';
    return `${titulo}: ${porcentajeEnPantalla(e.percentage)}${denominador}`;
  }
  if (e.state === 'SIN_MUESTRA') return `${titulo}: todavía nada que medir`;
  return `${titulo}: sin grupo en ese mes`;
}

/** El número por el que se ordena el reporte, ya en pantalla: redondeado SOLO acá (RL-23). */
export function porcentajeEnPantalla(valor: number): string {
  return `${Math.round(valor)} %`;
}

export const VERBO_DE_OBSERVACION: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Reconocer',
  SUGERENCIA: 'Sugerir',
  ALERTA: 'Alertar',
};

export const NOMBRE_DE_OBSERVACION: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Reconocimiento',
  SUGERENCIA: 'Sugerencia',
  ALERTA: 'Alerta',
};

/** «1 reconocimiento, 2 alertas» o «Nada este mes». */
export function observacionesEnPalabras(o: { source: string; recognitions: number | null; suggestions: number | null; alerts: number | null }): string {
  if (o.source !== 'OK') return 'Observaciones: no se pudieron leer';
  const partes = [
    o.recognitions ? plural(o.recognitions, 'reconocimiento', 'reconocimientos') : null,
    o.suggestions ? plural(o.suggestions, 'sugerencia', 'sugerencias') : null,
    o.alerts ? plural(o.alerts, 'alerta', 'alertas') : null,
  ].filter(Boolean);
  return partes.length === 0 ? 'No le dijiste nada este mes' : `Le dijiste: ${partes.join(', ')}`;
}

/** `2026-09-05T14:00:00Z` → `5 sep`. En la hora del teléfono. */
export function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}`;
}

/** «datos al 30 de septiembre, 22:00». */
export function corteEnPalabras(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  return `datos al ${fecha.getDate()} de ${MESES[fecha.getMonth()]}, ${hora}`;
}
