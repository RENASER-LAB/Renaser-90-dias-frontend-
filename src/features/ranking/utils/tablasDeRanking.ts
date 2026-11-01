import { formatoKm } from '../../habits/utils/registroConFoto';
import type { EntradaRankingDto, RankingAgregadoDto } from '../api/rankingApi';

/**
 * Las pestañas del ranking de Comunidad y cómo se lee el número de cada una.
 *
 * `kilometros` (D-226 del backend, decisión del dueño 2026-09-29): los km acumulados de cada aprendiz
 * activo desde su Día 1 (hábito KILÓMETROS DIARIOS). Ahí `puntaje` son km, no puntos.
 *
 * `gimnasio` (D-266 del backend, decisión del dueño 2026-10-13): los días que cada aprendiz activo fue al gimnasio
 * desde su Día 1 (hábito GIMNASIO, una foto por día). Ahí `puntaje` son días.
 */
export type ClaveDeTabla = 'general' | 'coherencia' | 'kilometros' | 'gimnasio';

/**
 * Las cuatro pestañas posibles. Cuáles se OFRECEN lo decide `tablasQueSeOfrecen` (spec 023): «Kilómetros» y «Gimnasio» solo salen si el catálogo de
 * hábitos de la formación de quien mira tiene KILÓMETROS DIARIOS o GIMNASIO. El servidor manda las cuatro tablas siempre (spec 024).
 */
export const TABLAS_DE_RANKING: ReadonlyArray<{ clave: ClaveDeTabla; titulo: string; explica: string }> = [
  { clave: 'general', titulo: 'General', explica: 'Hábitos, acciones y lecciones, todo junto' },
  { clave: 'coherencia', titulo: 'Coherencia', explica: 'Acciones diarias cumplidas de tu semana' },
  { clave: 'kilometros', titulo: 'Kilómetros', explica: 'Km recorridos desde tu Día 1' },
  { clave: 'gimnasio', titulo: 'Gimnasio', explica: 'Días de gimnasio desde tu Día 1' },
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
  // Mismo criterio que kilómetros: un podio de «0 días» no dice nada. Un backend anterior a D-266 no lo manda.
  if (clave === 'gimnasio') return (datos.gimnasio ?? []).filter(entrada => entrada.puntaje > 0);
  return datos.general ?? [];
}

/**
 * "12,5 km" en la de kilómetros; "80 pts" en las demás. La unidad en minúscula, como «km»
 * (2026-10-05): decía "80 Pts" y la pantalla le agregaba un ⚡ delante; ahora va la cifra sola.
 */
export function textoDelPuntaje(clave: ClaveDeTabla, puntaje: number): string {
  if (clave === 'kilometros') return `${formatoKm(puntaje)} km`;
  if (clave === 'gimnasio') return textoDeDias(puntaje);
  return `${puntaje} pts`;
}

/** «1 día», «12 días». */
function textoDeDias(dias: number): string {
  const n = Math.round(dias);
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

/** La línea de "tu posición" debajo del nombre del grupo. Sin el ⚡ de adelante desde el 2026-10-05. */
export function textoDeMiPuntaje(clave: ClaveDeTabla, puntaje: number): string {
  if (clave === 'kilometros') return `${formatoKm(puntaje)} km recorridos`;
  if (clave === 'gimnasio') return `${textoDeDias(puntaje)} de gimnasio`;
  return `${puntaje} pts de coherencia`;
}

/** El cuerpo de la invitación cuando nadie tiene posición todavía en esa pestaña. */
export function invitacionSinPosiciones(clave: ClaveDeTabla): string {
  if (clave === 'kilometros') {
    return 'Todavía nadie registró kilómetros. Sube tu captura con los km de hoy y encabeza la tabla.';
  }
  if (clave === 'gimnasio') {
    return 'Todavía nadie registró el gimnasio. Sube la foto de tu entrenamiento de hoy y encabeza la tabla.';
  }
  return 'Todavía nadie sumó puntos en este corte diario. Se cuentan solos con tus hábitos, tus rocas y tus lecciones: el primero que avance, encabeza.';
}

/** Quién mira el ranking: lo mínimo para encontrarse en una tabla. */
export interface QuienMira {
  id?: string | null;
}

/**
 * Si esta fila es de quien mira. **Solo por id** (#43, 2026-10-29): `participanteId` es el `UserId` de la cuenta
 * (`EntradaRankingResponse`, las cuatro tablas) y `id` es el de la sesión (`UserResponse.id`): el mismo texto.
 *
 * Antes, si el id no coincidía, se buscaba por nombre con `includes`: «Ana» o «Luis» entraban en «Ana María» o
 * «Luis Pérez», que podían estar MÁS ARRIBA en la tabla, y se marcaba a otra persona como «TÚ» con su posición.
 * Un nombre no identifica a nadie —dos aprendices pueden llamarse igual—, así que no se adivina: sin id de la
 * sesión, o en una fila sin id, no se marca a nadie.
 */
export function esMiEntrada(entrada: Pick<EntradaRankingDto, 'participanteId'>, quien: QuienMira): boolean {
  const miId = quien.id;
  return typeof miId === 'string' && miId !== '' && entrada.participanteId === miId;
}

/** El nombre de la fila en la pantalla: «TÚ (…)» solo en la de quien mira, el que manda el servidor en las demás. */
export function nombreEnElRanking(
  entrada: Pick<EntradaRankingDto, 'participanteId' | 'fullName'>,
  quien: QuienMira,
  nombreDeQuienMira: string,
): string {
  return esMiEntrada(entrada, quien) ? `TÚ (${nombreDeQuienMira})` : entrada.fullName;
}

/**
 * La fila de quien mira, en la tabla que se está mirando, o `null` si no figura.
 *
 * Se busca SIEMPRE en las filas de la pestaña activa (`entradasDeLaTabla`): es la misma lista de la
 * que sale el podio, así que «Tu posición» y el podio no pueden hablar de tablas distintas. Solo por id
 * ({@link esMiEntrada}): nunca por nombre.
 *
 * Que no figure en «General» no es un error de la pantalla: el servidor solo ordena aprendices
 * activos con programa (`RankingPersistenceAdapter.aprendicesActivosConPuntaje`). Una cuenta de
 * mentor o de administración no aparece en ninguna tabla.
 */
export function miEntradaEnLaTabla(entradas: EntradaRankingDto[], quien: QuienMira): EntradaRankingDto | null {
  return entradas.find(entrada => esMiEntrada(entrada, quien)) ?? null;
}
