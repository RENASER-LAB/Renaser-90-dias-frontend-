/**
 * Los pasos del teléfono para «Kilómetros diarios» (spec 037, D-310). Solo Health Connect (Android 14 o más): la app lee el
 * agregado del día, el servidor valida y cierra el hábito.
 */

/** Qué tipo de dispositivo midió: lo que la ficha del mentor dice («medido por el reloj / por el teléfono»). */
export type DispositivoDeLaLectura = 'TELEFONO' | 'RELOJ' | 'OTRO';

/** Una fuente de pasos que Health Connect conoce: el teléfono, un reloj o una app. */
export interface FuenteDeLosPasos {
  /** El paquete que escribió los registros (`dataOrigin`). Solo para comparar; no se manda al servidor. */
  paquete: string;
  /** Lo que lee la persona: «Tu teléfono», «Galaxy Watch», «Samsung Health»… */
  etiqueta: string;
  dispositivo: DispositivoDeLaLectura;
}

/** Un registro de pasos o de distancia tal como lo devuelve Health Connect, reducido a lo que se necesita para fiarse de él. */
export interface RegistroDeSalud {
  /** `metadata.dataOrigin`: el paquete que lo escribió. */
  origen: string;
  /** `metadata.recordingMethod`: 0 desconocido, 1 activo, 2 automático, 3 escrito a mano. `undefined` = no vino. */
  metodo?: number;
  /** `metadata.device.type`: 1 reloj, 2 teléfono, 4 anillo, 6 pulsera… */
  tipoDeDispositivo?: number;
  modelo?: string | null;
  fabricante?: string | null;
}

/** Lo que dice Health Connect del día, ya reducido: lo único que sale de `saludConectada`. */
export interface LecturaCrudaDelDia {
  /** `COUNT_TOTAL` del agregado de pasos hecho solo con los orígenes limpios; `null` si no hubo ninguno. */
  pasos: number | null;
  /** `DISTANCE` del agregado, en metros; `null` si ninguna fuente limpia dio distancia. */
  distanciaM: number | null;
  /** Orígenes que el agregado usó (`dataOrigins`) para pasos o distancia. */
  origenesUsados: string[];
  /** Todos los registros del día que se leyeron, para saber qué orígenes son limpios y cuáles no. */
  registros: RegistroDeSalud[];
}

/** La lectura de hoy ya interpretada: lo que se muestra y lo que se envía al servidor. */
export interface LecturaDelDia {
  pasos: number | null;
  distanciaM: number | null;
  /** Los km del día: la distancia agregada o, si no hay, los pasos por una zancada media. */
  km: number;
  /** `true` si los km salen de los pasos y no de una distancia medida. */
  aproximado: boolean;
  /** Las fuentes que cuentan. La primera es la principal (la que se manda como etiqueta). */
  fuentes: FuenteDeLosPasos[];
  /** Fuentes limpias que Health Connect NO sumó porque otra tiene prioridad («Tu teléfono · No se suma»). */
  noSumadas: FuenteDeLosPasos[];
  /** Había pasos escritos a mano u orígenes de método desconocido, y se descartaron. */
  hayManuales: boolean;
  leidoEn: Date;
}
