import type {
  AprendizDelSemaforo,
  ColorSemaforo,
  GrupoDelResumen,
  ResumenPorColor,
} from '../types/semaforo.types';
import { PALABRA_SIN_ACTIVIDAD, palabraDelSemaforo, rangoDeFechas, sumarDias } from './lecturaDelSemaforo';
import { viernesHasta } from './semanasDelSemaforo';
import { aAprendizDelSemaforo } from '../api/semaforoSchemas';

/**
 * Lo que el semáforo le dice a quien ACOMPAÑA (mentor) o SUPERVISA (administración): quién
 * necesita ayuda esta semana, en palabras simples (retroalimentación del 26/09, S-1, S-4, S-6 y A-2).
 *
 * Funciones puras: la regla "rojo o amarillo = necesita tu ayuda" se prueba sin montar pantallas, y
 * la tarjeta de Hoy, «Mi grupo» y Administración dicen lo mismo porque leen de acá.
 *
 * **Los colores, los umbrales y las palabras «Al día», «Requiere atención» y «Con problemas» no se
 * tocan** (decisión del dueño, 2026-09-26). Solo cambia cómo se nombra la falta de datos en las vistas
 * de quien acompaña: «Sin datos» no le dice nada a una persona de 60 años; «Todavía sin actividad
 * para medir» sí. La vista del propio aprendiz sigue como estaba.
 */

export { PALABRA_SIN_ACTIVIDAD };

/** La palabra de un estado para quien acompaña: la del servidor, salvo «Sin datos» (ver arriba). */
export function palabraParaQuienAcompana(color: ColorSemaforo, etiqueta?: string | null): string {
  return color === 'SIN_DATOS' ? PALABRA_SIN_ACTIVIDAD : palabraDelSemaforo(color, etiqueta);
}

/** Rojo o amarillo: la persona necesita que alguien le escriba esta semana. */
export function necesitaAyuda(color: ColorSemaforo): boolean {
  return color === 'ROJO' || color === 'AMARILLO';
}

/**
 * Cuántos necesitan ayuda según las cifras DEL SERVIDOR (rojo + amarillo). `null` si el servidor no
 * mandó el resumen: «no sé» no es «nadie».
 */
export function cuantosNecesitanAyuda(resumen: ResumenPorColor | null | undefined): number | null {
  if (!resumen) return null;
  return resumen.rojo + resumen.amarillo;
}

/** `1 necesita tu ayuda` · `3 necesitan tu ayuda`. */
export function textoNecesitanAyuda(cantidad: number): string {
  return cantidad === 1 ? '1 necesita tu ayuda' : `${cantidad} necesitan tu ayuda`;
}

/**
 * La línea de la tarjeta del mentor en Hoy cuando el semáforo respondió. Tres casos, y ninguno es
 * «sin avance registrado»:
 * - alguien en rojo o amarillo → cuántos necesitan ayuda;
 * - nadie, pero hay gente medida → nadie necesita ayuda;
 * - nadie medido todavía → cuántos son y que todavía no hay actividad para medir.
 */
export function lineaDeAyudaDelGrupo(resumen: ResumenPorColor): string {
  const ayuda = resumen.rojo + resumen.amarillo;
  if (ayuda > 0) return `${textoNecesitanAyuda(ayuda)} esta semana`;
  if (resumen.verde > 0) return 'Nadie necesita ayuda esta semana';
  const quienes = resumen.total === 1 ? '1 aprendiz' : `${resumen.total} aprendices`;
  return `${quienes} · ${PALABRA_SIN_ACTIVIDAD.toLowerCase()}`;
}

/**
 * La tabla del grupo partida en dos para «Mi grupo»: arriba quien necesita ayuda, abajo el resto.
 * Se conserva el orden del servidor dentro de cada parte (rojo antes que amarillo; por nombre).
 */
export function partirPorAyuda(aprendices: AprendizDelSemaforo[]): {
  necesitan: AprendizDelSemaforo[];
  resto: AprendizDelSemaforo[];
} {
  return {
    necesitan: aprendices.filter(a => necesitaAyuda(a.color)),
    resto: aprendices.filter(a => !necesitaAyuda(a.color)),
  };
}

// ------------------------------------------------------------------------------------------
// S-4: «¿A quién atiendo hoy?» en Administración
// ------------------------------------------------------------------------------------------

/** Los grupos del resumen que vale la pena abrir: los que tienen a alguien en rojo o amarillo. */
export function gruposConAyuda(grupos: GrupoDelResumen[]): GrupoDelResumen[] {
  return grupos.filter(g => (cuantosNecesitanAyuda(g.resumen) ?? 0) > 0);
}

/**
 * Una persona de la lista «¿A quién atiendo hoy?», con el grupo del que viene. `grupoId` es `null`
 * cuando no está en ningún grupo (lo sabe solo la lista del padrón, §4.6); `grupoNombre` es lo que se
 * lee en la fila.
 */
export interface PersonaParaAtender extends AprendizDelSemaforo {
  grupoId: string | null;
  grupoNombre: string | null;
}

/** Un grupo de la persona, tal como lo trae §4.6. */
export interface GrupoDeLaPersona {
  grupoId: string;
  grupoNombre?: string | null;
  recepcion?: boolean | null;
  mentorNombre?: string | null;
}

/**
 * Cómo se nombran los grupos de una persona en la fila: «Grupo Fénix», «Bienvenida», «Grupo Fénix ·
 * sin mentor», varios separados por «·», o «Sin grupo». Palabras, no identificadores.
 */
export function textoDeGrupos(grupos: GrupoDeLaPersona[]): string {
  if (grupos.length === 0) return 'Sin grupo';
  return grupos
    .map(g => {
      const nombre = g.grupoNombre?.trim() || (g.recepcion ? 'Bienvenida' : 'Grupo sin nombre');
      return !g.recepcion && !g.mentorNombre ? `${nombre} (sin mentor)` : nombre;
    })
    .join(' · ');
}

/**
 * La lista §4.6 en el formato de la pantalla. El servidor ya manda solo rojo y amarillo, en su orden;
 * igual se pasa por `aQuienAtenderHoy`, que es la regla de la lista: primero rojos, peor porcentaje
 * primero, una persona una sola vez. Así la pantalla dice lo mismo con cualquiera de las dos fuentes.
 */
export function aPersonasParaAtender(crudo: {
  aprendices?: Array<Parameters<typeof aAprendizDelSemaforo>[0] & { grupos?: GrupoDeLaPersona[] | null }> | null;
}): PersonaParaAtender[] {
  const personas = (crudo.aprendices ?? []).map(a => {
    const grupos = a.grupos ?? [];
    return {
      grupoId: grupos[0]?.grupoId ?? null,
      grupoNombre: textoDeGrupos(grupos),
      aprendices: [aAprendizDelSemaforo(a)],
    };
  });
  return aQuienAtenderHoy(personas);
}

const PRIORIDAD: Record<ColorSemaforo, number> = { ROJO: 0, AMARILLO: 1, SIN_DATOS: 2, VERDE: 3 };

/**
 * La lista final: solo rojo y amarillo, primero los rojos; dentro de cada color, el porcentaje más
 * bajo primero (quien peor va), y a igualdad, por nombre. Una persona que aparece en dos grupos
 * (bienvenida + estable) se muestra UNA vez: la primera que aparezca en ese orden.
 */
export function aQuienAtenderHoy(
  tablas: Array<{ grupoId: string | null; grupoNombre: string | null; aprendices: AprendizDelSemaforo[] }>,
): PersonaParaAtender[] {
  const todas: PersonaParaAtender[] = tablas.flatMap(tabla =>
    tabla.aprendices
      .filter(a => necesitaAyuda(a.color))
      .map(a => ({ ...a, grupoId: tabla.grupoId, grupoNombre: tabla.grupoNombre })),
  );
  todas.sort((a, b) => {
    if (PRIORIDAD[a.color] !== PRIORIDAD[b.color]) return PRIORIDAD[a.color] - PRIORIDAD[b.color];
    const pa = a.porcentaje ?? Number.POSITIVE_INFINITY;
    const pb = b.porcentaje ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
  });
  const vistos = new Set<string>();
  return todas.filter(p => {
    if (vistos.has(p.aprendizId)) return false;
    vistos.add(p.aprendizId);
    return true;
  });
}

// ------------------------------------------------------------------------------------------
// S-6: la nota fija del cierre semanal
// ------------------------------------------------------------------------------------------

/**
 * «La semana del sábado 19 al viernes 25 de septiembre ya cerró; lo que completes después no la
 * cambia.»
 *
 * La semana es la última cerrada que mandó el servidor (`semanas`, la más nueva al final). Si todavía
 * no mandó ninguna, se deduce del final de la ventana vigente (ayer, en la zona de la persona): el
 * viernes más reciente que no pasa de ahí. Nunca del reloj del teléfono. `null` si no hay de dónde.
 *
 * `quien`: `propia` le habla a la persona («completes»); `otra` es para el mentor o administración
 * mirando a alguien («complete»).
 */
export function notaDelCierreSemanal(
  ultimaCerrada: { desde: string; hasta: string } | null,
  hastaVigente: string | null,
  quien: 'propia' | 'otra',
): string | null {
  let semana = ultimaCerrada;
  if (!semana && hastaVigente) {
    const viernes = viernesHasta(hastaVigente);
    if (viernes) semana = { desde: sumarDias(viernes, -6), hasta: viernes };
  }
  if (!semana) return null;
  const verbo = quien === 'propia' ? 'completes' : 'complete';
  return `La semana ${rangoDeFechas(semana.desde, semana.hasta)} ya cerró; lo que ${verbo} después no la cambia.`;
}

