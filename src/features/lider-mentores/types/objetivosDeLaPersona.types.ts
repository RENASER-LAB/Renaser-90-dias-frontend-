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

/** Lo que un eje se propone en el mes o en la semana (spec 057 FR-004): su frase, o lo que hay que lograr escrito con su unidad. */
export interface ObjetivoPorEje {
  eje: string;
  /** Ya armada para leerla: la frase de la persona, «Llegar a 12 km» o el motivo de que no haya cifra. */
  texto: string;
  /** Solo el del mes: si ya alcanzó la meta. */
  metaAlcanzada?: boolean;
}

/** El objetivo del mes en curso. */
export interface ObjetivoDelMesDeLaPersona {
  titulo: string;
  avance: number | null;
  /** Spec 057: el de cada eje. Opcional: el servidor del líder anterior no lo manda y se dibuja solo el título. */
  objetivos?: ObjetivoPorEje[];
}

/** Los objetivos de la semana: cuántas acciones planificó y cuántas cumplió (nunca más cumplidas que planificadas). */
export interface ObjetivosDeLaSemanaDeLaPersona {
  titulo: string;
  planificadas: number;
  cumplidas: number;
  /** Spec 057: el de cada eje. Opcional, como el del mes. */
  objetivos?: ObjetivoPorEje[];
}

/** La fase del programa en la que va la persona (spec 057 FR-001): «Fase 2 · días 8 a 34». */
export interface FaseDelPrograma {
  numero: number;
  primerDia: number;
  ultimoDia: number;
}

export interface ObjetivosDeLaPersona {
  /** Spec 057 FR-001: el plazo de la formación de la persona. Opcional: el servidor del líder y los viejos no lo mandan. */
  duracionDias?: number | null;
  /** Spec 057 FR-001: la fase en la que va. Opcional por lo mismo. */
  fase?: FaseDelPrograma | null;
  noventaDias: ObjetivoDelPrograma[];
  mes: ObjetivoDelMesDeLaPersona | null;
  semana: ObjetivosDeLaSemanaDeLaPersona | null;
}

/** Cómo una ficha pide los objetivos de su persona. Estable por persona (un `useMemo`); `null` = esa ficha no los tiene. */
export type CargarObjetivos = () => Promise<ObjetivosDeLaPersona>;
