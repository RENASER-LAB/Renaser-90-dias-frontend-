import { formatoKm } from '../../habits/utils/registroConFoto';
import type { EntradaRankingDto, RankingAgregadoDto } from '../api/rankingApi';

/**
 * Las pestañas del ranking de Comunidad y cómo se lee el número de cada una.
 *
 * `kilometros` (D-226 del backend, decisión del dueño 2026-09-29): los km acumulados de cada aprendiz
 * activo desde su Día 1 (hábito KILÓMETROS DIARIOS). Ahí `puntaje` son km, no puntos.
 */
export type ClaveDeTabla = 'general' | 'coherencia' | 'kilometros';

export const TABLAS_DE_RANKING: ReadonlyArray<{ clave: ClaveDeTabla; titulo: string; explica: string }> = [
  { clave: 'general', titulo: 'General', explica: 'Hábitos, acciones y lecciones, todo junto' },
  { clave: 'coherencia', titulo: 'Coherencia', explica: 'Acciones diarias cumplidas de tu semana' },
  { clave: 'kilometros', titulo: 'Kilómetros', explica: 'Km recorridos desde tu Día 1' },
];

/**
 * Las filas de la pestaña. Un backend anterior a D-226 no manda `kilometros`: tabla vacía.
 *
 * En la de kilómetros no se muestra a quien todavía no registró ninguno: el servidor lo manda con 0
 * al fondo (como en las otras tablas), pero un podio de "0 km" no dice nada y le quita a la persona
 * la invitación a ser la primera. Se decide acá porque es cómo se muestra, no cómo se ordena.
 */
export function entradasDeLaTabla(datos: RankingAgregadoDto | null, clave: ClaveDeTabla): EntradaRankingDto[] {
  if (!datos) return [];
  if (clave === 'coherencia') return datos.coherenciaIndividual ?? [];
  if (clave === 'kilometros') return (datos.kilometros ?? []).filter(entrada => entrada.puntaje > 0);
  return datos.general ?? [];
}

/** "12,5 km" en la de kilómetros; "80 Pts" en las demás, como siempre. */
export function textoDelPuntaje(clave: ClaveDeTabla, puntaje: number): string {
  return clave === 'kilometros' ? `${formatoKm(puntaje)} km` : `${puntaje} Pts`;
}

/** La línea de "tu posición" debajo del nombre del grupo. */
export function textoDeMiPuntaje(clave: ClaveDeTabla, puntaje: number): string {
  return clave === 'kilometros' ? `${formatoKm(puntaje)} km recorridos` : `⚡ ${puntaje} Pts de Coherencia`;
}

/** El cuerpo de la invitación cuando nadie tiene posición todavía en esa pestaña. */
export function invitacionSinPosiciones(clave: ClaveDeTabla): string {
  return clave === 'kilometros'
    ? 'Todavía nadie registró kilómetros. Sube tu captura con los km de hoy y encabeza la tabla.'
    : 'Todavía nadie sumó puntos en este corte diario. Se cuentan solos con tus hábitos, tus rocas y tus lecciones: el primero que avance, encabeza.';
}

/** Quién mira el ranking: lo mínimo para encontrarse en una tabla. */
export interface QuienMira {
  id?: string | null;
  name?: string | null;
}

/**
 * La fila de quien mira, en la tabla que se está mirando, o `null` si no figura.
 *
 * Se busca SIEMPRE en las filas de la pestaña activa (`entradasDeLaTabla`): es la misma lista de la
 * que sale el podio, así que «Tu posición» y el podio no pueden hablar de tablas distintas. Por id y,
 * como respaldo (cuentas viejas cuyo id no coincidía), por nombre.
 *
 * Que no figure en «General» no es un error de la pantalla: el servidor solo ordena aprendices
 * activos con programa (`RankingPersistenceAdapter.aprendicesActivosConPuntaje`). Una cuenta de
 * mentor o de administración no aparece en ninguna tabla.
 */
export function miEntradaEnLaTabla(entradas: EntradaRankingDto[], quien: QuienMira): EntradaRankingDto | null {
  const nombre = quien.name?.toLowerCase();
  return (
    entradas.find(
      entrada =>
        (quien.id != null && entrada.participanteId === quien.id) ||
        (Boolean(nombre) && entrada.fullName.toLowerCase().includes(nombre as string))
    ) ?? null
  );
}
