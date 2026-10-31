import { etiquetaDeAntelacion } from '../../habits/utils/etiquetaDeAntelacion';
import { resolverLaSemana, type PreferenciasDeAcciones } from './preferenciasPorDia';

/**
 * Lo que dice, en una línea, la fila «Recordatorios de tus acciones ›» de Plan (2026-10-31): el recordatorio diario y el aviso antes
 * de cada acción, tal como están guardados en este teléfono. Puro y sin React; lo prueba `resumenDelRecordatorio.test.ts`.
 *
 *   «Todos los días a las 08:00 · aviso 10 min antes»
 *   «Todos los días a las 08:00 · sin aviso antes de cada acción»
 *   «Sin recordatorio diario · avisos 30 y 10 min antes y a la hora»
 *   «Apagados en este teléfono»
 *
 * Cuando los días no coinciden no se enumeran (la hoja los explica con su fila de días): «Recordatorio diario según el día».
 */

/** Lo que dice la fila mientras no se leyó lo guardado, o si no se pudo leer. */
export const RESUMEN_DE_LOS_RECORDATORIOS_POR_OMISION = 'Recordatorio diario y aviso de cada acción';

/** `10` → «10 min», `0` → «a la hora»: la antelación sin su «antes», para juntarlas en una frase. */
function antelacionEnFrase(minutos: number): string {
  return minutos <= 0 ? 'a la hora' : etiquetaDeAntelacion(minutos).replace(/ antes$/, '');
}

/** «30 y 10 min antes y a la hora»; con una sola, «10 min antes» / «a la hora». */
function frasesDeLosAvisos(antelaciones: readonly number[]): string {
  const ordenadas = [...new Set(antelaciones)].sort((a, b) => b - a);
  const conTiempo = ordenadas.filter(m => m > 0).map(antelacionEnFrase);
  const aLaHora = ordenadas.includes(0);
  // «30 y 10 min» pierde la unidad repetida cuando todas son minutos: «30 y 10 min antes».
  const todasEnMinutos = ordenadas.filter(m => m > 0).every(m => m < 60);
  const tiempos = todasEnMinutos ? conTiempo.map(t => t.replace(/ min$/, '')) : conTiempo;
  const sufijo = todasEnMinutos ? ' min antes' : ' antes';
  const lista =
    tiempos.length === 0
      ? ''
      : tiempos.length === 1
        ? `${tiempos[0]}${sufijo}`
        : `${tiempos.slice(0, -1).join(', ')} y ${tiempos[tiempos.length - 1]}${sufijo}`;
  if (!lista) return 'a la hora';
  return aLaHora ? `${lista} y a la hora` : lista;
}

export function resumenDeLosRecordatorios(prefs: PreferenciasDeAcciones): string {
  const semana = resolverLaSemana(prefs);

  // El diario de cada día: «off» o su hora. Todos iguales → una frase; si no, «según el día».
  const diarios = new Set(semana.map(d => (d.diarioActivo ? d.horaDiaria : 'off')));
  const avisos = new Set(semana.map(d => [...new Set(d.antelaciones)].sort((a, b) => b - a).join(',')));

  const diarioApagado = diarios.size === 1 && diarios.has('off');
  const sinAvisos = avisos.size === 1 && avisos.has('');
  if (diarioApagado && sinAvisos) return 'Apagados en este teléfono';

  const diario =
    diarios.size > 1
      ? 'Recordatorio diario según el día'
      : diarioApagado
        ? 'Sin recordatorio diario'
        : `Todos los días a las ${[...diarios][0]}`;

  const aviso =
    avisos.size > 1
      ? 'avisos según el día'
      : sinAvisos
        ? 'sin aviso antes de cada acción'
        : `${new Set(semana[0].antelaciones).size > 1 ? 'avisos' : 'aviso'} ${frasesDeLosAvisos(semana[0].antelaciones)}`;

  return `${diario} · ${aviso}`;
}
