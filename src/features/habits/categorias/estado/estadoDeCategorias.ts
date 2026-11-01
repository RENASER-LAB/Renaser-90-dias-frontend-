import type { CategoriaDeHabito } from '../types/categorias.types';
import { CATEGORIAS_DE_RESPALDO, dimensionesDeCategorias, type DimensionDeCategoria } from '../utils/dimensionesDeCategorias';

/**
 * Las categorías de hábito vigentes de la sesión (spec 023): una sola lectura, que comparten Training, Hoy, los avisos y las alarmas.
 *
 * Es un almacén de módulo (como `semaforoVigente`) y no un contexto porque lo leen también funciones puras de otros módulos
 * —`dimensionDeCategoria`, `nombreDeLaDimension`, `iconoDeLineaDeHabito`— que no son componentes. Un componente se suscribe con
 * `useCategoriasDeHabito` y se vuelve a dibujar cuando cambia; las funciones puras leen el valor de ese instante.
 *
 * Mientras no se sabe (`listo = false`) y cuando el servidor no responde (backend anterior, sin red) valen las cuatro de la Escuela:
 * la Escuela se ve igual que siempre y nunca queda una pantalla sin dimensiones.
 */
export type EstadoDeCategorias = {
  /** `cuenta|formación` de la lectura vigente; `null` = nadie leyó todavía. */
  clave: string | null;
  /** Ya se sabe (con respuesta o sin ella): Training puede dibujar sin que las categorías cambien debajo. */
  listo: boolean;
  /** La formación de estas categorías según el servidor; `null` si no la dijo. */
  formacion: string | null;
  /** `false` = son las de respaldo (el servidor no respondió o no tiene el endpoint). */
  delServidor: boolean;
  categorias: readonly CategoriaDeHabito[];
  dimensiones: readonly DimensionDeCategoria[];
};

function estadoDe(parcial: Pick<EstadoDeCategorias, 'clave' | 'listo' | 'formacion' | 'delServidor'> & { categorias: readonly CategoriaDeHabito[] }): EstadoDeCategorias {
  return { ...parcial, dimensiones: dimensionesDeCategorias(parcial.categorias) };
}

const INICIAL: EstadoDeCategorias = estadoDe({ clave: null, listo: false, formacion: null, delServidor: false, categorias: CATEGORIAS_DE_RESPALDO });

/** Lo que vale mientras la lectura de esta cuenta y formación no empezó: las cuatro de la Escuela, sin estar listo. */
export const ESTADO_SIN_LECTURA: EstadoDeCategorias = INICIAL;

let actual: EstadoDeCategorias = INICIAL;
const oyentes = new Set<() => void>();

function avisar(): void {
  oyentes.forEach(oyente => oyente());
}

export function leerEstadoDeCategorias(): EstadoDeCategorias {
  return actual;
}

export function suscribirEstadoDeCategorias(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Empieza una lectura nueva: se parte de las cuatro de la Escuela y NO listo, sin dejar nada de la cuenta o la formación anterior. */
export function empezarLecturaDeCategorias(clave: string | null): void {
  actual = clave === null ? INICIAL : estadoDe({ clave, listo: false, formacion: null, delServidor: false, categorias: CATEGORIAS_DE_RESPALDO });
  avisar();
}

/**
 * La lectura terminó. Con `lectura` nula (404, sin red, no se entiende) valen las de respaldo. Con respuesta del servidor valen las suyas, salvo
 * que no traiga ninguna y tampoco una formación: es la persona que no pertenece a ninguna (Administración sin programa), a quien nada le
 * cambia, y se queda con las de respaldo.
 */
export function terminarLecturaDeCategorias(
  clave: string,
  lectura: { formation: string | null; categories: CategoriaDeHabito[] } | null,
): void {
  if (actual.clave !== clave) return;
  if (lectura === null || (lectura.formation === null && lectura.categories.length === 0)) {
    actual = estadoDe({ clave, listo: true, formacion: lectura?.formation ?? null, delServidor: false, categorias: CATEGORIAS_DE_RESPALDO });
  } else {
    actual = estadoDe({ clave, listo: true, formacion: lectura.formation, delServidor: true, categorias: lectura.categories });
  }
  avisar();
}

/** Para las pruebas y para cerrar sesión: vuelve a no saber nada. */
export function reiniciarEstadoDeCategorias(): void {
  actual = INICIAL;
  avisar();
}

// ── Lecturas puras: las que usan las funciones que no son componentes ───────────────────────────────────────────────────

export function dimensionesVigentes(): readonly DimensionDeCategoria[] {
  return actual.dimensiones;
}

export function categoriaDeCodigo(codigo: string): CategoriaDeHabito | null {
  return actual.categorias.find(c => c.code === codigo) ?? null;
}

export function dimensionDeCodigo(codigo: string): DimensionDeCategoria | null {
  return actual.dimensiones.find(d => d.codigo === codigo) ?? null;
}

export function dimensionPorClave(clave: string): DimensionDeCategoria | null {
  return actual.dimensiones.find(d => d.key === clave) ?? null;
}
