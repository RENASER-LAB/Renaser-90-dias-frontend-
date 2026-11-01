import type { IconName } from '../../../components/Icon';
import { dimensionesVigentes, dimensionPorClave } from '../../habits/categorias/estado/estadoDeCategorias';
import {
  ICONO_MIS_HABITOS,
  NOMBRE_MIS_HABITOS,
} from '../../habits/categorias/utils/dimensionesDeCategorias';
import { DIMENSION_MIS_HABITOS, DIMENSION_VIDA_Y_NEGOCIO, type DimensionDeTraining } from '../utils/dimensionDelHabito';

/**
 * Las dimensiones de Training, con el nombre que se LEE y la línea que las describe.
 *
 * Vivían como constante dentro de `TrainingScreen`. Desde la spec 014 (Training por hora) las dimensiones
 * ya no se ven afuera: las dibuja «Tus prácticas» (el engranaje) y las lee también la fila de la lista del
 * día para decir de cuál es un hábito. El ícono de cada una NO está acá: sale de `iconoDeLaDimension`
 * (`utils/iconoDeLaDimension`), la fuente única.
 *
 * **Spec 023:** las dimensiones de hábito son las categorías de la formación de la persona (`habits/categorias`); `VIDA Y NEGOCIO`
 * (las acciones de sus objetivos) se suma al final como siempre. `DIMENSIONES_CONFIG` queda como las de la Escuela: lo que vale antes
 * de saber otra cosa, y lo que leen las pruebas. Las pantallas piden `dimensionesDeTraining()`.
 */
export interface DimensionConfig {
  key: DimensionDeTraining;
  /** La clave en versales: la que entienden la hoja de Planificar y los recordatorios. */
  title: string;
  /** Lo que se LEE (2026-10-05): tipo oración, como el resto de la app. */
  nombre: string;
  sub: string;
  /** El ícono que mandó el servidor; las cinco de siempre lo toman de `iconoDeLaDimension`. */
  icono?: IconName;
}

const VIDA_Y_NEGOCIO: DimensionConfig = {
  key: DIMENSION_VIDA_Y_NEGOCIO,
  title: 'VIDA Y NEGOCIO',
  nombre: 'Vida y negocio',
  sub: 'Hábitos · Entorno · Estilo de Vida · Estrategia',
};

const MIS_HABITOS: DimensionConfig = {
  key: DIMENSION_MIS_HABITOS,
  title: 'MIS HÁBITOS',
  nombre: NOMBRE_MIS_HABITOS,
  sub: 'Los que creaste tú',
  icono: ICONO_MIS_HABITOS,
};

export const DIMENSIONES_CONFIG: DimensionConfig[] = [
  { key: 'CUERPO', title: 'CUERPO', nombre: 'Cuerpo', sub: 'Fuerza somática · Movilidad · Energía' },
  { key: 'MENTE', title: 'MENTE', nombre: 'Mente', sub: 'Enfoque · Mentalidad · Aprendizaje' },
  { key: 'EMOCIONES', title: 'EMOCIONES', nombre: 'Emociones', sub: 'Gestión Emocional · Relaciones · Propósito' },
  { key: 'ESPÍRITU', title: 'ESPÍRITU', nombre: 'Espíritu', sub: 'Propósito · Fe · Gratitud' },
  VIDA_Y_NEGOCIO,
];

/**
 * Las dimensiones de la formación vigente, en el orden de Administración, y `VIDA Y NEGOCIO` al final. «Mis hábitos» solo si
 * `conMisHabitos` (hay hábitos propios cuya categoría no es de esta formación): nunca vacía.
 */
export function dimensionesDeTraining(opciones: { conMisHabitos?: boolean } = {}): DimensionConfig[] {
  const deHabitos: DimensionConfig[] = dimensionesVigentes().map(d => ({
    key: d.key,
    title: d.title,
    nombre: d.nombre,
    sub: d.sub,
    icono: d.icono,
  }));
  return [...deHabitos, ...(opciones.conMisHabitos ? [MIS_HABITOS] : []), VIDA_Y_NEGOCIO];
}

/** El nombre legible de una dimensión; la clave tal cual si no se conoce. */
export function nombreDeLaDimension(clave: string): string {
  if (clave === DIMENSION_VIDA_Y_NEGOCIO) return VIDA_Y_NEGOCIO.nombre;
  if (clave === DIMENSION_MIS_HABITOS) return MIS_HABITOS.nombre;
  return dimensionPorClave(clave)?.nombre ?? DIMENSIONES_CONFIG.find(d => d.key === clave)?.nombre ?? clave;
}
