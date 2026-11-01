import { TABLAS_DE_RANKING, type ClaveDeTabla } from './tablasDeRanking';

/**
 * Qué pestañas del ranking se ofrecen (spec 023, aplicada al ranking de la spec 024).
 *
 * «General» y «Coherencia» salen siempre. «Kilómetros» y «Gimnasio» miden un hábito concreto del catálogo (D-226 y D-266): solo tienen sentido
 * en una formación cuyo catálogo lo tiene. Cada formación tiene su propio catálogo, así que el Diplomado o la Certificación, que arrancan sin
 * esos hábitos, no muestran una tabla que nadie puede llenar.
 *
 * Regla de seguridad: solo se ESCONDE una pestaña cuando el catálogo se leyó bien y de verdad no la tiene. Sin catálogo (`null`: no se leyó, falló,
 * o llegó vacío porque la cuenta no hace su programa en esa formación) salen las cuatro, como antes de las formaciones.
 */
export const CLAVE_DE_SISTEMA_DE_LA_TABLA: Readonly<Partial<Record<ClaveDeTabla, string>>> = {
  kilometros: 'DAILY_KM',
  gimnasio: 'WORKOUT',
};

export function tablasQueSeOfrecen(clavesDelCatalogo: ReadonlyArray<string | null | undefined> | null): typeof TABLAS_DE_RANKING {
  if (!clavesDelCatalogo || clavesDelCatalogo.length === 0) return TABLAS_DE_RANKING;
  const tiene = new Set(clavesDelCatalogo.filter((clave): clave is string => typeof clave === 'string'));
  return TABLAS_DE_RANKING.filter(tabla => {
    const clave = CLAVE_DE_SISTEMA_DE_LA_TABLA[tabla.clave];
    return clave === undefined || tiene.has(clave);
  });
}
