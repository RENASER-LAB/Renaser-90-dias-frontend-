/**
 * Formas EXACTAS que devuelve el backend Java para las Rocas Maestras — el objetivo de 90 días
 * (`rocks/infrastructure/adapter/in/rest/rocamaestra` en el repo Spring).
 *
 * Separadas de los tipos de la pantalla, igual que en `features/community`: el cable habla en
 * inglés y en enums (`CUERPO`/`TRABAJO`/`RELACIONES`), y la UI habla el vocabulario del diseño.
 */

/** Los tres ejes del programa. El backend los valida como enum: mandar otro da 400. */
export type EjeObjetivo = 'CUERPO' | 'TRABAJO' | 'RELACIONES';

export const EJES: EjeObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];

/** Cómo se llama cada eje en la pantalla. El backend no manda etiquetas, solo el enum. */
export const ETIQUETA_EJE: Record<EjeObjetivo, string> = {
  CUERPO: 'Cuerpo',
  TRABAJO: 'Negocio y dinero',
  RELACIONES: 'Relaciones',
};

/**
 * `RocaMaestraResponse` del backend.
 *
 * `meta`, `avance`, `unidad` y `porcentaje` vienen en `null` cuando el objetivo es puramente
 * cualitativo ("recuperar la confianza con mi hijo"): esa persona no tiene barra de avance que
 * dibujar, y eso es válido. Los cuatro van juntos o ninguno.
 *
 * `porcentaje` llega ya calculado a propósito: es una regla de negocio (incluido el tope de 100
 * al superar la meta) y si cada pantalla lo recalculara, dos vistas mostrarían números distintos
 * para el mismo dato.
 */
export interface RocaMaestraApi {
  id: string;
  eje: EjeObjetivo;
  objetivo: string;
  meta: number | null;
  avance: number | null;
  unidad: string | null;
  porcentaje: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** Cuerpo de `PUT /api/v1/rocks/master/{eje}`. Sin `eje` ni dueño: van en la ruta y en la sesión. */
export interface DefinicionRocaMaestra {
  objetivo: string;
  /** Los tres juntos o los tres ausentes. El backend rechaza media meta con un 400. */
  meta?: number;
  avance?: number;
  unidad?: string;
}
