import type { RocaDiariaApi } from '../types/objetivos.types';

/** `/objetivos/{fecha}?eje={eje}`: la entiende `destinoDeRuta` y la abre `AbridorDeAvisos` (D-218). */
export function rutaDelAvisoDeAccion(roca: Pick<RocaDiariaApi, 'fecha' | 'eje'>): string {
  return `/objetivos/${roca.fecha}?eje=${roca.eje}`;
}
