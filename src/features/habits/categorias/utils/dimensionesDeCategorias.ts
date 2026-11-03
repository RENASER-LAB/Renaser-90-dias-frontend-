import type { IconName } from '../../../../components/Icon';
import type { CategoriaDeHabito } from '../types/categorias.types';
import { iconoDeCategoria } from './iconosDeCategoria';

/**
 * De las categorías de una formación a las dimensiones de Training (spec 023). Todo son decisiones puras, sin red ni React.
 *
 * La clave de la dimensión de las cuatro de la Escuela se mantiene como siempre —`CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU`— porque
 * la hoja de Planificar, los avisos que ya viajan con `?dimension=` y las pruebas la conocen. En cualquier otra categoría la clave de
 * la dimensión es el `code` de la categoría (`DIPLOMADO_ESTUDIO`).
 */

/** Una dimensión de Training armada desde una categoría del servidor. */
export type DimensionDeCategoria = {
  /** La clave con la que Training se refiere a ella (ver arriba). */
  key: string;
  /** La clave en versales: la que entienden la hoja de Planificar y los recordatorios. */
  title: string;
  /** Lo que se LEE (el nombre que le puso Administración). */
  nombre: string;
  /** La línea que la describe (solo las cuatro de la Escuela la tienen). */
  sub: string;
  icono: IconName;
  /** El `code` de la categoría: lo que lleva el campo `category` de sus hábitos. */
  codigo: string;
};

/** Las claves de dimensión que la app ya usaba, por el `code` de la categoría de la Escuela. */
const CLAVE_DE_DIMENSION_POR_CODIGO: Readonly<Record<string, { clave: string; sub: string }>> = {
  BODY: { clave: 'CUERPO', sub: 'Fuerza somática · Movilidad · Energía' },
  MIND: { clave: 'MENTE', sub: 'Enfoque · Mentalidad · Aprendizaje' },
  CONSCIENCE: { clave: 'EMOCIONES', sub: 'Gestión Emocional · Relaciones · Propósito' },
  SPIRIT: { clave: 'ESPÍRITU', sub: 'Propósito · Fe · Gratitud' },
};

/** Los hábitos propios cuya categoría no existe en la formación vigente se agrupan aquí (FR-007). No es una categoría del servidor. */
export const DIMENSION_MIS_HABITOS = 'MIS_HABITOS';
export const NOMBRE_MIS_HABITOS = 'Mis hábitos';
export const ICONO_MIS_HABITOS: IconName = 'listChecks';

/**
 * Las cuatro categorías de la Escuela tal como las manda el servidor: el respaldo cuando `GET /habit-categories` no responde o no existe
 * (backend anterior). Así la Escuela se ve EXACTAMENTE igual que antes, en el mismo orden, con los mismos nombres e íconos.
 */
export const CATEGORIAS_DE_RESPALDO: readonly CategoriaDeHabito[] = [
  { key: 'CUERPO', code: 'BODY', name: 'Cuerpo', icon: 'activity', order: 1 },
  { key: 'MENTE', code: 'MIND', name: 'Mente', icon: 'brain', order: 2 },
  { key: 'CONSCIENCIA', code: 'CONSCIENCE', name: 'Emociones', icon: 'heart', order: 3 },
  { key: 'ESPIRITU', code: 'SPIRIT', name: 'Espíritu', icon: 'sparkles', order: 4 },
];

/** La clave de dimensión de una categoría (ver arriba). */
export function claveDeDimension(categoria: Pick<CategoriaDeHabito, 'code'>): string {
  return CLAVE_DE_DIMENSION_POR_CODIGO[categoria.code]?.clave ?? categoria.code;
}

/** Las dimensiones de una lista de categorías, en el orden en que llegaron. Dos con el mismo `code`: la primera manda. */
export function dimensionesDeCategorias(categorias: readonly CategoriaDeHabito[]): DimensionDeCategoria[] {
  const vistos = new Set<string>();
  const dimensiones: DimensionDeCategoria[] = [];
  for (const categoria of categorias) {
    if (vistos.has(categoria.code)) continue;
    vistos.add(categoria.code);
    const clave = claveDeDimension(categoria);
    dimensiones.push({
      key: clave,
      title: clave,
      nombre: categoria.name,
      sub: CLAVE_DE_DIMENSION_POR_CODIGO[categoria.code]?.sub ?? '',
      icono: iconoDeCategoria(categoria.icon),
      codigo: categoria.code,
    });
  }
  return dimensiones;
}
