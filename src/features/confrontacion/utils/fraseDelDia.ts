/**
 * Qué frase de confrontación toca hoy.
 *
 * Decisión pura: recibe el día de programa y devuelve la frase. No sabe de pantallas, no llama a
 * ningún servicio y no guarda nada — así se puede razonar y probar sin montar la app.
 *
 * ## Se DERIVA del día; no se guarda ni se avanza
 *
 * La frase es `f(día)`, no un puntero que alguien incrementa cada noche. Es la misma regla que
 * `.claude/rules/02` §2 le impone a todo lo que depende del calendario, y existe por un bug real
 * (E-91): un contador que se incrementa **pierde para siempre** cualquier corrida que no ocurra —
 * una noche con el backend caído y la persona queda desfasada el resto del programa.
 *
 * Derivada, la función es idempotente gratis: abrir la app diez veces el mismo día muestra la
 * misma frase, y abrirla después de tres días sin entrar muestra la que toca hoy, no la que quedó
 * pendiente.
 *
 * ## El día viene del backend, no del reloj del teléfono
 *
 * Se recibe `diaPrograma` —el que `GET /api/v1/home` ya calcula en la zona horaria del
 * participante— y **no** se deriva de `new Date()`. Es deliberado: el padrón vive en
 * `America/Lima` y el teléfono puede estar en cualquier huso. Calcularlo acá volvería a abrir
 * exactamente el agujero de E-91.
 */
import { FRASES_DE_CONFRONTACION, type FraseConfrontacion } from '../data/frasesDeConfrontacion';

/**
 * La frase del día de programa indicado.
 *
 * Devuelve `null` cuando **todavía no hay día**: sin inscripción, o en el día 0 —cuenta aprobada
 * pero el reloj del programa sin arrancar—. Preferimos no mostrar nada antes que mostrar la frase
 * del día 1 a alguien que todavía no empezó: es el mismo criterio que ya usa `descripcionDeFase`
 * ante una fase desconocida.
 */
export function fraseDelDia(diaPrograma: number | null | undefined): FraseConfrontacion | null {
  if (typeof diaPrograma !== 'number' || !Number.isFinite(diaPrograma) || diaPrograma < 1) {
    return null;
  }
  const indice = Math.floor(diaPrograma - 1) % FRASES_DE_CONFRONTACION.length;
  return FRASES_DE_CONFRONTACION[indice];
}
