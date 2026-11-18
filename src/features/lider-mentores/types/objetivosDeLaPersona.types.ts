/**
 * Los objetivos de una persona vistos por el liderazgo (spec 056, contrato `api.md`, `GET /leadership/people/{p}/objetivos`). Solo
 * lectura: el líder no los cambia.
 */

/** Un objetivo del programa. `avance` es el porcentaje del camino recorrido (0 a 100); `null` si es solo cualitativo y no tiene cifra. */
export interface ObjetivoDelPrograma {
  id: string;
  titulo: string;
  avance: number | null;
}

/** El objetivo del mes en curso. */
export interface ObjetivoDelMesDeLaPersona {
  titulo: string;
  avance: number | null;
}

/** Los objetivos de la semana: cuántas acciones planificó y cuántas cumplió (nunca más cumplidas que planificadas). */
export interface ObjetivosDeLaSemanaDeLaPersona {
  titulo: string;
  planificadas: number;
  cumplidas: number;
}

export interface ObjetivosDeLaPersona {
  noventaDias: ObjetivoDelPrograma[];
  mes: ObjetivoDelMesDeLaPersona | null;
  semana: ObjetivosDeLaSemanaDeLaPersona | null;
}

/** Cómo una ficha pide los objetivos de su persona. Estable por persona (un `useMemo`); `null` = esa ficha no los tiene. */
export type CargarObjetivos = () => Promise<ObjetivosDeLaPersona>;
