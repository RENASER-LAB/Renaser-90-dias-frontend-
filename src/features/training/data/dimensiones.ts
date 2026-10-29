import type { DimensionDeTraining } from '../utils/dimensionDelHabito';

/**
 * Las cinco dimensiones de Training, con el nombre que se LEE y la línea que las describe.
 *
 * Vivían como constante dentro de `TrainingScreen`. Desde la spec 014 (Training por hora) las dimensiones
 * ya no se ven afuera: las dibuja «Tus prácticas» (el engranaje) y las lee también la fila de la lista del
 * día para decir de cuál es un hábito. El ícono de cada una NO está acá: sale de `ICONO_DE_LA_DIMENSION`
 * (`utils/iconoDeLaDimension`), la fuente única.
 */
export interface DimensionConfig {
  key: DimensionDeTraining;
  /** La clave en versales: la que entienden la hoja de Planificar y los recordatorios. */
  title: string;
  /** Lo que se LEE (2026-10-05): tipo oración, como el resto de la app. */
  nombre: string;
  sub: string;
}

export const DIMENSIONES_CONFIG: DimensionConfig[] = [
  { key: 'CUERPO', title: 'CUERPO', nombre: 'Cuerpo', sub: 'Fuerza somática · Movilidad · Energía' },
  { key: 'MENTE', title: 'MENTE', nombre: 'Mente', sub: 'Enfoque · Mentalidad · Aprendizaje' },
  { key: 'EMOCIONES', title: 'EMOCIONES', nombre: 'Emociones', sub: 'Gestión Emocional · Relaciones · Propósito' },
  { key: 'ESPÍRITU', title: 'ESPÍRITU', nombre: 'Espíritu', sub: 'Propósito · Fe · Gratitud' },
  { key: 'VIDA Y NEGOCIO', title: 'VIDA Y NEGOCIO', nombre: 'Vida y negocio', sub: 'Hábitos · Entorno · Estilo de Vida · Estrategia' },
];

/** El nombre legible de una dimensión; la clave tal cual si no se conoce. */
export function nombreDeLaDimension(clave: string): string {
  return DIMENSIONES_CONFIG.find(d => d.key === clave)?.nombre ?? clave;
}
