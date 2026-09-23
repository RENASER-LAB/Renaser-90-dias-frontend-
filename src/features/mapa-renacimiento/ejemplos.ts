import type { TipoResultadoNegocio, TipoResultadoSalud } from './tipos';

/**
 * Los ejemplos que guían cada campo de objetivo, **según lo que la persona eligió medir**.
 *
 * ── Por qué existe este archivo ──
 *
 * Los dos formularios traían un ejemplo fijo. En negocio decía `Ej. S/ 5,000` arriba y
 * `Ej. S/ 15,000` abajo, para cualquier tipo de resultado — así que quien elegía **deuda** leía un
 * ejemplo que le proponía terminar el Día 90 debiendo el triple. El dueño lo vio probando el Mapa:
 * *"puse deuda y sale 5k y luego 15k al día 90, entonces me endeudaré más"*. En salud pasaba lo
 * mismo al revés: `Ej. 78 → Ej. 68` está bien para peso, y es exactamente lo contrario de lo que
 * se busca en fuerza, resistencia, sueño o energía.
 *
 * Un ejemplo que contradice al objetivo no es un detalle de copy: es la única pista que tiene
 * alguien que no sabe qué escribir, y lo empuja a cargar un número al revés.
 *
 * ── Qué NO cambia ──
 *
 * **Nada del cálculo.** El backend clasifica por magnitud (`Magnitud.deSalud` / `deNegocio`) y la
 * dirección la deduce de los números cargados (`sube = meta > linea base`), no del tipo ni de
 * estos textos. Esto es guía visual: cambia lo que se sugiere, nunca lo que se guarda.
 */

/** Un par de ejemplos para los dos campos, ya formateados. `moneda: false` = no es plata. */
export interface EjemploDelTipo {
  base: string;
  meta: string;
  moneda: boolean;
}

/**
 * Salud. La dirección la manda el tipo: peso y medidas bajan; fuerza, resistencia, sueño y
 * energía suben. Condición clínica no lleva ejemplo numérico a propósito — el Mapa ya avisa ahí
 * (`UNSAFE_HEALTH`) y sugerir cifras sería justo lo que ese aviso pide no hacer.
 */
const SALUD: Record<TipoResultadoSalud, EjemploDelTipo> = {
  peso: { base: 'Ej. 84', meta: 'Ej. 78', moneda: false },
  medidas: { base: 'Ej. 96', meta: 'Ej. 88', moneda: false },
  energia: { base: 'Ej. 4', meta: 'Ej. 8', moneda: false },
  fuerza: { base: 'Ej. 40', meta: 'Ej. 60', moneda: false },
  resistencia: { base: 'Ej. 10', meta: 'Ej. 30', moneda: false },
  sueno: { base: 'Ej. 5', meta: 'Ej. 7.5', moneda: false },
  condicion_clinica: { base: 'Tu valor de hoy', meta: 'El que buscas', moneda: false },
  otro: { base: 'Tu punto de partida', meta: 'A dónde quieres llegar', moneda: false },
};

/**
 * Negocio. **`deuda` es el único que baja**, y es el que estaba mal. `clientes` y `ventas` se
 * cuentan, no se cobran: por eso no llevan moneda — un `Ej. S/ 12` para "clientes" confunde igual
 * que el de la deuda.
 */
const NEGOCIO: Record<TipoResultadoNegocio, EjemploDelTipo> = {
  facturacion: { base: 'Ej. 5,000', meta: 'Ej. 15,000', moneda: true },
  utilidad: { base: 'Ej. 1,200', meta: 'Ej. 4,000', moneda: true },
  ventas: { base: 'Ej. 8', meta: 'Ej. 25', moneda: false },
  clientes: { base: 'Ej. 12', meta: 'Ej. 40', moneda: false },
  ahorro: { base: 'Ej. 0', meta: 'Ej. 9,000', moneda: true },
  deuda: { base: 'Ej. 20,000', meta: 'Ej. 8,000', moneda: true },
  ingreso_personal: { base: 'Ej. 3,000', meta: 'Ej. 6,000', moneda: true },
  otro: { base: 'Tu punto de partida', meta: 'A dónde quieres llegar', moneda: false },
};

const SIN_TIPO: EjemploDelTipo = { base: 'Tu punto de partida', meta: 'A dónde quieres llegar', moneda: false };

/** Mientras no eligió tipo, se guía con palabras y no con un número que podría ser el opuesto. */
export function ejemploDeSalud(tipo: TipoResultadoSalud | null): EjemploDelTipo {
  return tipo ? SALUD[tipo] ?? SIN_TIPO : SIN_TIPO;
}

export function ejemploDeNegocio(tipo: TipoResultadoNegocio | null): EjemploDelTipo {
  return tipo ? NEGOCIO[tipo] ?? SIN_TIPO : SIN_TIPO;
}

/** Antepone la moneda solo cuando el resultado se mide en plata. */
export function conMoneda(ejemplo: string, moneda: string, llevaMoneda: boolean): string {
  if (!llevaMoneda || !ejemplo.startsWith('Ej. ')) return ejemplo;
  return `Ej. ${moneda} ${ejemplo.slice(4)}`;
}
