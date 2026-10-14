import type { FuncionalidadApagada } from '../api/funcionalidadesApi';

/**
 * Cómo se lee si una funcionalidad está prendida para esta sesión (spec 002). Funciones puras: las usan el almacén,
 * el hook y las pruebas.
 */

/** Clave → aviso (o `null`, sin aviso escrito). Solo están las apagadas. */
export type MapaDeApagadas = Readonly<Record<string, string | null>>;

export type EstadoDeUnaFuncionalidad = { prendida: boolean; aviso: string | null };

/**
 * Las claves que esta sesión todavía no tiene (fase 2: despliegue progresivo o rol personalizado). Como un conjunto,
 * en un objeto congelado para poder compararlo por referencia.
 */
export type MapaDeNoDisponibles = Readonly<Record<string, true>>;

/**
 * Lo que una pantalla pregunta de una funcionalidad: si está prendida (si no, el aviso de mantenimiento) y si le
 * corresponde a esta sesión (si no, la entrada **no se dibuja**: no es mantenimiento, es algo que no tiene).
 */
export type FuncionalidadDeLaSesion = EstadoDeUnaFuncionalidad & { disponible: boolean };

export const PRENDIDA: EstadoDeUnaFuncionalidad = Object.freeze({ prendida: true, aviso: null });

/** La clave y sus madres, de la más cercana a la raíz: `chat.grupos` → `['chat.grupos', 'chat']`. */
export function claveYSusMadres(clave: string): string[] {
  const partes = clave.split('.').filter(Boolean);
  const niveles: string[] = [];
  for (let i = partes.length; i > 0; i--) niveles.push(partes.slice(0, i).join('.'));
  return niveles;
}

/**
 * ¿Está prendida? El servidor ya manda las hijas de una madre apagada, pero se mira también hacia arriba: si llegara
 * solo `chat`, `chat.grupos` igual se ve apagada (más barato que dejar que la app muestre algo que el servidor
 * rechaza). Manda el nivel más cercano a la clave, con su aviso. Sin clave (una sección sin interruptor), prendida.
 */
export function evaluarFuncionalidad(apagadas: MapaDeApagadas, clave: string | null | undefined): EstadoDeUnaFuncionalidad {
  if (!clave) return PRENDIDA;
  for (const nivel of claveYSusMadres(clave)) {
    if (Object.prototype.hasOwnProperty.call(apagadas, nivel)) {
      return { prendida: false, aviso: apagadas[nivel] ?? null };
    }
  }
  return PRENDIDA;
}

/**
 * ¿Le corresponde a esta sesión? (fase 2, contrato `fase-2.md` §1 y §6). El servidor ya manda las hijas de una madre
 * no disponible, pero se mira también hacia arriba, como con lo apagado. Sin clave, o sin datos, disponible: el
 * servidor igual responde 404 a lo que no le toca.
 */
export function evaluarDisponibilidad(noDisponibles: MapaDeNoDisponibles, clave: string | null | undefined): boolean {
  if (!clave) return true;
  return !claveYSusMadres(clave).some(nivel => Object.prototype.hasOwnProperty.call(noDisponibles, nivel));
}

export function mapaDeNoDisponibles(claves: readonly string[] | null | undefined): MapaDeNoDisponibles {
  const mapa: Record<string, true> = {};
  for (const clave of claves ?? []) if (clave) mapa[clave] = true;
  return Object.freeze(mapa);
}

/** De la lista del servidor al mapa. Una clave repetida se queda con el primer aviso que no esté vacío. */
export function mapaDesdeLista(lista: readonly FuncionalidadApagada[]): MapaDeApagadas {
  const mapa: Record<string, string | null> = {};
  for (const { clave, aviso } of lista) {
    if (!clave) continue;
    if (!Object.prototype.hasOwnProperty.call(mapa, clave) || (mapa[clave] === null && aviso)) mapa[clave] = aviso;
  }
  return mapa;
}

export function listaDesdeMapa(mapa: MapaDeApagadas): FuncionalidadApagada[] {
  return Object.keys(mapa).map(clave => ({ clave, aviso: mapa[clave] ?? null }));
}
