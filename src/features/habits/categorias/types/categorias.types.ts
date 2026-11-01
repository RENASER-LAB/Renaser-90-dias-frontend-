/**
 * Las categorías de hábito (las dimensiones de Training) de cada formación (spec 023 del backend). Espejan lo que manda el servidor;
 * la app NO decide cuáles tiene una formación, solo las dibuja.
 */

/**
 * Una categoría activa de la formación de la persona.
 * - `key`: la clave de la base (`CUERPO`, `MENTE`, `CONSCIENCIA`, `ESPIRITU` en la Escuela; `DIPLOMADO_ESTUDIO`… en las otras).
 * - `code`: lo que lleva el campo `category` de cada hábito (`BODY`, `MIND`, `CONSCIENCE`, `SPIRIT` en las cuatro de la Escuela;
 *   la clave tal cual en las demás). Un hábito se une con su categoría por `code`.
 * - `icon`: el nombre de un ícono de línea que la app ya dibuja, o `null` (ícono genérico).
 */
export type CategoriaDeHabito = {
  key: string;
  code: string;
  name: string;
  icon: string | null;
  order: number;
};

/** `GET /api/v1/habit-categories`. `formation` es la formación de las categorías (nula si la persona no pertenece a ninguna). */
export type CategoriasDeLaFormacion = {
  formation: string | null;
  categories: CategoriaDeHabito[];
};

/** Una categoría como la ve Administración (`GET /api/v1/admin/habit-categories`), con sus conteos y lo que se puede hacer hoy. */
export type CategoriaAdmin = {
  key: string;
  code: string;
  formation: string;
  name: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  activeHabits: number;
  totalHabits: number;
  canBeDeactivated: boolean;
  canBeDeleted: boolean;
};
