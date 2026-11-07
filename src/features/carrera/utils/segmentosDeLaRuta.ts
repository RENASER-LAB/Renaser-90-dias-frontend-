import type { PuntoDeRuta } from '../types/carrera.types';

export interface PuntoDelMapa {
  latitude: number;
  longitude: number;
}

/** Un punto de la ruta, con la marca opcional de que empieza un segmento nuevo. */
export type PuntoConCorte = { lat: number; lng: number; corte?: PuntoDeRuta['corte'] };

/**
 * Parte la ruta en segmentos continuos. Cada `corte` abre un segmento nuevo; si es 'hueco' (distancia estimada por pasos) se devuelve
 * además un conector entre el último punto de antes y el primero de después, para dibujarlo punteado y tenue. Con 'pausa' no hay conector:
 * unirlos cruzaría las casas. Un segmento de un solo punto no es una línea y se omite. Sin cortes (estado viejo) es un solo segmento.
 */
export function segmentosDeLaRuta(ruta: readonly PuntoConCorte[]): { segmentos: PuntoDelMapa[][]; conectores: PuntoDelMapa[][] } {
  const aMapa = (p: PuntoConCorte): PuntoDelMapa => ({ latitude: p.lat, longitude: p.lng });
  const todos: { puntos: PuntoDelMapa[]; conector: PuntoDelMapa[] | null }[] = [];
  let actual: PuntoDelMapa[] = [];
  let anterior: PuntoConCorte | null = null;
  let conectorPendiente: PuntoDelMapa[] | null = null;
  for (const p of ruta) {
    if (p.corte && actual.length > 0) {
      todos.push({ puntos: actual, conector: conectorPendiente });
      actual = [];
      conectorPendiente = p.corte === 'hueco' && anterior ? [aMapa(anterior), aMapa(p)] : null;
    }
    actual.push(aMapa(p));
    anterior = p;
  }
  if (actual.length > 0) todos.push({ puntos: actual, conector: conectorPendiente });
  const segmentos: PuntoDelMapa[][] = [];
  const conectores: PuntoDelMapa[][] = [];
  for (const s of todos) {
    if (s.puntos.length < 2) continue;
    segmentos.push(s.puntos);
    if (s.conector) conectores.push(s.conector);
  }
  return { segmentos, conectores };
}
